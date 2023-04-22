import * as functions from 'firebase-functions';
import {initializeApp} from 'firebase-admin/app';
import * as messaging from 'firebase-admin/messaging';
import * as firestore from 'firebase-admin/firestore';
import {
  AudienceWithId,
  Message,
  SerializableReceivedMessage,
  UserInfo,
  probability,
} from './message';
import {distance, fromGeoPoint} from './geolocation';

const app = initializeApp();
const fs = firestore.getFirestore(app);
const fcm = messaging.getMessaging(app);

export const messageHook = functions
  .region('asia-northeast1')
  .firestore.document('/messages/{messageId}')
  .onCreate(async (snap) => {
    const msg = snap.data() as Message;
    const now = new Date();
    let replied_msg: SerializableReceivedMessage | null = null;

    if (msg.reply_to !== null) {
      const rmsg = await fs.doc(`/messages/${msg.reply_to}`).get();
      if (rmsg.exists) {
        const rmsg_data = rmsg.data() as Message;
        const rmsg_user = await fs.doc(`/users/${rmsg_data.user_id}`).get();
        const rmsg_udata = rmsg_user.data() as UserInfo;

        replied_msg = {
          channel_a: rmsg_data.channel_a,
          channel_b: rmsg_data.channel_b,
          channel_c: rmsg_data.channel_c,
          dist: -1,
          content: rmsg_data.content,
          embeddings: rmsg_data.embeddings,
          id: rmsg.id,
          reply_to: rmsg_data.reply_to,
          sent_at: rmsg_data.sent_at.valueOf(),
          user_id: rmsg_data.user_id,
          replied_message: null,
          user: {
            created_at: rmsg_user.exists ? rmsg_udata.created_at.valueOf() : 0,
            display_name: rmsg_user.exists ?
              rmsg_udata.display_name :
              'unknown user',
          },
        };
      }
    }

    const udoc = await fs.doc(`/users/${msg.user_id}`).get();
    const user = udoc.data() as UserInfo;

    const ser: SerializableReceivedMessage = {
      id: snap.id,
      channel_a: msg.channel_a,
      channel_b: msg.channel_b,
      channel_c: msg.channel_c,
      dist: -1,
      content: msg.content,
      embeddings: msg.embeddings,
      reply_to: msg.reply_to,
      sent_at: msg.sent_at.valueOf(),
      user_id: msg.user_id,
      replied_message: replied_msg,
      user: {
        created_at: user.created_at.valueOf(),
        display_name: user.display_name,
      },
    };

    const locs = (
      await fs.collection('/locations').where('expires_at', '>=', now).get()
    ).docs.map((it) => ({id: it.id, ...it.data()} as AudienceWithId));

    console.log(`sending to ${locs.length} audiences.`);

    const distances = Object.fromEntries(
      locs.map((it) => {
        const dist = distance(fromGeoPoint(it.at), fromGeoPoint(msg.at));
        console.log(`distance to user ${it.id}: ${dist}`);
        return [it.id, dist];
      })
    );

    const resp = await fcm.sendEach(
      locs
        .filter((it) => {
          if (it.id === msg.user_id) {
            console.log(
              `sending to ${it.id}, because the message was sent by the user.`
            );
            return true;
          }

          const p = probability(
            msg,
            [it.channel_a, it.channel_b, it.channel_c],
            it.sensitivity,
            distances[it.id]
          );

          console.log(`user ${it.id} receiving the message by ${p * 100}%`);
          return Math.random() < p;
        })
        .map((it) => {
          return {
            token: it.audience,
            data: {
              message: JSON.stringify({...ser, dist: distances[it.id]}),
            },
          };
        })
    );

    console.log(
      JSON.stringify(
        resp.responses.map((it) =>
          it.success ? 'succeeded' : it.error?.toJSON()
        )
      )
    );
    console.log(
      'all notifications sent.' +
        `${resp.successCount} succeeded` +
        `and ${resp.failureCount} failed.`
    );
  });
