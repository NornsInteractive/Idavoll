import React, { useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, AlertCircle } from 'lucide-react';
import { UserProfile } from '@idavoll/protocol';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';

export interface VoiceDockLabels {
  statusConnected?: string;
  statusConnecting?: string;
  statusError?: string;
  statusErrorAria?: string;
  statusOff?: string;
  channelTitle?: string;
  modeHold?: string;
  modeHoldAria?: string;
  modeOpen?: string;
  modeOpenAria?: string;
  holdToTalk?: string;
  releaseToMute?: string;
  holdToTalkAria?: string;
  releaseToMuteAria?: string;
  mute?: string;
  unmute?: string;
  muteAria?: string;
  unmuteAria?: string;
  deafen?: string;
  undeafen?: string;
  deafenAria?: string;
  undeafenAria?: string;
  playerMuted?: string;
}

export interface VoiceDockProps {
  players: UserProfile[];
  currentUserId: string;
  isMuted: boolean;
  onToggleMute: () => void;
  isDeafened?: boolean;
  onToggleDeafen?: () => void;
  speakingUserIds?: string[];
  className?: string;
  voiceStatus?: 'off' | 'connecting' | 'connected' | 'error';
  voiceError?: string | null;
  voiceMode?: 'hold' | 'open';
  onSetVoiceMode?: (mode: 'hold' | 'open') => void;
  onHoldToTalk?: (pressed: boolean) => void;
  labels?: VoiceDockLabels;
}

export const VoiceDock: React.FC<VoiceDockProps> = ({
  players,
  currentUserId,
  isMuted,
  onToggleMute,
  isDeafened = false,
  onToggleDeafen,
  speakingUserIds = [],
  className = '',
  voiceStatus = 'off',
  voiceError = null,
  voiceMode = 'open',
  onSetVoiceMode,
  onHoldToTalk,
  labels,
}) => {
  // Release push-to-talk on unmount
  useEffect(() => {
    return () => {
      onHoldToTalk?.(false);
    };
  }, [onHoldToTalk]);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5 bg-card/90 backdrop-blur-md rounded-2xl border border-border shadow-sm gap-2',
        className
      )}
    >
      {/* Active Voice Speakers & Status */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold shrink-0 mr-1">
          {voiceStatus === 'connected' ? (
            <>
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">
                {labels?.statusConnected ?? '已连麦'}
              </span>
            </>
          ) : voiceStatus === 'connecting' ? (
            <>
              <Radio className="w-3.5 h-3.5 text-amber-500 animate-ping" />
              <span className="hidden sm:inline text-amber-600 dark:text-amber-400">
                {labels?.statusConnecting ?? '连接中...'}
              </span>
            </>
          ) : voiceStatus === 'error' ? (
            <button
              type="button"
              onClick={onToggleMute}
              title={voiceError || (labels?.statusErrorAria ?? '语音异常，点击重试')}
              aria-label={labels?.statusErrorAria ?? '语音异常，点击重试开麦'}
              className="flex items-center gap-1 text-rose-500 hover:underline cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{labels?.statusError ?? '语音异常 (重试)'}</span>
            </button>
          ) : (
            <>
              <Radio className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="hidden sm:inline text-muted-foreground">
                {labels?.statusOff ?? '语音未开启'}
              </span>
            </>
          )}
        </div>

        {players.map((player) => {
          const isSpeaking = speakingUserIds.includes(player.id);
          return (
            <div
              key={player.id}
              className="relative group shrink-0"
              title={`${player.nickname} ${player.micMuted ? (labels?.playerMuted ?? '(静音)') : ''}`}
            >
              <div
                className={`relative rounded-full transition-all ${
                  isSpeaking ? 'ring-2 ring-emerald-500 scale-105' : ''
                }`}
              >
                <Avatar src={player.avatar} alt={player.nickname} size="sm" />
                {player.micMuted && (
                  <span className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow">
                    <MicOff className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice Mode Selector & Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onSetVoiceMode && (
          <div className="inline-flex rounded-full bg-muted p-0.5 border border-border/60 text-[10px] font-black mr-1">
            <button
              type="button"
              onClick={() => onSetVoiceMode('hold')}
              aria-label={labels?.modeHoldAria ?? '切换到按住说话模式'}
              className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                voiceMode === 'hold' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              {labels?.modeHold ?? '按住说话'}
            </button>
            <button
              type="button"
              onClick={() => onSetVoiceMode('open')}
              aria-label={labels?.modeOpenAria ?? '切换到自由麦模式'}
              className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                voiceMode === 'open'
                  ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              {labels?.modeOpen ?? '自由麦'}
            </button>
          </div>
        )}

        {/* Talk / Mute Button */}
        {voiceMode === 'hold' ? (
          <Button
            type="button"
            size="sm"
            variant={!isMuted ? 'default' : 'secondary'}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onHoldToTalk?.(true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
              onHoldToTalk?.(false);
            }}
            onPointerCancel={() => onHoldToTalk?.(false)}
            onLostPointerCapture={() => onHoldToTalk?.(false)}
            onKeyDown={(e) => {
              if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                e.preventDefault();
                onHoldToTalk?.(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                onHoldToTalk?.(false);
              }
            }}
            onBlur={() => onHoldToTalk?.(false)}
            className={`h-8 px-3 gap-1 text-xs select-none touch-none cursor-pointer ${
              !isMuted ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' : ''
            }`}
            aria-label={
              !isMuted
                ? labels?.releaseToMuteAria ?? '松开静音'
                : labels?.holdToTalkAria ?? '按住说话'
            }
          >
            {!isMuted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {!isMuted
                ? labels?.releaseToMute ?? '松开发言'
                : labels?.holdToTalk ?? '按住说话'}
            </span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={isMuted ? 'secondary' : 'default'}
            onClick={onToggleMute}
            className="h-8 px-3 gap-1 text-xs cursor-pointer"
            aria-label={isMuted ? labels?.unmuteAria ?? '开麦' : labels?.muteAria ?? '静音'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isMuted ? labels?.unmute ?? '开麦' : labels?.mute ?? '静音'}
            </span>
          </Button>
        )}

        {onToggleDeafen && (
          <Button
            type="button"
            size="icon"
            variant="surface"
            onClick={onToggleDeafen}
            className="h-8 w-8 text-muted-foreground cursor-pointer"
            title={isDeafened ? labels?.undeafen ?? '取消闭音' : labels?.deafen ?? '闭音'}
            aria-label={
              isDeafened
                ? labels?.undeafenAria ?? '取消闭音'
                : labels?.deafenAria ?? '闭音'
            }
          >
            {isDeafened ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
};
