import React, { useState, useEffect } from 'react';
import { PhoneCall, Copy, Link as LinkIcon, Check, Sparkles } from 'lucide-react';
import { LIVEKIT_URL, generateLiveKitToken } from '../lib/livekit';

interface JoinScreenProps {
  onJoin: (config: { liveKitUrl: string; token: string; roomId: string; name: string }) => void;
  isConnecting?: boolean;
  initialError?: string | null;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  onJoin,
  isConnecting = false,
  initialError = null,
}) => {
  const [name, setName] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('call-101');
  const [copiedRoom, setCopiedRoom] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Auto-fill Room ID from URL query parameters (?room=abc123)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const roomParam = searchParams.get('room');
      if (roomParam) {
        setRoomId(roomParam);
      }
      const nameParam = searchParams.get('name');
      if (nameParam) {
        setName(nameParam);
      }
    } catch {
      // URL param error ignore
    }
  }, []);

  const handleCopyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId.trim());
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId.trim());
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRandomizeName = () => {
    const names = ['Rahul', 'Amit', 'Priya', 'Sara', 'Alex', 'Rohan', 'Sneha', 'Vikram'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    setName(randomName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanName = name.trim();
    const cleanRoom = roomId.trim();

    if (!cleanName) {
      setLocalError('Please enter your name.');
      return;
    }
    if (!cleanRoom) {
      setLocalError('Please enter a Room ID.');
      return;
    }

    try {
      // Directly generate participant token synchronously in code (0 HTTP requests, no 404 on Vercel)
      const resolvedToken = await generateLiveKitToken(cleanRoom, cleanName);

      if (!resolvedToken) {
        setLocalError('Failed to generate LiveKit participant token.');
        return;
      }

      onJoin({
        liveKitUrl: LIVEKIT_URL,
        token: resolvedToken,
        roomId: cleanRoom,
        name: cleanName,
      });
    } catch (err: any) {
      console.error('Join preparation error:', err);
      setLocalError(err.message || 'Failed to connect. Please check settings.');
    }
  };

  const effectiveError = initialError || localError;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-100/70 text-slate-800 antialiased font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 flex flex-col transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-md shadow-indigo-200 mb-3">
            <PhoneCall className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Audio Call</h1>
          <p className="text-xs text-slate-500 mt-1">
            Simple, private 2-person browser voice call
          </p>
        </div>

        {/* Error Alert */}
        {effectiveError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed flex items-start gap-2 animate-fade-in">
            <span className="font-bold">??</span>
            <span>{effectiveError}</span>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Your Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="name-input" className="text-xs font-semibold text-slate-700">
                Your Name
              </label>
              {!name && (
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Random</span>
                </button>
              )}
            </div>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all bg-white text-slate-900"
              autoFocus
              required
            />
          </div>

          {/* Room ID */}
          <div>
            <label htmlFor="room-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Room ID
            </label>
            <input
              id="room-input"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. abc123"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-mono transition-all bg-white text-slate-900"
              required
            />
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyRoomId}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              {copiedRoom ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Room ID</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-medium text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-lg border border-indigo-200/60 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
          </div>

          {/* Join Call Button */}
          <button
            type="submit"
            disabled={isConnecting}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting to Call...</span>
              </>
            ) : (
              <span>Join Call</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
