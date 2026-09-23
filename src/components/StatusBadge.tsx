import React from 'react';
import type { CallState } from '../types';
import { Wifi, WifiOff, Loader2, Users, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  callState: CallState;
  isPeerRecording?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ callState, isPeerRecording }) => {
  const getBadgeContent = () => {
    switch (callState) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />,
          text: 'Connecting...',
          bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
          dotClass: 'bg-amber-500',
        };
      case 'waiting':
        return {
          icon: <Users className="w-3.5 h-3.5 text-blue-500" />,
          text: 'Waiting for another person...',
          bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
          dotClass: 'bg-blue-500 animate-pulse',
        };
      case 'connected':
        return {
          icon: <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />,
          text: 'Connected',
          bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotClass: 'bg-emerald-500',
        };
      case 'reconnecting':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 animate-bounce text-amber-600" />,
          text: 'Reconnecting...',
          bgClass: 'bg-amber-50 text-amber-800 border-amber-300',
          dotClass: 'bg-amber-600',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-slate-500" />,
          text: 'Disconnected',
          bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-400',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          text: 'Connection Error',
          bgClass: 'bg-rose-50 text-rose-700 border-rose-200',
          dotClass: 'bg-rose-600',
        };
      default:
        return {
          icon: <Wifi className="w-3.5 h-3.5 text-slate-400" />,
          text: 'Ready',
          bgClass: 'bg-slate-50 text-slate-600 border-slate-200',
          dotClass: 'bg-slate-400',
        };
    }
  };

  const badge = getBadgeContent();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium border shadow-xs transition-all duration-200 ${badge.bgClass}`}
      >
        {badge.icon}
        <span>{badge.text}</span>
      </div>

      {isPeerRecording && (
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span>Other participant started recording</span>
        </div>
      )}
    </div>
  );
};
