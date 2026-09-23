import { Room, type RoomOptions, AudioPresets } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';

// Direct Hardcoded LiveKit Credentials (Production & Standalone Vercel Ready)
export const LIVEKIT_URL = 'wss://dost-talk-3b4tto0n.livekit.cloud';
export const LIVEKIT_API_KEY = 'APIgfDf6krFFzKK';
export const LIVEKIT_API_SECRET = 'bUHRtdSsNOGGOGQLvb7oLF48U00mc0ViQNazPlqqTTC';

export const DEFAULT_LIVEKIT_URL = LIVEKIT_URL;
export const DEFAULT_LIVEKIT_TOKEN = '';
export const DEFAULT_TOKEN_ENDPOINT = '';

/**
 * Format & normalize LiveKit URL to ensure valid WebSocket URL protocol (wss:// or ws://)
 */
export function formatLiveKitUrl(url?: string): string {
  let raw = (url || LIVEKIT_URL).trim();

  if (!raw) return LIVEKIT_URL;

  // Clean trailing slashes, quotes, or accidental whitespace
  raw = raw.replace(/^["']|["']$/g, '').replace(/\/+$/, '');

  // Convert http/https to ws/wss
  if (raw.startsWith('http://')) {
    raw = raw.replace('http://', 'ws://');
  } else if (raw.startsWith('https://')) {
    raw = raw.replace('https://', 'wss://');
  } else if (!/^wss?:\/\//i.test(raw)) {
    raw = `wss://${raw}`;
  }

  return raw;
}

/**
 * Optimized LiveKit Room configuration for ultra-low-latency 2-person audio calling
 */
export function createLiveKitRoom(): Room {
  const roomOptions: RoomOptions = {
    adaptiveStream: false, // Audio-only, adaptive video stream not needed
    dynacast: false,
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
    publishDefaults: {
      audioPreset: AudioPresets.speech, // High quality voice preset (opus 32kbps mono)
      dtx: true,
      red: true,
    },
    reconnectPolicy: {
      nextRetryDelayInMs: (context) => {
        if (context.retryCount > 5) return null;
        return Math.min(1000 * Math.pow(1.5, context.retryCount), 6000);
      },
    },
  };

  return new Room(roomOptions);
}

/**
 * Direct Client-Side Token Generation
 * Generates an Access Token instantly without requiring external HTTP /api/token server endpoints.
 */
export async function generateLiveKitToken(
  roomId: string,
  participantName: string
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
    name: participantName,
    ttl: '8h',
  });

  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Helper to fetch or generate token for a participant directly
 */
export async function fetchTokenFromEndpoint(
  _endpoint: string,
  roomId: string,
  participantName: string
): Promise<string> {
  return await generateLiveKitToken(roomId, participantName);
}
