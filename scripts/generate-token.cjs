/**
 * Offline CLI Token Generator for testing LiveKit rooms
 * 
 * Usage:
 *   node scripts/generate-token.cjs <roomName> <participantName>
 * 
 * Example:
 *   node scripts/generate-token.cjs call-101 Rahul
 *   node scripts/generate-token.cjs call-101 Amit
 */

const { AccessToken } = require('livekit-server-sdk');

const apiKey = process.env.LIVEKIT_API_KEY || 'APIgfDf6krFFzKK';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'bUHRtdSsNOGGOGQLvb7oLF48U00mc0ViQNazPlqqTTC';

const roomName = process.argv[2] || 'demo-room';
const participantName = process.argv[3] || 'User-' + Math.floor(Math.random() * 1000);

async function createToken() {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    name: participantName,
    ttl: '2h', // 2 hours validity
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  console.log('\n=========================================');
  console.log(`LiveKit Token for Room: [${roomName}], Participant: [${participantName}]`);
  console.log('=========================================');
  console.log(token);
  console.log('=========================================\n');
}

createToken().catch((err) => {
  console.error('Error creating token:', err);
  process.exit(1);
});
