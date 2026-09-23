import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const room = (req.query.room as string) || 'default-room';
    const identity = (req.query.identity as string) || (req.query.name as string) || `user-${Math.floor(Math.random() * 10000)}`;
    const name = (req.query.name as string) || identity;

    const apiKey = 'APIgfDf6krFFzKK';
    const apiSecret = 'bUHRtdSsNOGGOGQLvb7oLF48U00mc0ViQNazPlqqTTC';

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: '8h',
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    res.status(200).json({ token });
  } catch (err: any) {
    console.error('Vercel LiveKit Token error:', err);
    res.status(500).json({ error: err.message || 'Token generation failed' });
  }
}
