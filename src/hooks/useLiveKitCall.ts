import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Participant,
  RemoteParticipant,
  Track,
  RemoteTrackPublication,
  RemoteTrack,
  ConnectionState,
  LocalTrackPublication,
} from 'livekit-client';
import type { CallState, ParticipantInfo, LiveKitDataMessage } from '../types';
import { createLiveKitRoom } from '../lib/livekit';

interface UseLiveKitCallOptions {
  onRemoteAudioTrackChanged?: (track: MediaStreamTrack | null) => void;
  onLocalAudioTrackChanged?: (track: MediaStreamTrack | null) => void;
}

export function useLiveKitCall({
  onRemoteAudioTrackChanged,
  onLocalAudioTrackChanged,
}: UseLiveKitCallOptions = {}) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState<boolean>(false);
  const [peerRecordingActive, setPeerRecordingActive] = useState<boolean>(false);

  const [localParticipantInfo, setLocalParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [remoteParticipantInfo, setRemoteParticipantInfo] = useState<ParticipantInfo | null>(null);

  const roomRef = useRef<Room | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const isTimerRunningRef = useRef<boolean>(false);
  const remoteAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Keep track callbacks updated in refs
  const onRemoteAudioTrackChangedRef = useRef(onRemoteAudioTrackChanged);
  onRemoteAudioTrackChangedRef.current = onRemoteAudioTrackChanged;
  const onLocalAudioTrackChangedRef = useRef(onLocalAudioTrackChanged);
  onLocalAudioTrackChangedRef.current = onLocalAudioTrackChanged;

  // Clear call duration timer
  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    isTimerRunningRef.current = false;
  }, []);

  // Start call timer (only if not already running)
  const startTimer = useCallback(() => {
    if (isTimerRunningRef.current) return;
    clearTimer();
    setCallDuration(0);
    isTimerRunningRef.current = true;
    timerIntervalRef.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  // Update participant state helper
  const updateParticipantStates = useCallback(
    (room: Room) => {
      // Local
      const local = room.localParticipant;
      if (local) {
        setLocalParticipantInfo({
          identity: local.identity,
          name: local.name || local.identity || 'You',
          isLocal: true,
          isMuted: local.isMicrophoneEnabled === false,
          isSpeaking: local.isSpeaking,
          audioLevel: local.audioLevel,
        });
      }

      // Remote (Find the first active remote participant for 2-person call)
      const remotes = Array.from(room.remoteParticipants.values());
      if (remotes.length > 0) {
        const primaryRemote = remotes[0];
        setRemoteParticipantInfo({
          identity: primaryRemote.identity,
          name: primaryRemote.name || primaryRemote.identity || 'Participant',
          isLocal: false,
          isMuted: primaryRemote.isMicrophoneEnabled === false,
          isSpeaking: primaryRemote.isSpeaking,
          audioLevel: primaryRemote.audioLevel,
        });
        setCallState('connected');

        // Production-level logic: Start call timer ONLY when remote participant is connected!
        if (!isTimerRunningRef.current) {
          startTimer();
        }
      } else {
        setRemoteParticipantInfo(null);
        if (room.state === ConnectionState.Connected) {
          setCallState('waiting');
        }
        // When waiting for another person (or if remote participant leaves), stop timer & reset call duration
        clearTimer();
        setCallDuration(0);
      }
    },
    [clearTimer, startTimer]
  );

  // Connect to LiveKit Room
  const connect = useCallback(
    async (liveKitUrl: string, token: string) => {
      try {
        setErrorMessage(null);
        setCallState('connecting');

        // Create fresh room instance
        const room = createLiveKitRoom();
        roomRef.current = room;

        // Initialize remote audio element for standard playback
        if (!remoteAudioElementRef.current) {
          const audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.id = 'livekit-remote-audio-player';
          document.body.appendChild(audioEl);
          remoteAudioElementRef.current = audioEl;
        }

        // Room event listeners
        room.on(RoomEvent.Connected, () => {
          updateParticipantStates(room);
          // Note: Timer is NOT started here! Starts dynamically in updateParticipantStates ONLY when 2nd participant connects.
        });

        room.on(RoomEvent.Disconnected, () => {
          setCallState('disconnected');
          clearTimer();
          setCallDuration(0);
          setPeerRecordingActive(false);
          onRemoteAudioTrackChangedRef.current?.(null);
          onLocalAudioTrackChangedRef.current?.(null);
        });

        room.on(RoomEvent.Reconnecting, () => {
          setCallState('reconnecting');
        });

        room.on(RoomEvent.Reconnected, () => {
          updateParticipantStates(room);
        });

        room.on(RoomEvent.ParticipantConnected, (_participant: RemoteParticipant) => {
          updateParticipantStates(room);
        });

        room.on(RoomEvent.ParticipantDisconnected, (_participant: RemoteParticipant) => {
          updateParticipantStates(room);
          onRemoteAudioTrackChangedRef.current?.(null);
        });

        // Remote track subscribed
        room.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, _publication: RemoteTrackPublication, _participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
              if (remoteAudioElementRef.current) {
                track.attach(remoteAudioElementRef.current);
              }
              if (track.mediaStreamTrack) {
                onRemoteAudioTrackChangedRef.current?.(track.mediaStreamTrack);
              }
            }
            updateParticipantStates(room);
          }
        );

        // Remote track unsubscribed
        room.on(
          RoomEvent.TrackUnsubscribed,
          (track: RemoteTrack, _publication: RemoteTrackPublication, _participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
              track.detach();
              onRemoteAudioTrackChangedRef.current?.(null);
            }
            updateParticipantStates(room);
          }
        );

        // Local track published
        room.on(RoomEvent.LocalTrackPublished, (pub: LocalTrackPublication) => {
          if (pub.kind === Track.Kind.Audio && pub.track && pub.track.mediaStreamTrack) {
            onLocalAudioTrackChangedRef.current?.(pub.track.mediaStreamTrack);
          }
          updateParticipantStates(room);
        });

        // Track mute / unmute events
        room.on(RoomEvent.TrackMuted, (_pub, _participant) => {
          updateParticipantStates(room);
        });

        room.on(RoomEvent.TrackUnmuted, (_pub, _participant) => {
          updateParticipantStates(room);
        });

        // Active speakers changed
        room.on(RoomEvent.ActiveSpeakersChanged, (_speakers: Participant[]) => {
          updateParticipantStates(room);
        });

        // Audio playback status (browser autoplay restrictions)
        room.on(RoomEvent.AudioPlaybackStatusChanged, (playable: boolean) => {
          setAudioPlaybackBlocked(!playable);
        });

        // Data received from remote participant (e.g. recording indicator)
        room.on(RoomEvent.DataReceived, (payload: Uint8Array, _participant?: RemoteParticipant) => {
          try {
            const decoder = new TextDecoder();
            const message: LiveKitDataMessage = JSON.parse(decoder.decode(payload));
            if (message.type === 'RECORDING_STATUS') {
              setPeerRecordingActive(Boolean(message.isRecording));
            }
          } catch {
            // Ignore malformed data
          }
        });

        // Connect room over WebSocket
        await room.connect(liveKitUrl, token, {
          autoSubscribe: true,
        });

        // Request and publish local microphone
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          if (micPub && micPub.track && micPub.track.mediaStreamTrack) {
            onLocalAudioTrackChangedRef.current?.(micPub.track.mediaStreamTrack);
          }
          setIsMuted(false);
        } catch (micErr: any) {
          console.error('Microphone enable error:', micErr);
          let userMsg = 'Microphone permission is required to join the call.';
          if (micErr.name === 'NotFoundError' || micErr.message?.includes('not found')) {
            userMsg = 'No microphone device found on your device.';
          } else if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
            userMsg = 'Microphone access was denied. Please allow microphone permission in your browser.';
          }
          throw new Error(userMsg);
        }

        // Check initial audio playback status
        if (!room.canPlaybackAudio) {
          setAudioPlaybackBlocked(true);
        }

        updateParticipantStates(room);
      } catch (err: any) {
        console.error('LiveKit connection failure:', err);
        setCallState('error');
        setErrorMessage(err.message || 'Failed to connect to LiveKit server.');
        if (roomRef.current) {
          await roomRef.current.disconnect().catch(() => {});
          roomRef.current = null;
        }
      }
    },
    [clearTimer, startTimer, updateParticipantStates]
  );

  // Toggle Mute / Unmute
  const toggleMute = useCallback(async () => {
    if (!roomRef.current || !roomRef.current.localParticipant) return;
    try {
      const currentlyMuted = !roomRef.current.localParticipant.isMicrophoneEnabled;
      const nextMutedState = !currentlyMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMutedState);
      setIsMuted(nextMutedState);

      setLocalParticipantInfo((prev) =>
        prev
          ? {
              ...prev,
              isMuted: nextMutedState,
            }
          : null
      );
    } catch (err: any) {
      console.error('Failed to toggle microphone state:', err);
    }
  }, []);

  // Broadcast Recording Status over Data Channel to Peer
  const broadcastRecordingStatus = useCallback(
    async (isRecording: boolean) => {
      if (!roomRef.current || !roomRef.current.localParticipant) return;
      try {
        const message: LiveKitDataMessage = {
          type: 'RECORDING_STATUS',
          isRecording,
          senderName: roomRef.current.localParticipant.name,
        };
        const encoder = new TextEncoder();
        const payload = encoder.encode(JSON.stringify(message));
        await roomRef.current.localParticipant.publishData(payload, { reliable: true });
      } catch {
        // Safe fallback if data channel is not permitted by token
      }
    },
    []
  );

  // Resume browser audio if blocked by autoplay policy
  const resumeAudio = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.startAudio();
      setAudioPlaybackBlocked(!roomRef.current.canPlaybackAudio);
    }
  }, []);

  // Disconnect & Cleanup
  const disconnect = useCallback(async () => {
    clearTimer();
    setCallDuration(0);
    setPeerRecordingActive(false);

    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch {
        // Disconnect error ignore
      }
      roomRef.current = null;
    }

    if (remoteAudioElementRef.current) {
      remoteAudioElementRef.current.srcObject = null;
      remoteAudioElementRef.current.remove();
      remoteAudioElementRef.current = null;
    }

    onRemoteAudioTrackChangedRef.current?.(null);
    onLocalAudioTrackChangedRef.current?.(null);

    setLocalParticipantInfo(null);
    setRemoteParticipantInfo(null);
    setCallState('idle');
  }, [clearTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (roomRef.current) {
        roomRef.current.disconnect().catch(() => {});
      }
      if (remoteAudioElementRef.current) {
        remoteAudioElementRef.current.remove();
        remoteAudioElementRef.current = null;
      }
    };
  }, [clearTimer]);

  return {
    callState,
    errorMessage,
    callDuration,
    isMuted,
    audioPlaybackBlocked,
    peerRecordingActive,
    localParticipantInfo,
    remoteParticipantInfo,
    connect,
    disconnect,
    toggleMute,
    resumeAudio,
    broadcastRecordingStatus,
  };
}
