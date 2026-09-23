import { Room, type RoomOptions, AudioPresets } from 'livekit-client';

export const DEFAULT_LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://dost-talk-3b4tto0n.livekit.cloud';
export const DEFAULT_LIVEKIT_TOKEN = import.meta.env.VITE_LIVEKIT_TOKEN || '';
export const DEFAULT_TOKEN_ENDPOINT = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT || '';

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
        // Exponential backoff up to 5 attempts
        if (context.retryCount > 5) return null;
        return Math.min(1000 * Math.pow(1.5, context.retryCount), 6000);
      },
    },
  };

  return new Room(roomOptions);
}

/**
 * Fetch a participant token from a remote token service endpoint if provided
 */
export async function fetchTokenFromEndpoint(
  endpoint: string,
  roomId: string,
  participantName: string
): Promise<string> {
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
}
