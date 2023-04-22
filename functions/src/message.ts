import type {GeoPoint} from 'firebase-admin/firestore';

export type UserInfo = {
  created_at: Date;
  display_name: string;
};

/**
 * メッセージの中身
 */
export type Message = {
  at: GeoPoint;
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
 * 受信したメッセージの内容を直列化可能にしたもの
 */
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
export type Audience = {
  at: GeoPoint;
  channel_a: number;
  channel_b: number;
  channel_c: number;
  expires_at: Date;
  audience: string;
  sensitivity: number;
};

export type AudienceWithId = Audience & { id: string };

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
export const base_sensitivity_factor = 4;

/**
 * attenuation関数において、チャンネル距離が1のときに0.8になるように設定
 */
export const channel_distance_attenuation_factor = 2;

/**
 * 減衰関数。とりあえず $\frac{1}{({\rm dist})^2 + 1}$ にしてみる
 * @param {number} dist なんらかの「距離」
 * @return {number} 減衰率。1.0が最大、0.0が最小
 */
export const attenuation = (dist: number) => {
  return 1 / (Math.pow(dist, 2) + 1);
};

/**
 * チャンネル間の距離を算出する
 * @param {[number, number, number]} a チャンネルA
 * @param {[number, number, number]} b チャンネルB
 * @return {number} 距離
 */
function channel_dist(
  a: [number, number, number],
  b: [number, number, number]
) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
      Math.pow(a[1] - b[1], 2) +
      Math.pow(a[2] - b[2], 2)
  );
}

/**
 * メッセージの受信確率を算出する
 * @param {Message} msg メッセージ
 * @param {[number, number, number]} channel チャンネルID
 * @param {number} sensitivity 受信感度
 * @param {number} distance 距離(m)
 * @return {number} 受信確率。1.0が最大、0.0が最小
 */
export function probability(
  msg: Message,
  channel: [number, number, number],
  sensitivity: number,
  distance: number
) {
  const c_dist = channel_dist(channel, [
    msg.channel_a,
    msg.channel_b,
    msg.channel_c,
  ]);

  const channel_attn = attenuation(
    c_dist / channel_distance_attenuation_factor
  );

  const physics = attenuation(
    distance / sensitivity / base_sensitivity_factor / km_per_meters
  );

  return channel_attn * physics;
}
