import type { CollectionReference, Unsubscribe } from "firebase/firestore";
import * as firestore from "firebase/firestore";
import { auth, firestoreApp } from "./firebase-client";
import { distance, fromGeoPoint, type LatLng } from "./geolocation";
import { geohashForLocation } from "geofire-common";

/**
 * 遅すぎるとしんどいので、とりあえず空気中の音速の10倍を設定
 */
export const SPEED_OF_SOUND = 3430;

/**
 * 1km = 1000m
 */
const km_per_meters = 1000;

/**
 * attenuation関数において、距離が2kmでsensitivityが1.0のときに0.8になるように設定
 */
const base_sensitivity_factor = 4;

/**
 * 減衰関数。とりあえず $\frac{1}{({\rm dist})^2 + 1}$ にしてみる
 * @param dist なんらかの「距離」
 * @returns 減衰率。1.0が最大、0.0が最小
 */
const attenuation = (dist: number) => {
  return 1 / (Math.pow(dist, 2) + 1);
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
};

/**
 * メッセージを送信するチャンネル
 */
export class Channel {
  constructor(
    public readonly channel_a: number,
    public readonly channel_b: number,
    public readonly channel_c: number
  ) {}

  static fromTuple(tuple: [number, number, number]) {
    return new Channel(...tuple);
  }

  static fromString(str: string) {
    let [a, b, c] = str.split(".").map((s) => parseInt(s));

    if (typeof a !== "number" || isNaN(a)) {
      a = 0;
    } else if (a < 0 || a > 255) {
      a = ((a % 256) + 256) % 256;
    }

    if (typeof b !== "number" || isNaN(b)) {
      b = 0;
    } else if (b < 0 || b > 255) {
      b = ((b % 256) + 256) % 256;
    }

    if (typeof c !== "number" || isNaN(c)) {
      c = 0;
    } else if (c < 0 || c > 255) {
      c = ((c % 256) + 256) % 256;
    }

    return new Channel(a, b, c);
  }

  toString() {
    return `${this.channel_a}.${this.channel_b}.${this.channel_c}`;
  }

  distance(other: Channel) {
    if (!(other instanceof Channel)) {
      throw new Error("must be a Channel instance");
    }

    return Math.sqrt(
      Math.pow(this.channel_a - other.channel_a, 2) +
        Math.pow(this.channel_b - other.channel_b, 2) +
        Math.pow(this.channel_c - other.channel_c, 2)
    );
  }
}

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

  async sendMessage(message: string, reply_to?: string, sent_at?: Date) {
    const uid = auth.currentUser?.uid;

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

  startListening() {
    if (typeof this.unsubscribe !== "undefined") {
      return;
    }

    this.unsubscribe = firestore.onSnapshot(this.messages, (snapshot) => {
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

        return m1.sent_at.valueOf() + m1delay - m2.sent_at.valueOf() - m2delay;
      });
    });
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
    const channel = attenuation(c_dist);

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
          const userRef = firestore.doc(firestoreApp, "users", msg.user_id);
          const user = (await firestore.getDoc(userRef)).data()! as UserInfo;

          yield {
            ...msg,
            user,
          };
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
}