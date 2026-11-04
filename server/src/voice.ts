// Cấp token LiveKit: mỗi khu vực của mỗi kênh là 1 phòng voice ("c1-courtyard", "c1-hall").
// Token chỉ cho vào đúng phòng của khu vực người chơi đang đứng, chỉ được phát micro.
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import type { SceneId } from '@chua/shared';
import { config, voiceEnabled } from './config';

export const voiceRoom = (channel: number, scene: SceneId) => `c${channel}-${scene}`;

export async function voiceToken(p: { id: string; name: string; channel: number; scene: SceneId }) {
  if (!voiceEnabled()) return null;
  const room = voiceRoom(p.channel, p.scene);
  const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: p.id, // trùng id người chơi → client ghép được giọng nói với nhân vật
    name: p.name,
    ttl: '2h',
  });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canPublishSources: [TrackSource.MICROPHONE],
  });
  return { url: config.livekit.url, token: await at.toJwt(), room };
}
