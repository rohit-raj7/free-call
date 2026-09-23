export type CallState = 
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface ParticipantInfo {
  identity: string;
  name: string;
  isLocal: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel?: number;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  timestamp: string;
}

export interface JoinConfig {
  name: string;
  roomId: string;
  token?: string;
  liveKitUrl?: string;
}

export interface LiveKitDataMessage {
  type: 'RECORDING_STATUS' | 'PING';
  isRecording?: boolean;
  senderName?: string;
}
