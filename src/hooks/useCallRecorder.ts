import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordingResult } from '../types';
import {
  getBestSupportedAudioMimeType,
  generateRecordingFilename,
  triggerDownload,
} from '../lib/audioUtils';

interface UseCallRecorderOptions {
  roomId: string;
  onRecordingStateChanged?: (isRecording: boolean) => void;
}

export function useCallRecorder({
  roomId,
  onRecordingStateChanged,
}: UseCallRecorderOptions) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [latestRecording, setLatestRecording] = useState<RecordingResult | null>(null);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  // Web Audio Context & Pipeline nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Raw tracks stored to allow reconnecting to mixer
  const currentLocalTrackRef = useRef<MediaStreamTrack | null>(null);
  const currentRemoteTrackRef = useRef<MediaStreamTrack | null>(null);

  // MediaRecorder & Chunks
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const stopPromiseResolverRef = useRef<((result: RecordingResult | null) => void) | null>(null);

  // Keep state change callback updated
  const onRecordingStateChangedRef = useRef(onRecordingStateChanged);
  onRecordingStateChangedRef.current = onRecordingStateChanged;

  // Initialize or resume AudioContext
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioContextRef.current = ctx;
      mediaStreamDestinationRef.current = ctx.createMediaStreamDestination();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return {
      ctx: audioContextRef.current,
      destination: mediaStreamDestinationRef.current!,
    };
  }, []);

  // Connect or reconnect a track to the recording mixer destination
  const attachTrackToMixer = useCallback(
    (track: MediaStreamTrack | null, isLocal: boolean) => {
      if (isLocal) {
        currentLocalTrackRef.current = track;
      } else {
        currentRemoteTrackRef.current = track;
      }

      // If audio context destination doesn't exist yet, it will attach when recording starts
      if (!audioContextRef.current || !mediaStreamDestinationRef.current) {
        return;
      }

      const ctx = audioContextRef.current;
      const destination = mediaStreamDestinationRef.current;

      if (isLocal) {
        // Disconnect previous local node if any
        if (localSourceNodeRef.current) {
          try {
            localSourceNodeRef.current.disconnect();
          } catch {}
          localSourceNodeRef.current = null;
        }

        if (track && track.readyState === 'live') {
          try {
            const stream = new MediaStream([track]);
            const source = ctx.createMediaStreamSource(stream);
            // CRITICAL: Local microphone connects ONLY to destination (recording mixer),
            // NEVER to ctx.destination (speakers) to avoid hearing your own voice.
            source.connect(destination);
            localSourceNodeRef.current = source;
          } catch (err) {
            console.error('Failed to attach local track to audio mixer:', err);
          }
        }
      } else {
        // Disconnect previous remote node if any
        if (remoteSourceNodeRef.current) {
          try {
            remoteSourceNodeRef.current.disconnect();
          } catch {}
          remoteSourceNodeRef.current = null;
        }

        if (track && track.readyState === 'live') {
          try {
            const stream = new MediaStream([track]);
            const source = ctx.createMediaStreamSource(stream);
            // Remote track connects to recording mixer
            source.connect(destination);
            remoteSourceNodeRef.current = source;
          } catch (err) {
            console.error('Failed to attach remote track to audio mixer:', err);
          }
        }
      }
    },
    []
  );

  // Inform hook about track changes from LiveKit
  const updateLocalTrack = useCallback(
    (track: MediaStreamTrack | null) => {
      attachTrackToMixer(track, true);
    },
    [attachTrackToMixer]
  );

  const updateRemoteTrack = useCallback(
    (track: MediaStreamTrack | null) => {
      attachTrackToMixer(track, false);
    },
    [attachTrackToMixer]
  );

  // Clear recording duration timer
  const clearRecordingTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Start Recording
  const startRecording = useCallback(() => {
    try {
      setRecorderError(null);

      // 1. Ensure AudioContext & Destination
      const { destination } = getOrCreateAudioContext();

      // Ensure tracks are attached to the mixer
      if (currentLocalTrackRef.current) {
        attachTrackToMixer(currentLocalTrackRef.current, true);
      }
      if (currentRemoteTrackRef.current) {
        attachTrackToMixer(currentRemoteTrackRef.current, false);
      }

      // Check browser MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not supported in this browser.');
      }

      const { mimeType, extension } = getBestSupportedAudioMimeType();
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 128000, // 128 kbps high quality audio
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(destination.stream, recorderOptions);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setRecorderError('An error occurred while recording.');
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalMime });
        const url = URL.createObjectURL(blob);
        const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const filename = generateRecordingFilename(roomId, extension);

        const result: RecordingResult = {
          blob,
          url,
          durationSeconds: duration,
          filename,
          mimeType: finalMime,
          sizeBytes: blob.size,
          timestamp: new Date().toISOString(),
        };

        setLatestRecording(result);
        setIsRecording(false);
        onRecordingStateChangedRef.current?.(false);
        clearRecordingTimer();

        if (stopPromiseResolverRef.current) {
          stopPromiseResolverRef.current(result);
          stopPromiseResolverRef.current = null;
        }
      };

      // Start recording with 1000ms chunk timeslice for continuous streaming
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      onRecordingStateChangedRef.current?.(true);

      // Start interval timer
      clearRecordingTimer();
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setRecorderError(err.message || 'Could not start audio recording.');
      setIsRecording(false);
      onRecordingStateChangedRef.current?.(false);
    }
  }, [attachTrackToMixer, clearRecordingTimer, getOrCreateAudioContext, roomId]);

  // Stop Recording cleanly
  const stopRecording = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      clearRecordingTimer();

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        onRecordingStateChangedRef.current?.(false);
        resolve(latestRecording);
        return;
      }

      stopPromiseResolverRef.current = resolve;

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err);
        setIsRecording(false);
        onRecordingStateChangedRef.current?.(false);
        stopPromiseResolverRef.current = null;
        resolve(null);
      }
    });
  }, [clearRecordingTimer, latestRecording]);

  // Download the active recording
  const downloadLatestRecording = useCallback(() => {
    if (latestRecording) {
      triggerDownload(latestRecording.url, latestRecording.filename);
    }
  }, [latestRecording]);

  // Discard / Clear recording preview
  const clearRecording = useCallback(() => {
    if (latestRecording?.url) {
      URL.revokeObjectURL(latestRecording.url);
    }
    setLatestRecording(null);
    setRecorderError(null);
    setRecordingDuration(0);
  }, [latestRecording]);

  // Full cleanup of audio nodes
  const cleanup = useCallback(() => {
    clearRecordingTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

    if (localSourceNodeRef.current) {
      try {
        localSourceNodeRef.current.disconnect();
      } catch {}
      localSourceNodeRef.current = null;
    }

    if (remoteSourceNodeRef.current) {
      try {
        remoteSourceNodeRef.current.disconnect();
      } catch {}
      remoteSourceNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    currentLocalTrackRef.current = null;
    currentRemoteTrackRef.current = null;
    setIsRecording(false);
  }, [clearRecordingTimer]);

  // Browser leave warning if recording is currently active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = 'A call recording is currently in progress. Leaving will stop and discard unsaved audio.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    recordingDuration,
    latestRecording,
    recorderError,
    startRecording,
    stopRecording,
    downloadLatestRecording,
    clearRecording,
    updateLocalTrack,
    updateRemoteTrack,
    cleanup,
  };
}
