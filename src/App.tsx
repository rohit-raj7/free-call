import { useState, useCallback } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { CallScreen } from './components/CallScreen';
import { useLiveKitCall } from './hooks/useLiveKitCall';
import { useCallRecorder } from './hooks/useCallRecorder';

export function App() {
  const [currentRoomId, setCurrentRoomId] = useState<string>('call-101');

  // Call Recorder Hook (Dual-Voice Web Audio API Mixer)
  const {
    isRecording,
    recordingDuration,
    latestRecording,
    startRecording,
    stopRecording,
    downloadLatestRecording,
    clearRecording,
    updateLocalTrack,
    updateRemoteTrack,
    cleanup: cleanupRecorder,
  } = useCallRecorder({
    roomId: currentRoomId,
    onRecordingStateChanged: (recordingActive) => {
      // Broadcast recording status to other participant via LiveKit data channel
      broadcastRecordingStatus(recordingActive);
    },
  });

  // LiveKit WebRTC Audio Calling Hook
  const {
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
  } = useLiveKitCall({
    onLocalAudioTrackChanged: updateLocalTrack,
    onRemoteAudioTrackChanged: updateRemoteTrack,
  });

  // Handle Joining Call
  const handleJoin = useCallback(
    async (config: { liveKitUrl: string; token: string; roomId: string; name: string }) => {
      setCurrentRoomId(config.roomId);
      clearRecording();
      await connect(config.liveKitUrl, config.token);
    },
    [clearRecording, connect]
  );

  // Handle Ending Call cleanly (Finalizes active recording first)
  const handleEndCall = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      broadcastRecordingStatus(false);
    }
    await disconnect();
    cleanupRecorder();
  }, [broadcastRecordingStatus, cleanupRecorder, disconnect, isRecording, stopRecording]);

  // If in idle/connecting state or connection error before joining, show JoinScreen
  const isJoinedInCall = localParticipantInfo !== null && callState !== 'idle' && callState !== 'error';

  if (!isJoinedInCall) {
    return (
      <JoinScreen
        onJoin={handleJoin}
        isConnecting={callState === 'connecting'}
        initialError={errorMessage}
      />
    );
  }

  // Active in Call screen
  return (
    <CallScreen
      roomId={currentRoomId}
      callState={callState}
      callDuration={callDuration}
      isMuted={isMuted}
      isRecording={isRecording}
      recordingDuration={recordingDuration}
      latestRecording={latestRecording}
      audioPlaybackBlocked={audioPlaybackBlocked}
      peerRecordingActive={peerRecordingActive}
      localParticipant={localParticipantInfo}
      remoteParticipant={remoteParticipantInfo}
      onToggleMute={toggleMute}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onDownloadRecording={downloadLatestRecording}
      onClearRecording={clearRecording}
      onEndCall={handleEndCall}
      onResumeAudio={resumeAudio}
    />
  );
}

export default App;
