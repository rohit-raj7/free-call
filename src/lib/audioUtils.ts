/**
 * Audio Utilities for MediaRecorder and File Handling
 */

export interface SupportedAudioMime {
  mimeType: string;
  extension: string;
}

/**
 * Detect the best supported audio MIME type across different browsers (Chrome, Safari, Firefox, Edge, Android/iOS)
 */
export function getBestSupportedAudioMimeType(): SupportedAudioMime {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { mimeType: 'audio/webm', extension: 'webm' };
  }

  const preferredFormats: SupportedAudioMime[] = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'mp4' },
    { mimeType: 'audio/mp4', extension: 'mp4' },
    { mimeType: 'audio/aac', extension: 'aac' },
    { mimeType: 'audio/wav', extension: 'wav' },
  ];

  for (const format of preferredFormats) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      return format;
    }
  }

  // Fallback default
  return { mimeType: '', extension: 'webm' };
}

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Generate formatted timestamp string YYYY-MM-DD-HHmm
 */
export function getFormattedTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}-${hh}${mm}`;
}

/**
 * Generate standard recording filename: call-abc123-2026-09-23-1630.webm
 */
export function generateRecordingFilename(roomId: string, extension: string): string {
  const cleanRoomId = roomId.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'room';
  const timestamp = getFormattedTimestamp();
  return `call-${cleanRoomId}-${timestamp}.${extension}`;
}

/**
 * Format bytes into human readable format (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Trigger immediate local file download in the browser
 */
export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 150);
}
