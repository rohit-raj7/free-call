import React from 'react';
import type { CallState, ParticipantInfo, RecordingResult } from '../types';
import { formatDuration } from '../lib/audioUtils';
import { StatusBadge } from './StatusBadge';
import { AudioPlayerPreview } from './AudioPlayerPreview';
import {
  Mic,
  MicOff,
  Square,
  Circle,
  PhoneOff,
  ArrowUpDown,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface CallScreenProps {
  roomId: string;
  callState: CallState;
  callDuration: number;
  isMuted: boolean;
  isRecording: boolean;
  recordingDuration: number;
  latestRecording: RecordingResult | null;
  audioPlaybackBlocked: boolean;
  peerRecordingActive: boolean;
  localParticipant: ParticipantInfo | null;
  remoteParticipant: ParticipantInfo | null;
  onToggleMute: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  onClearRecording: () => void;
  onEndCall: () => void;
  onResumeAudio: () => void;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  roomId,
  callState,
  callDuration,
  isMuted,
  isRecording,
  recordingDuration,
  latestRecording,
  audioPlaybackBlocked,
  peerRecordingActive,
  localParticipant,
  remoteParticipant,
  onToggleMute,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  onClearRecording,
  onEndCall,
  onResumeAudio,
}) => {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const localName = localParticipant?.name || 'You';
  const remoteName = remoteParticipant?.name || 'Waiting for another person...';
  const isRemoteJoined = Boolean(remoteParticipant);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-100/70 text-slate-800 antialiased font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-6 sm:p-8 flex flex-col items-center justify-between min-h-[520px] transition-all relative overflow-hidden">
        {/* Top bar: Room & Status */}
        <div className="w-full flex flex-col items-center gap-2 mb-2">
          <div className="text-[11px] font-mono text-slate-400 font-medium">
            Room: <span className="text-slate-700 font-semibold">{roomId}</span>
          </div>

          <StatusBadge callState={callState} isPeerRecording={peerRecordingActive} />
        </div>

        {/* Autoplay blocked banner */}
        {audioPlaybackBlocked && (
          <button
            onClick={onResumeAudio}
            className="w-full my-2 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-all animate-pulse flex items-center justify-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>Tap to enable audio playback</span>
          </button>
        )}

        {/* Center: Participants representation */}
        <div className="w-full flex flex-col items-center justify-center my-auto py-4">
          {/* Person A (Local Participant) */}
          <div className="flex flex-col items-center gap-1.5 transition-all">
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold shadow-md transition-all duration-300 ${
                  localParticipant?.isSpeaking
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 scale-105'
                    : 'bg-indigo-50 text-indigo-700 border-2 border-indigo-100'
                }`}
              >
                {getInitials(localName)}
              </div>

              {/* Mute badge */}
              {isMuted && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
                  <MicOff className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold text-slate-800 flex items-center justify-center gap-1">
                <span>{localName}</span>
                <span className="text-[10px] text-slate-400 font-normal">(You)</span>
              </div>
            </div>
          </div>

          {/* Connected Two-Way Indicator */}
          <div className="my-2.5 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Person B (Remote Participant) */}
          <div className="flex flex-col items-center gap-1.5 transition-all">
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold shadow-md transition-all duration-300 ${
                  !isRemoteJoined
                    ? 'bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300'
                    : remoteParticipant?.isSpeaking
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 scale-105'
                    : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-100'
                }`}
              >
                {isRemoteJoined ? getInitials(remoteName) : '?'}
              </div>

              {/* Remote Mute status */}
              {isRemoteJoined && remoteParticipant?.isMuted && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
                  <VolumeX className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="text-center">
              <div
                className={`text-sm font-semibold ${
                  isRemoteJoined ? 'text-slate-800' : 'text-slate-400 italic text-xs'
                }`}
              >
                {remoteName}
              </div>
            </div>
          </div>

          {/* Call Timer Display */}
          <div className="mt-6 flex flex-col items-center">
            <div className="text-2xl font-mono font-semibold tracking-wider text-slate-700">
              {formatDuration(callDuration)}
            </div>

            {/* Active Recording status banner */}
            {isRecording && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>🔴 Recording {formatDuration(recordingDuration)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Embedded Recording Preview (if completed) */}
        {latestRecording && (
          <div className="w-full mb-4">
            <AudioPlayerPreview
              recording={latestRecording}
              onDownload={onDownloadRecording}
              onClose={onClearRecording}
            />
          </div>
        )}

        {/* Action Controls Toolbar: [Mic / Mute] [Record / Stop] [End Call] */}
        <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-around">
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
              isMuted
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </div>
            <span className="text-[11px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Record / Stop Button */}
          {isRecording ? (
            <button
              onClick={onStopRecording}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-900 text-white hover:bg-black shadow-md transition-all animate-pulse"
              title="Stop recording"
              aria-label="Stop recording"
            >
              <div className="w-6 h-6 flex items-center justify-center text-rose-400">
                <Square className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[11px] font-medium">Stop</span>
            </button>
          ) : (
            <button
              onClick={onStartRecording}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
              title="Record both voices"
              aria-label="Record both voices"
            >
              <div className="w-6 h-6 flex items-center justify-center text-rose-600">
                <Circle className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[11px] font-medium">Record</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200 transition-all"
            title="End Call"
            aria-label="End Call"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <PhoneOff className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium">End</span>
          </button>
        </div>
      </div>
    </div>
  );
};
