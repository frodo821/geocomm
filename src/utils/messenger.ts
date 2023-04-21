import type { CollectionReference, Unsubscribe } from "firebase/firestore";
import * as firestore from "firebase/firestore";
import { auth, firestoreApp } from "./firebase-client";
import { distance, fromGeoPoint, type LatLng } from "./geolocation";
import { Channel } from "./channel";
import { geohashForLocation } from "geofire-common";
export { Channel };

/**
 * 遅すぎるとしんどいので、とりあえず空気中の音速の10倍を設定
 */
export const SPEED_OF_SOUND = 3430;

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
  at: firestore.GeoPoint;
  user_id: string;
  channel_a: number;
  channel_b: number;
  channel_c: number;
  content: string;
  geohash: string;
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

/**
 * メッセージを受信するためのリスナーの設定
 */
export type ListenerProperty = {
  channel: Channel;
  at?: LatLng;
  sensitivity: number;
};

export class Messenger {
  private messages: CollectionReference<Message>;
  private unsubscribe?: Unsubscribe;
  private messageQueue: MessageWithId[];
  private listener: ListenerProperty;

  constructor(initial_channel: Channel, initial_location?: LatLng) {
    this.messages = firestore.collection(
      firestoreApp,
      "messages"
    ) as CollectionReference<Message>;
    this.messageQueue = [];
    this.listener = {
      channel: initial_channel,
      at: initial_location,
      sensitivity: 1,
    };
  }

  get isSignedIn() {
    return auth.currentUser !== null;
  }

  get uid() {
    return auth.currentUser?.uid ?? null;
  }

  get channel() {
    return this.listener.channel;
  }

  set channel(channel: Channel) {
    this.listener.channel = channel;
  }

  get location() {
    return this.listener.at;
  }

  set location(location: LatLng | undefined) {
    this.listener.at = location;
  }

  get sensitivity() {
    return this.listener.sensitivity;
  }

  set sensitivity(sensitivity: number) {
    this.listener.sensitivity = sensitivity;
  }

  async register() {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error("Please sign in first.");
    }

    const userRef = firestore.doc(firestoreApp, "users", uid);
    const doc = await firestore.getDoc(userRef);

    if (doc.exists()) {
      return;
    }

    const user: UserInfo = {
      created_at: new Date(),
      display_name: "anonymous user",
    };

    await firestore.setDoc(userRef, user);
  }

  async updateName(name: string) {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error("Please sign in first.");
    }

    const userRef = firestore.doc(firestoreApp, "users", uid);
    const doc = await firestore.getDoc(userRef);

    if (!doc.exists()) {
      await this.register();
    }

    await firestore.updateDoc(userRef, { display_name: name });
  }

  async sendMessage(message: string, reply_to?: string | null, sent_at?: Date) {
    const uid = this.uid;

    if (!uid) {
      throw new Error("Please sign in first.");
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
      throw new Error("Please sign in first.");
    }

    const mdoc = firestore.doc(this.messages, message_id);
    const doc = await firestore.getDoc(mdoc);

    if (!doc.exists()) {
      return;
    }

    const msg = doc.data() as Message;

    if (msg.user_id !== uid) {
      throw new Error("You can't delete other's messages.");
    }

    await firestore.deleteDoc(mdoc);
  }

  startListening() {
    if (typeof this.unsubscribe !== "undefined") {
      return;
    }

    this.unsubscribe = firestore.onSnapshot(
      firestore.query(
        this.messages,
        firestore.where(
          "sent_at",
          ">=",
          firestore.Timestamp.fromMillis(Date.now() - 3600000)
        )
      ),
      (snapshot) => {
        const messages = snapshot
          .docChanges()
          .filter((diff) => diff.type === "added")
          .map((diff) => ({
            ...diff.doc.data(),
            id: diff.doc.id,
          }));

        this.messageQueue.push(...messages);
        this.messageQueue.sort((m2, m1) => {
          if (typeof this.listener.at === "undefined") {
            return m2.sent_at.valueOf() - m1.sent_at.valueOf();
          }

          const m2delay = this.delay(m2);
          const m1delay = this.delay(m1);

          return (
            m1.sent_at.valueOf() + m1delay - m2.sent_at.valueOf() - m2delay
          );
        });
      }
    );
  }

  stopListening() {
    if (typeof this.unsubscribe === "undefined") {
      return;
    }

    this.unsubscribe();
    this.unsubscribe = undefined;
  }

  private delay(msg: Message) {
    return (
      distance(this.listener.at ?? fromGeoPoint(msg.at), fromGeoPoint(msg.at)) /
      SPEED_OF_SOUND
    );
  }

  messageAppearanceProbability(msg: Message) {
    const c_dist = this.listener.channel.distance(
      new Channel(msg.channel_a, msg.channel_b, msg.channel_c)
    );
    const channel = attenuation(c_dist / channel_distance_attenuation_factor);

    const dist = distance(
      this.listener.at ?? fromGeoPoint(msg.at),
      fromGeoPoint(msg.at)
    );
    const physics = attenuation(
      dist / this.listener.sensitivity / base_sensitivity_factor / km_per_meters
    );

    return channel * physics;
  }

  async *[Symbol.asyncIterator]() {
    while (typeof this.unsubscribe !== "undefined") {
      if (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;

        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Date.now() - this.delay(msg) - msg.sent_at.valueOf()
          )
        );

        if (
          Math.random() < this.messageAppearanceProbability(msg) ||
          msg.user_id === auth.currentUser?.uid
        ) {
          let replied_message: ReceivedMessage | null = null;

          if (msg.reply_to !== null) {
            const rdoc = await firestore.getDoc(
              firestore.doc(this.messages, msg.reply_to)
            );
            replied_message = rdoc.data() as ReceivedMessage;

            const ur = firestore.doc(firestoreApp, "users", msg.user_id);

            replied_message.user = (
              await firestore.getDoc(ur)
            ).data()! as UserInfo;

            replied_message.replied_message = null;
          }

          const userRef = firestore.doc(firestoreApp, "users", msg.user_id);
          const user = (await firestore.getDoc(userRef)).data()! as UserInfo;

          yield {
            ...msg,
            user,
            replied_message,
          };
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
}
