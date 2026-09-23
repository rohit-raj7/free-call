import React, { useRef, useState } from 'react';
import type { RecordingResult } from '../types';
import { formatDuration, formatBytes } from '../lib/audioUtils';
import { Download, Play, Pause, X, FileAudio, Check } from 'lucide-react';

interface AudioPlayerPreviewProps {
  recording: RecordingResult;
  onDownload: () => void;
  onClose: () => void;
}

export const AudioPlayerPreview: React.FC<AudioPlayerPreviewProps> = ({
  recording,
  onDownload,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleDownloadClick = () => {
    onDownload();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="w-full mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileAudio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-800">Recording Complete</h4>
            <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
              {recording.filename}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          title="Dismiss preview"
          aria-label="Dismiss preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={recording.url}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Audio Controls */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={togglePlayback}
            className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-indigo-600 transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current text-indigo-600" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-indigo-600" />
                <span>Play Recording</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>{formatDuration(recording.durationSeconds)}</span>
            <span>•</span>
            <span>{formatBytes(recording.sizeBytes)}</span>
          </div>
        </div>

        {/* Download Action Button */}
        <button
          onClick={handleDownloadClick}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg shadow-sm transition-all duration-150 active:scale-[0.99]"
        >
          {downloaded ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Downloaded to Device</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Recording</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
