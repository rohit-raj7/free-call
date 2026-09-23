import { Room, type RoomOptions, AudioPresets } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';

export const DEFAULT_LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://dost-talk-3b4tto0n.livekit.cloud';
export const DEFAULT_LIVEKIT_TOKEN = import.meta.env.VITE_LIVEKIT_TOKEN || '';
export const DEFAULT_TOKEN_ENDPOINT = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT || '';

/**
 * Format & normalize LiveKit URL to ensure valid WebSocket URL protocol (wss:// or ws://)
 */
export function formatLiveKitUrl(url?: string): string {
  const fallback = 'wss://dost-talk-3b4tto0n.livekit.cloud';
  let raw = (url || import.meta.env.VITE_LIVEKIT_URL || fallback).trim();

  if (!raw) return fallback;

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
 * Fallback token generation directly using LiveKit Server SDK
 */
export async function generateFallbackToken(
  roomId: string,
  participantName: string
): Promise<string> {
  const apiKey = import.meta.env.LIVEKIT_API_KEY || import.meta.env.VITE_LIVEKIT_API_KEY || 'APIgfDf6krFFzKK';
  const apiSecret = import.meta.env.LIVEKIT_API_SECRET || import.meta.env.VITE_LIVEKIT_API_SECRET || 'bUHRtdSsNOGGOGQLvb7oLF48U00mc0ViQNazPlqqTTC';

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    name: participantName,
    ttl: '4h',
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
 * Fetch a participant token from a remote token service endpoint if provided,
 * with fallback to client-side token generation if endpoint returns 404 or fails.
 */
export async function fetchTokenFromEndpoint(
  endpoint: string,
  roomId: string,
  participantName: string
): Promise<string> {
  try {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('room', roomId);
    url.searchParams.set('identity', participantName);
    url.searchParams.set('name', participantName);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Token endpoint 404. Generating fallback participant token.');
        return await generateFallbackToken(roomId, participantName);
      }
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Token service error (${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return data.token || data.jwt || data.accessToken || data;
    } else {
      return (await response.text()).trim();
    }
  } catch (err: any) {
    console.warn('Token endpoint fetch failed. Falling back to client-side token generation:', err);
    return await generateFallbackToken(roomId, participantName);
  }
}
