import React, { useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  Sparkles,
  Mic,
  MicOff,
  Radio,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface InGameBottomBarLabels {
  placeholder?: string;
  send?: string;
  sendAria?: string;
  clearAria?: string;
  danmakuOn?: string;
  danmakuOff?: string;
  danmakuOnBadge?: string;
  danmakuOffBadge?: string;
  danmakuToggleAria?: string;
  openDrawer?: string;
  openDrawerAria?: string;
  modeGuess?: string;
  modeChat?: string;
  modeGuessed?: string;
  modeToggleAria?: string;
  modeGuessTitle?: string;
  modeChatTitle?: string;
  holdToTalk?: string;
  releaseToMute?: string;
  holdToTalkShort?: string;
  releaseToMuteShort?: string;
  holdToTalkAria?: string;
  releaseToMuteAria?: string;
  mute?: string;
  unmute?: string;
  muteAria?: string;
  unmuteAria?: string;
}

export interface InGameBottomBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;

  // Danmaku Toggle
  isDanmakuOn?: boolean;
  onToggleDanmaku?: () => void;
  showDanmakuToggle?: boolean;

  // Drawer Toggle
  onOpenDrawer?: () => void;
  hasUnreadMessages?: boolean;
  showDrawerButton?: boolean;

  // Guesser Mode Switch
  showModeToggle?: boolean;
  mode?: 'guess' | 'chat';
  onToggleMode?: () => void;
  hasGuessedCorrect?: boolean;

  // Voice PTT / Mic
  showVoiceButton?: boolean;
  voiceMode?: 'hold' | 'open';
  isMuted?: boolean;
  onToggleMute?: () => void;
  onHoldToTalk?: (pressed: boolean) => void;
  isSpeaking?: boolean;

  // Slots
  aboveInputSlot?: React.ReactNode;
  belowInputSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;

  // Custom send label
  sendLabel?: string;

  // Class for secondary row
  secondaryClassName?: string;

  // Labels for i18n
  labels?: InGameBottomBarLabels;
}

export const InGameBottomBar: React.FC<InGameBottomBarProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = '',
  className = '',
  isDanmakuOn = true,
  onToggleDanmaku,
  showDanmakuToggle = false,
  onOpenDrawer,
  hasUnreadMessages = false,
  showDrawerButton = false,
  showModeToggle = false,
  mode = 'chat',
  onToggleMode,
  hasGuessedCorrect = false,
  showVoiceButton = false,
  voiceMode = 'open',
  isMuted = true,
  onToggleMute,
  onHoldToTalk,
  isSpeaking = false,
  aboveInputSlot,
  belowInputSlot,
  leftSlot,
  rightSlot,
  sendLabel,
  secondaryClassName = '',
  labels,
}) => {
  const onHoldToTalkRef = useRef(onHoldToTalk);
  useEffect(() => {
    onHoldToTalkRef.current = onHoldToTalk;
  });

  const isHoldingRef = useRef(false);

  const releaseTalk = () => {
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      onHoldToTalkRef.current?.(false);
    }
  };

  const startTalk = () => {
    if (disabled || voiceMode !== 'hold') return;
    if (!isHoldingRef.current) {
      isHoldingRef.current = true;
      onHoldToTalkRef.current?.(true);
    }
  };

  // Window blur release & component unmount release
  useEffect(() => {
    const handleWindowBlur = () => {
      releaseTalk();
    };
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      releaseTalk();
    };
  }, []);

  // Cancel if disabled or voiceMode changes away from 'hold'
  useEffect(() => {
    if (disabled || voiceMode !== 'hold') {
      releaseTalk();
    }
  }, [disabled, voiceMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit(e);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (voiceMode === 'hold') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      startTalk();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (voiceMode === 'hold') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      releaseTalk();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (voiceMode === 'hold') {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        startTalk();
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (voiceMode === 'hold') {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        releaseTalk();
      }
    }
  };

  const isEnglish = Boolean(
    labels?.send === 'Send' ||
    labels?.placeholder?.toLowerCase().includes('type') ||
    labels?.placeholder?.toLowerCase().includes('guess') ||
    labels?.placeholder?.toLowerCase().includes('message') ||
    labels?.modeChat === 'Chat' ||
    (typeof placeholder === 'string' && (placeholder.toLowerCase().includes('type') || placeholder.toLowerCase().includes('guess') || placeholder.toLowerCase().includes('chat')))
  );

  const displaySendLabel = sendLabel ?? labels?.send ?? (isEnglish ? 'Send' : '发送');
  const displayPlaceholder = placeholder || labels?.placeholder || (isEnglish ? 'Type a message...' : '发送消息...');

  const renderVoiceButton = () => {
    if (!showVoiceButton) return null;

    const buttonAria =
      voiceMode === 'hold'
        ? isSpeaking || !isMuted
          ? labels?.releaseToMuteAria ?? (isEnglish ? 'Release to mute' : '松开静音')
          : labels?.holdToTalkAria ?? (isEnglish ? 'Hold to talk' : '按住说话')
        : isMuted
        ? labels?.unmuteAria ?? (isEnglish ? 'Click to unmute' : '点击开麦')
        : labels?.muteAria ?? (isEnglish ? 'Mute' : '点击静音');

    const fullLabel =
      voiceMode === 'hold'
        ? isSpeaking || !isMuted
          ? labels?.releaseToMute ?? (isEnglish ? 'Release to mute' : '松开发言')
          : labels?.holdToTalk ?? (isEnglish ? 'Hold to talk' : '按住说话')
        : isMuted
        ? labels?.unmute ?? (isEnglish ? 'Unmute' : '开麦')
        : labels?.mute ?? (isEnglish ? 'Mute' : '静音');

    const shortLabel =
      voiceMode === 'hold'
        ? isSpeaking || !isMuted
          ? labels?.releaseToMuteShort ?? (isEnglish ? 'Release' : '松开')
          : labels?.holdToTalkShort ?? (isEnglish ? 'Hold' : '按住')
        : fullLabel;

    return (
      <button
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={releaseTalk}
        onLostPointerCapture={releaseTalk}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={releaseTalk}
        onClick={voiceMode === 'open' ? onToggleMute : undefined}
        aria-label={buttonAria}
        title={buttonAria}
        className={cn(
          'h-7 px-1.5 sm:px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95 select-none touch-none',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          isSpeaking || !isMuted
            ? 'bg-primary text-primary-foreground shadow-xs animate-pulse'
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        )}
      >
        {voiceMode === 'hold' ? (
          <Radio className={cn('w-3.5 h-3.5', isSpeaking && 'animate-ping')} />
        ) : isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline whitespace-nowrap">{fullLabel}</span>
        <span className="sm:hidden whitespace-nowrap text-[11px]">{shortLabel}</span>
      </button>
    );
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5 shrink-0', className)}>
      {aboveInputSlot}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1 sm:gap-1.5 w-full bg-card/90 dark:bg-card/95 border border-border/80 rounded-xl px-1 sm:px-2 py-1 shadow-2xs"
      >
        {/* Guesser Mode Toggle */}
        {showModeToggle &&
          (hasGuessedCorrect ? (
            <div
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-xs shrink-0 select-none shadow-2xs"
              title={labels?.modeGuessed ?? (isEnglish ? 'Guessed' : '已猜中')}
            >
              <span>🎉</span>
              <span className="hidden sm:inline">{labels?.modeGuessed ?? (isEnglish ? 'Guessed' : '已猜中')}</span>
              <span className="hidden sm:inline">{labels?.modeChat ?? (isEnglish ? 'Chat' : '聊天')}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleMode}
              className={cn(
                'tactile-btn flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full font-bold text-xs shrink-0 transition-all cursor-pointer border shadow-2xs',
                mode === 'guess'
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted text-muted-foreground border-border/80 hover:text-foreground'
              )}
              title={
                mode === 'guess'
                  ? labels?.modeGuessTitle ?? (isEnglish ? 'Current: Guess mode (click to switch to chat)' : '当前：猜词模式（点击切换聊天）')
                  : labels?.modeChatTitle ?? (isEnglish ? 'Current: Chat mode (click to switch to guess)' : '当前：聊天模式（点击切换猜词）')
              }
              aria-label={
                labels?.modeToggleAria ??
                (isEnglish
                  ? (mode === 'guess' ? 'Switch to chat mode' : 'Switch to guess mode')
                  : (mode === 'guess' ? '切换为聊天模式' : '切换为猜词模式'))
              }
            >
              <span>{mode === 'guess' ? '🎯' : '💬'}</span>
              <span className="hidden sm:inline">
                {mode === 'guess' ? labels?.modeGuess ?? (isEnglish ? 'Guess' : '猜词') : labels?.modeChat ?? (isEnglish ? 'Chat' : '聊天')}
              </span>
              <span className="text-[10px] opacity-60">⇄</span>
            </button>
          ))}

        {/* Drawer Trigger Button */}
        {showDrawerButton && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative cursor-pointer shrink-0"
            title={labels?.openDrawer ?? (isEnglish ? 'Room Chat' : '房间聊天')}
            aria-label={labels?.openDrawerAria ?? labels?.openDrawer ?? (isEnglish ? 'Room Chat' : '房间聊天')}
          >
            <MessageSquare className="w-4 h-4" />
            {hasUnreadMessages && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        )}

        {/* Danmaku Toggle Button */}
        {showDanmakuToggle && onToggleDanmaku && (
          <button
            type="button"
            onClick={onToggleDanmaku}
            className={cn(
              'px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 border',
              isDanmakuOn
                ? 'bg-primary/10 text-primary border-primary/30 shadow-2xs'
                : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
            )}
            title={
              isDanmakuOn
                ? labels?.danmakuOn ?? (isEnglish ? '🚀 Danmaku On' : '🚀 弹幕模式开启')
                : labels?.danmakuOff ?? (isEnglish ? 'Danmaku Off' : '弹幕已关')
            }
            aria-label={
              labels?.danmakuToggleAria ??
              (isEnglish
                ? (isDanmakuOn ? 'Disable danmaku' : 'Enable danmaku')
                : (isDanmakuOn ? '关闭弹幕' : '开启弹幕'))
            }
            aria-pressed={isDanmakuOn}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline text-[10px] sm:text-xs">
              {isDanmakuOn
                ? labels?.danmakuOnBadge ?? (isEnglish ? 'Danmaku' : '弹幕')
                : labels?.danmakuOffBadge ?? (isEnglish ? 'Off' : '关')}
            </span>
          </button>
        )}

        {/* Text Input */}
        <div className="flex-1 relative flex items-center min-w-[56px]">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={displayPlaceholder}
            aria-label={displayPlaceholder}
            disabled={disabled}
            className="w-full h-7 text-xs pl-2.5 pr-7 rounded-lg border border-border bg-background/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground font-medium truncate"
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-1.5 p-0.5 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
              aria-label={labels?.clearAria ?? (isEnglish ? 'Clear' : '清空')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Send / Guess Submit Button */}
        <Button
          type="submit"
          size="sm"
          disabled={disabled || !value.trim()}
          aria-label={labels?.sendAria ?? displaySendLabel}
          className="h-7 px-2 sm:px-2.5 rounded-lg font-bold text-xs gap-1 cursor-pointer shrink-0"
        >
          <Send className="w-3 h-3" />
          <span className="hidden sm:inline">{displaySendLabel}</span>
        </Button>

        {/* Voice Button (Rendered inline on the right side of the input in the same row) */}
        {renderVoiceButton()}
      </form>

      {/* Secondary Action Row (Slots) */}
      {(leftSlot || rightSlot) && (
        <div
          className={cn(
            'flex items-center justify-between gap-1.5 w-full',
            secondaryClassName
          )}
        >
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar">
            {leftSlot}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {rightSlot}
          </div>
        </div>
      )}

      {belowInputSlot}
    </div>
  );
};
