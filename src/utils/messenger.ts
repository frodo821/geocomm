import type { CollectionReference, Unsubscribe } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';
import {
  auth,
  firestoreApp,
  getMessagingToken,
  messaging,
} from './firebase-client';
import { distance, fromGeoPoint, type LatLng } from './geolocation';
import { Channel } from './channel';
import { geohashForLocation } from 'geofire-common';
import { onMessage } from 'firebase/messaging';
export { Channel };

/**
 * 遅すぎるとしんどいので、とりあえず空気中の音速の10倍を設定
 */
export const speed_of_sound = 3430;

/**
 * 1km = 1000m
 */
export const km_per_meters = 1000;

/**
 * attenuation関数において、距離が2kmでsensitivityが1.0のときに0.8になるように設定
 */
const base_sensitivity_factor = 4;

/**
 * attenuation関数において、チャンネル距離が1のときに0.8になるように設定
 */
const channel_distance_attenuation_factor = 2;

/**
 * 減衰関数。とりあえず $\frac{1}{({\rm dist})^2 + 1}$ にしてみる
 * @param dist なんらかの「距離」
 * @returns 減衰率。1.0が最大、0.0が最小
 */
export const attenuation = (dist: number) => {
  return 1 / (Math.pow(dist, 2) + 1);
};

/**
 * メッセージの減衰率から距離を計算する関数
 */
export const invAttenuation = (attenuation: number) => {
  // a\sqrt{\frac{100}{k}-1}
  return Math.sqrt(1 / attenuation - 1);
};

export type UserInfo = {
  created_at: Date;
  display_name: string;
};

/**
 * メッセージの中身
 */
export type Message = {
  at?: firestore.GeoPoint;
  dist?: number;
  user_id: string;
  channel_a: number;
  channel_b: number;
  channel_c: number;
  content: string;
  geohash?: string;
  reply_to: string | null;
  sent_at: Date;
  embeddings: { [key: string]: string }[];
};

/**
 * メッセージの中身にidを追加したもの
 */
export type MessageWithId = Message & { id: string };

/**
 * 受信したメッセージの内容
 */
export type ReceivedMessage = MessageWithId & {
  user: UserInfo;
  replied_message: ReceivedMessage | null;
};

export type SerializableReceivedMessage = {
  id: string;
  at?: { latitude: number; longitude: number };
  dist: number;
  user_id: string;
  channel_a: number;
  channel_b: number;
  channel_c: number;
  content: string;
  geohash?: string;
  reply_to: string | null;
  sent_at: number;
  embeddings: { [key: string]: string }[];
  user: {
    created_at: number;
    display_name: string;
  };
  replied_message: SerializableReceivedMessage | null;
};

/**
 * メッセージを受信するためのリスナーの設定
 */
export type ListenerProperty = {
  channel: Channel;
  at?: LatLng;
  sensitivity: number;
};

const location_update_interval = 600_000;

function toReceivedMessage(msg: SerializableReceivedMessage): ReceivedMessage {
  const { replied_message, sent_at, user, at, ...rest } = msg;

  return {
    ...rest,
    sent_at: new Date(sent_at),
    at:
      at !== undefined
        ? new firestore.GeoPoint(at.latitude, at.longitude)
        : undefined,
    user: {
      ...user,
      created_at: new Date(user.created_at),
    },
    replied_message:
      replied_message !== null ? toReceivedMessage(replied_message) : null,
  };
}

function deserializeMessage(msg: string): ReceivedMessage {
  return toReceivedMessage(JSON.parse(msg));
}

export class Messenger {
  private messages: CollectionReference<Message>;
  private unsubscribe?: Unsubscribe;
  private messageQueue: ReceivedMessage[];
  private listener: ListenerProperty;
  private audienceUpdater?: ReturnType<typeof setTimeout>;

  constructor(initial_channel: Channel, initial_location?: LatLng) {
    this.messages = firestore.collection(
      firestoreApp,
      'messages'
    ) as CollectionReference<Message>;
    this.messageQueue = [];
    this.listener = {
      channel: initial_channel,
      at: initial_location,
      sensitivity: 1,
    };
    this.audienceUpdater = undefined;
  }

  get isSignedIn() {
    if (auth.currentUser === null) {
      return false;
    }

    return !auth.currentUser?.isAnonymous;
  }

  get uid() {
    return auth.currentUser?.uid ?? null;
  }

  get channel() {
    return this.listener.channel;
  }

  set channel(channel: Channel) {
    this.listener.channel = channel;
    this.updateAudience();
  }

  get location() {
    return this.listener.at;
  }

  set location(location: LatLng | undefined) {
    this.listener.at = location;
    this.updateAudience();
  }

  get sensitivity() {
    return this.listener.sensitivity;
  }

  set sensitivity(sensitivity: number) {
    this.listener.sensitivity = sensitivity;
    this.updateAudience();
  }

  async register() {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error('Please sign in first.');
    }

    const userRef = firestore.doc(firestoreApp, 'users', uid);
    const doc = await firestore.getDoc(userRef);

    if (doc.exists()) {
      return;
    }

    const user: UserInfo = {
      created_at: new Date(),
      display_name: 'anonymous user',
    };

    await firestore.setDoc(userRef, user);
  }

  async updateName(name: string) {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error('Please sign in first.');
    }

    const userRef = firestore.doc(firestoreApp, 'users', uid);
    const doc = await firestore.getDoc(userRef);

    if (!doc.exists()) {
      await this.register();
    }

    await firestore.updateDoc(userRef, { display_name: name });
  }

  private updateAudience = async () => {
    if (typeof this.location !== 'undefined') {
      clearTimeout(this.audienceUpdater);
    }

    this.audienceUpdater = setTimeout(
      this.updateAudience,
      location_update_interval
    );

    const location = this.location;
    const userId = this.uid;

    if (typeof location === 'undefined' || userId === null) {
      return;
    }

    const docRef = firestore.doc(firestoreApp, `/locations/${userId}`);

    await firestore.setDoc(docRef, {
      at: new firestore.GeoPoint(location.latitude, location.longitude),
      channel_a: this.channel.channel_a,
      channel_b: this.channel.channel_b,
      channel_c: this.channel.channel_c,
      expires_at: new Date(Date.now() + location_update_interval * 2),
      audience: getMessagingToken(),
      sensitivity: this.sensitivity,
    });
  };

  async sendMessage(message: string, reply_to?: string | null, sent_at?: Date) {
    const uid = this.uid;

    if (!uid || !this.isSignedIn) {
      throw new Error('Please sign in first.');
    }

    if (!this.location) {
      throw new Error("You can't send messages without location service.");
    }

    const pos = this.location;
    const channel = this.channel;

    const msg: Message = {
      at: new firestore.GeoPoint(pos.latitude, pos.longitude),
      user_id: uid,
      channel_a: channel.channel_a,
      channel_b: channel.channel_b,
      channel_c: channel.channel_c,
      content: message,
      geohash: geohashForLocation([pos.latitude, pos.longitude]),
      reply_to: reply_to ?? null,
      sent_at: sent_at ?? new Date(),
      embeddings: [],
    };

    const mdoc = await firestore.addDoc(this.messages, msg);
    return mdoc.id;
  }

  async deleteMessage(message_id: string) {
    const uid = this.uid;

    if (!uid) {
      throw new Error('Please sign in first.');
    }

    const mdoc = firestore.doc(this.messages, message_id);
    try {
      await firestore.deleteDoc(mdoc);
    } catch {
      throw new Error("You can't delete other's messages.");
    }
  }

  startListening() {
    if (typeof this.unsubscribe !== 'undefined') {
      return;
    }

    this.updateAudience();
    this.unsubscribe = onMessage(messaging, (msg) => {
      if (typeof msg.data === 'undefined') {
        return;
      }

      if (!('message' in msg.data)) {
        return;
      }

      const message = deserializeMessage(msg.data.message);
      this.messageQueue.push(message);
      this.messageQueue.sort((a, b) => {
        const ad = this.delay(a);
        const bd = this.delay(b);

        return b.sent_at.valueOf() + bd - a.sent_at.valueOf() - ad;
      });
    });
  }

  stopListening() {
    if (typeof this.unsubscribe === 'undefined') {
      return;
    }

    this.unsubscribe();
    this.unsubscribe = undefined;

    clearTimeout(this.audienceUpdater);
    this.audienceUpdater = undefined;
  }

  private delay(msg: Message) {
    if (typeof msg.at === 'undefined') {
      return (msg.dist ?? 0) / speed_of_sound;
    }

    return (
      distance(this.listener.at ?? fromGeoPoint(msg.at), fromGeoPoint(msg.at)) /
      speed_of_sound
    );
  }

  async *[Symbol.asyncIterator]() {
    while (typeof this.unsubscribe !== 'undefined') {
      if (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;

        await new Promise((resolve) =>
          setTimeout(resolve, this.delay(msg) + msg.sent_at.valueOf())
        );

        yield msg;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
}
