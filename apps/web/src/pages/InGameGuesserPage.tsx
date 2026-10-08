import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';
import { DrawBoard, InGameChatDrawer, DanmakuOverlay, Button } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';
import { toggleMute, toggleDeafen, setVoiceMode, holdToTalk } from '../services/voice';
import { leaveRoom } from '../services/room-session';
import { useVoiceLabels } from '../hooks/useVoiceLabels';

export const InGameGuesserPage: React.FC = () => {
  const { t } = useTranslation();
  const { chatDrawerLabels } = useVoiceLabels();
  const navigate = useNavigate();

  const { id: userId, nickname, avatar } = useUserStore();
  const {
    room,
    messages,
    danmakus,
    sendMessage,
    isMuted,
    isDeafened,
    voiceMode,
    voiceStatus,
    voiceError,
    speakingUserIds,
  } = useRoomStore();

  const {
    gameState,
    submitGuess,
    guessResult,
  } = useGameStore();

  const [guessInput, setGuessInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isDanmakuOn, setIsDanmakuOn] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // If room or game state is missing (e.g. initial connection pending), show loading
  if (!room || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--theme-primary,#5B5BF0)]" />
        <h2 className="text-xl font-bold text-foreground">{t('inGame.loadingRoom', '正在同步游戏状态...')}</h2>
        <p className="text-xs text-muted-foreground">{t('inGame.loadingHint', '如果长时间未加载，请尝试返回大厅')}</p>
        <Button variant="outline" onClick={() => navigate('/lobby')}>
          {t('inGame.backToLobby', '返回大厅')}
        </Button>
      </div>
    );
  }

  const strokes = gameState.strokes || [];
  const roomCode = room.roomCode;
  const currentRound = gameState.currentRound || room.currentRound || 1;
  const totalRounds = gameState.totalRounds || room.settings?.totalRounds || 3;
  const timeLeft = gameState.timeLeft ?? 0;
  const drawerNickname = gameState.drawerNickname || '';
  const wordCategory = gameState.wordCategory || '';
  const wordLength = gameState.currentWordLength || 0;
  const wordHint = gameState.wordHint || '';
  const players = room.players || [];

  // Determine if current user has guessed correctly
  const myScoreItem = gameState?.scores.find((s) => s.playerId === userId);
  const hasGuessedCorrect =
    (myScoreItem?.hasGuessedCorrectly ?? false) || (guessResult?.correct ?? false);

  // Trigger celebration on correct guess
  useEffect(() => {
    if (guessResult?.correct) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [guessResult?.correct, guessResult?.timestamp]);

  // Spacebar push-to-talk handler on desktop
  const isHoldingSpaceRef = useRef(false);

  useEffect(() => {
    const isEditableOrInteractive = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toUpperCase();
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return true;
      if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (voiceMode !== 'hold') return;
      if (e.code === 'Space' && !e.repeat) {
        if (!isEditableOrInteractive(e.target)) {
          e.preventDefault();
          isHoldingSpaceRef.current = true;
          holdToTalk(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isHoldingSpaceRef.current) {
          isHoldingSpaceRef.current = false;
          holdToTalk(false);
        }
      }
    };

    const handleBlur = () => {
      if (isHoldingSpaceRef.current) {
        isHoldingSpaceRef.current = false;
        holdToTalk(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (isHoldingSpaceRef.current) {
        isHoldingSpaceRef.current = false;
      }
      holdToTalk(false);
    };
  }, [voiceMode]);

  const handleGuessSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guessInput.trim() || hasGuessedCorrect) return;

    submitGuess(guessInput.trim());
    setGuessInput('');
  };

  const handleSendReaction = (emoji: string) => {
    sendMessage(emoji, true);
  };

  const handleCopyCode = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      });
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/lobby');
  };

  // Word slots keep blank placeholders based on wordLength (hint is displayed separately as text)
  const slots = Array.from({ length: Math.max(0, wordLength) }).map(() => '_');

  const scoresMap = new Map(gameState?.scores.map((s) => [s.playerId, s]) || []);

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background select-none font-body-md antialiased ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''
      }`}
    >
      {/* =========================================================================
          1. MOBILE VIEW (< lg: 1024px) - 100% Exact match to temp/stitch_idavoll/playhub
         ========================================================================= */}
      <div className="lg:hidden w-full h-full flex justify-center items-start overflow-hidden">
        <div
          className={`w-full ${
            isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'
          } flex flex-col justify-between bg-surface relative overflow-hidden shadow-2xl`}
        >
          {/* Top Status Header */}
          <header className="pt-2 px-3 pb-1 bg-surface shrink-0 z-20">
            <div className="flex items-center justify-between gap-1.5 h-11">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLeave}
                  className="tactile-btn w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
                  title="退出房间"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="font-label-sm text-[12px] font-bold tracking-tight">
                      #{roomCode}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
                  </div>
                  <span className="font-label-sm text-[10px] text-primary font-bold">
                    第 {currentRound}/{totalRounds} 轮 · 猜词
                  </span>
                </div>
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-1.5 bg-secondary-fixed/50 border border-secondary/20 px-2.5 py-1 rounded-full shadow-xs">
                <span className="material-symbols-outlined text-secondary text-[16px] animate-pulse">
                  timer
                </span>
                <span className="font-headline-sm text-[14px] font-black text-secondary tracking-tight leading-none">
                  {timeLeft}s
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDanmakuOn((p) => !p)}
                  className={`tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface transition-colors cursor-pointer ${
                    isDanmakuOn ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container'
                  }`}
                  title={isDanmakuOn ? '关闭弹幕' : '开启弹幕'}
                  aria-label={isDanmakuOn ? '关闭弹幕' : '开启弹幕'}
                >
                  <span className="material-symbols-outlined text-[18px]">subtitles</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen((p) => !p)}
                  className="tactile-btn w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
                  title="全屏"
                  aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatDrawerOpen(true)}
                  className="tactile-btn relative w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed transition-colors cursor-pointer"
                  title="聊天抽屉"
                  aria-label="打开聊天抽屉"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  {messages.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary border border-surface"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Players Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto py-1.5 no-scrollbar scroll-smooth">
              {players.map((p) => {
                const isSpeaking = speakingUserIds.includes(p.id);
                const scoreItem = scoresMap.get(p.id);
                const scoreVal = scoreItem?.score ?? p.score;
                const isMe = p.id === userId;
                const isDrawer = p.id === gameState?.drawerId;
                const hasCorrect = scoreItem?.hasGuessedCorrectly;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 border ${
                      isMe
                        ? 'bg-primary-fixed/40 border-primary/40'
                        : hasCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-surface-container-low border-surface-variant/40'
                    }`}
                  >
                    <div className="relative">
                      <img
                        className={`w-6 h-6 rounded-full object-cover ${
                          isSpeaking ? 'ring-2 ring-emerald-500 scale-105' : ''
                        }`}
                        alt={p.nickname}
                        src={p.avatar}
                      />
                      {isDrawer && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 text-[8px]">
                          🎨
                        </span>
                      )}
                      {hasCorrect && !isDrawer && (
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 text-[8px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col text-left pr-1">
                      <span className="font-label-sm text-[10px] font-bold text-on-surface truncate max-w-[50px]">
                        {p.nickname}
                      </span>
                      <span className="font-label-sm text-[9px] font-extrabold text-primary">
                        {scoreVal}分
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </header>

          {/* Word Hint Banner & Slots */}
          <div className="px-3 py-1.5 bg-surface shrink-0 z-20">
            <div className="bg-surface-container-low border border-surface-variant/40 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                {wordCategory && (
                  <span className="font-label-sm text-[11px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                    {wordCategory}
                  </span>
                )}
                {wordHint && (
                  <span className="font-label-sm text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span>💡</span>
                    <span>{wordHint}</span>
                  </span>
                )}
                <span className="text-xs font-bold text-muted-foreground">
                  画手: <span className="text-on-surface font-extrabold">{drawerNickname || '--'}</span>
                </span>
              </div>

              {/* Character Slots or Selecting Word Message */}
              {gameState.status === 'selecting_word' ? (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  {t('inGame.drawerSelectingWord', '画手正在挑选词语...')}
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  {slots.map((char, idx) => (
                    <div
                      key={idx}
                      className="w-7 h-7 rounded-xl bg-surface border-2 border-primary/30 flex items-center justify-center font-headline-sm text-sm font-black text-primary shadow-xs"
                    >
                      {char}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Canvas Viewing Area */}
          <main className="flex-1 w-full relative bg-slate-900 overflow-hidden flex items-center justify-center">
            <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

            <div className="w-full h-full flex items-center justify-center p-1">
              <DrawBoard
                strokes={strokes}
                isDrawer={false}
                width={800}
                height={600}
                className="w-full h-full aspect-[4/3] max-w-[800px] max-h-[600px] rounded-2xl shadow-xl pointer-events-none"
              />
            </div>

            {hasGuessedCorrect && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 animate-bounce">
                <span>🎉 恭喜！你已猜中正确答案</span>
              </div>
            )}
          </main>

          {/* Mobile Bottom Guess Input Bar */}
          <footer className="bg-surface border-t border-surface-variant/40 p-2.5 shrink-0 z-20 space-y-2">
            {/* Quick Reactions */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['👏', '🎨', '💡', '🔥', '😂'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-sm hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label={
                  voiceMode === 'hold'
                    ? !isMuted
                      ? t('voice.releaseToMuteAria', '松开静音')
                      : t('voice.holdToTalkAria', '按住说话')
                    : isMuted
                    ? t('voice.unmuteAria', '开麦')
                    : t('voice.muteAria', '静音')
                }
                {...(voiceMode === 'hold'
                  ? {
                      onPointerDown: (e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        holdToTalk(true);
                      },
                      onPointerUp: (e) => {
                        try {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch {}
                        holdToTalk(false);
                      },
                      onPointerCancel: () => holdToTalk(false),
                      onLostPointerCapture: () => holdToTalk(false),
                      onKeyDown: (e) => {
                        if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                          e.preventDefault();
                          holdToTalk(true);
                        }
                      },
                      onKeyUp: (e) => {
                        if (e.code === 'Space' || e.code === 'Enter') {
                          e.preventDefault();
                          holdToTalk(false);
                        }
                      },
                      onBlur: () => holdToTalk(false),
                    }
                  : {
                      onClick: toggleMute,
                    })}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors select-none touch-none cursor-pointer ${
                  !isMuted
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm animate-pulse'
                    : 'bg-surface-container text-muted-foreground border-outline-variant/50'
                }`}
              >
                {voiceMode === 'hold'
                  ? !isMuted
                    ? t('voice.releaseToMute', '松开发言')
                    : t('voice.holdToTalk', '按住说话')
                  : isMuted
                  ? t('voice.unmute', '开麦')
                  : t('voice.mute', '静音')}
              </button>
            </div>

            {/* Guess Input Field */}
            <form onSubmit={handleGuessSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                disabled={hasGuessedCorrect}
                placeholder={hasGuessedCorrect ? '你已猜中！等待本轮结束...' : '输入你的猜测词（回车提交）...'}
                className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-2xl text-xs font-extrabold border border-surface-variant/60 focus:outline-none focus:border-primary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={hasGuessedCorrect || !guessInput.trim()}
                className="px-5 py-2.5 rounded-2xl bg-primary text-on-primary text-xs font-black shadow-md disabled:opacity-40 cursor-pointer"
              >
                抢答
              </button>
            </form>
          </footer>
        </div>
      </div>

      {/* =========================================================================
          2. DESKTOP VIEW (>= lg: 1024px) - 3-Column Professional Widescreen Layout
         ========================================================================= */}
      <div className="hidden lg:flex w-full h-full flex-col bg-surface overflow-hidden">
        {/* Desktop Navbar */}
        <header className="h-14 px-6 bg-surface-container-low border-b border-surface-variant/40 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black">
                🔍
              </div>
              <span className="font-headline-sm text-lg font-black text-on-surface">PlayHub</span>
            </div>
            <div className="h-4 w-[1px] bg-outline-variant/60"></div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-xs font-extrabold text-on-surface">
                {room?.settings?.title || '你画我猜房间'}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2 py-0.5 rounded-full bg-surface border border-outline-variant/50 text-[11px] font-mono font-bold text-primary hover:bg-surface-variant cursor-pointer"
                title="点击复制房号"
              >
                #{roomCode} {copiedCode ? '✓' : ''}
              </button>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              第 {currentRound}/{totalRounds} 轮 · 抢答进行中
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-1.5 bg-secondary-fixed/50 border border-secondary/30 px-3 py-1 rounded-full shadow-xs">
              <span className="material-symbols-outlined text-secondary text-[18px] animate-pulse">
                timer
              </span>
              <span className="font-headline-sm text-base font-black text-secondary">
                {timeLeft}s 倒计时
              </span>
            </div>

            {/* Push to talk indicator / hold space */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-2">
              <span>
                {voiceMode === 'hold'
                  ? !isMuted
                    ? t('voice.speakingNow', '正在讲话...')
                    : t('voice.holdSpaceToTalk', '按住空格讲话')
                  : t('voice.openMicMode', '自由麦模式')}
              </span>
            </div>

            {/* Mic & Deafen */}
            <button
              type="button"
              aria-label={
                voiceMode === 'hold'
                  ? !isMuted
                    ? t('voice.releaseToMuteAria', '松开静音')
                    : t('voice.holdToTalkAria', '按住说话')
                  : isMuted
                  ? t('voice.unmuteAria', '开麦')
                  : t('voice.muteAria', '静音')
              }
              {...(voiceMode === 'hold'
                ? {
                    onPointerDown: (e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      holdToTalk(true);
                    },
                    onPointerUp: (e) => {
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch {}
                      holdToTalk(false);
                    },
                    onPointerCancel: () => holdToTalk(false),
                    onLostPointerCapture: () => holdToTalk(false),
                    onKeyDown: (e) => {
                      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                        e.preventDefault();
                        holdToTalk(true);
                      }
                    },
                    onKeyUp: (e) => {
                      if (e.code === 'Space' || e.code === 'Enter') {
                        e.preventDefault();
                        holdToTalk(false);
                      }
                    },
                    onBlur: () => holdToTalk(false),
                  }
                : {
                    onClick: toggleMute,
                  })}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors select-none touch-none cursor-pointer ${
                !isMuted
                  ? 'bg-emerald-600/10 text-emerald-600 border-emerald-500/30 animate-pulse'
                  : 'bg-surface-container text-muted-foreground border-outline-variant/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isMuted ? 'mic_off' : 'mic'}
              </span>
              <span>
                {voiceMode === 'hold'
                  ? !isMuted
                    ? t('voice.speakingNow', '发言中...')
                    : t('voice.holdToTalk', '按住说话')
                  : isMuted
                  ? t('voice.unmute', '开麦')
                  : t('voice.mute', '静音')}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleDeafen}
              aria-label={isDeafened ? '取消闭音' : '闭音'}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDeafened
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                  : 'bg-surface-container text-muted-foreground border-outline-variant/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isDeafened ? 'volume_off' : 'volume_up'}
              </span>
              <span>{isDeafened ? '取消闭音' : '闭音'}</span>
            </button>

            <button
              type="button"
              onClick={handleLeave}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-rose-500/10 hover:text-rose-600 text-xs font-black transition-colors cursor-pointer"
            >
              退出房间
            </button>
          </div>
        </header>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column (288px): Scores & Players */}
          <aside className="w-72 bg-surface-container-lowest border-r border-surface-variant/40 flex flex-col justify-between p-4 shrink-0 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-on-surface">实时积分榜</h4>
                <span className="text-xs font-bold text-muted-foreground">
                  {players.length}/{room?.settings?.maxPlayers || 8}人
                </span>
              </div>

              <div className="space-y-2">
                {players.map((p, idx) => {
                  const scoreItem = scoresMap.get(p.id);
                  const scoreVal = scoreItem?.score ?? p.score;
                  const isSpeaking = speakingUserIds.includes(p.id);
                  const isMe = p.id === userId;
                  const isCurDrawer = p.id === gameState?.drawerId;
                  const hasCorrect = scoreItem?.hasGuessedCorrectly;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                        hasCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : isCurDrawer
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-surface-container-low border-surface-variant/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <img
                            src={p.avatar}
                            alt={p.nickname}
                            className={`w-9 h-9 rounded-full object-cover ${
                              isSpeaking ? 'ring-2 ring-emerald-500' : ''
                            }`}
                          />
                          {idx === 0 && (
                            <span className="absolute -top-1 -left-1 text-xs">👑</span>
                          )}
                          {isCurDrawer && (
                            <span className="absolute -bottom-1 -right-1 text-xs">🎨</span>
                          )}
                          {hasCorrect && !isCurDrawer && (
                            <span className="absolute -bottom-1 -right-1 text-xs">✓</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-xs text-on-surface truncate max-w-[90px]">
                              {p.nickname}
                            </span>
                            {isMe && <span className="text-[10px] text-primary font-bold">(我)</span>}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            {hasCorrect ? '✓ 已猜中' : isCurDrawer ? '正在作画' : '猜词中'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-primary font-mono block">
                          {scoreVal}
                        </span>
                        <span className="text-[10px] text-muted-foreground">积分</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-outline-variant/60 hover:border-primary/60 text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-4"
            >
              <span>+ 邀请好友 (#{roomCode})</span>
            </button>
          </aside>

          {/* Center Column: Live Drawing Board & Guess Input */}
          <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
            {/* Center Subheader with Word Clue Slots */}
            <div className="h-14 px-6 bg-surface-container-low/90 backdrop-blur-md border-b border-surface-variant/40 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-xs font-black">
                  画手: {drawerNickname || '--'}
                </span>
                {wordCategory && (
                  <span className="text-xs text-muted-foreground font-bold">
                    类别: <span className="text-on-surface font-extrabold">{wordCategory}</span> · {wordLength}个字
                  </span>
                )}
                {wordHint && (
                  <span className="font-label-sm text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <span>💡</span>
                    <span>{wordHint}</span>
                  </span>
                )}
              </div>

              {/* Slots or Selecting Word Message */}
              {gameState.status === 'selecting_word' ? (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  {t('inGame.drawerSelectingWord', '画手正在挑选词语...')}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold">{t('inGame.clueSlots', '题目卡槽:')}</span>
                  <div className="flex items-center gap-1.5">
                    {slots.map((char, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-xl bg-surface border-2 border-primary/40 flex items-center justify-center font-headline-sm text-sm font-black text-primary shadow-xs"
                      >
                        {char}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stage Canvas */}
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
              <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

              <div className="w-full h-full max-w-[800px] max-h-[600px] aspect-[4/3] relative flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden pointer-events-none">
                <DrawBoard
                  strokes={strokes}
                  isDrawer={false}
                  width={800}
                  height={600}
                  className="w-full h-full aspect-[4/3] rounded-2xl border-0"
                />
              </div>

              {hasGuessedCorrect && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-black shadow-xl flex items-center gap-2 animate-bounce">
                  <span>🎉 恭喜！你已抢答成功</span>
                </div>
              )}
            </div>

            {/* Center Bottom: Guess Input Dock & Reaction Bar */}
            <footer className="h-18 px-6 bg-surface-container-low border-t border-surface-variant/40 flex items-center justify-between gap-4 shrink-0 z-20">
              {/* Quick Reactions */}
              <div className="flex items-center gap-2">
                {['👏', '🎨', '💡', '🔥', '😂'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="w-9 h-9 rounded-xl bg-surface border border-outline-variant/60 flex items-center justify-center text-base hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Main Guess Form */}
              <form onSubmit={handleGuessSubmit} className="flex-1 max-w-xl flex items-center gap-2">
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  disabled={hasGuessedCorrect}
                  placeholder={
                    hasGuessedCorrect
                      ? '你已猜中！静候其他玩家抢答...'
                      : '输入你猜测的词语（按 Enter 立即抢答）...'
                  }
                  className="flex-1 bg-surface px-4 py-2.5 rounded-xl text-xs font-extrabold border border-outline-variant/60 focus:outline-none focus:border-primary disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={hasGuessedCorrect || !guessInput.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black shadow-md disabled:opacity-40 cursor-pointer"
                >
                  抢答提交
                </button>
              </form>
            </footer>
          </main>

          {/* Right Column (352px): Real-time Guess & Chat Stream */}
          <aside className="w-88 bg-surface-container-lowest border-l border-surface-variant/40 flex flex-col justify-between shrink-0 overflow-hidden">
            <div className="h-12 px-4 border-b border-surface-variant/40 flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs text-on-surface">实时猜词动态</span>
              <button
                type="button"
                onClick={() => setIsDanmakuOn((p) => !p)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer ${
                  isDanmakuOn ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                {isDanmakuOn ? '弹幕: 开' : '弹幕: 关'}
              </button>
            </div>

            {/* Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                  暂无猜词记录，大家的猜测将显示于此
                </div>
              ) : (
                messages.map((m) => {
                  const isCorrect = m.payload.type === 'correct_guess';
                  return (
                    <div
                      key={m.payload.id}
                      className={`p-2.5 rounded-xl text-xs ${
                        isCorrect
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-extrabold text-[11px] text-primary">
                          {m.payload.senderNickname}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="leading-relaxed">{m.payload.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!guessInput.trim()) return;
                sendMessage(guessInput.trim(), false);
                setGuessInput('');
              }}
              className="p-3 bg-surface-container-low border-t border-surface-variant/40 flex items-center gap-2"
            >
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="发送闲聊消息..."
                className="flex-1 bg-surface px-3 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!guessInput.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-black disabled:opacity-40 cursor-pointer"
              >
                发言
              </button>
            </form>
          </aside>
        </div>
      </div>

      {/* Waiting for word selection banner */}
      {gameState?.status === 'selecting_word' && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-surface/90 backdrop-blur-md px-6 py-2.5 rounded-full border border-primary/30 shadow-xl flex items-center gap-2">
          <span className="animate-spin text-primary">⏳</span>
          <span className="text-xs font-extrabold text-on-surface">
            {t('inGame.drawerSelectingWord', '画手正在挑选词语...')}
          </span>
        </div>
      )}

      {/* Turn End Summary Overlay */}
      {gameState?.status === 'turn_ended' && gameState.turnSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface p-6 rounded-3xl border-2 border-border shadow-2xl space-y-4 text-center">
            <span className="text-2xl">🎉</span>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-on-surface">{t('inGame.turnEndedTitle')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('inGame.correctAnswerIs')}
                <span className="text-primary font-black text-sm ml-1">
                  【{gameState.turnSummary.secretWord}】
                </span>
              </p>
            </div>
            {gameState.turnSummary.guesserEarned?.[userId] ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                {t('inGame.guesserEarnedReward', { score: gameState.turnSummary.guesserEarned[userId] })}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-surface-container text-muted-foreground text-xs font-bold">
                {t('inGame.guesserMissedReward')}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground animate-pulse">{t('inGame.preparingNextRound')}</p>
          </div>
        </div>
      )}

      {/* Mobile Chat Drawer */}
      <InGameChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        currentUserId={userId}
        onSendMessage={(content) => sendMessage(content, false)}
        players={players}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isDeafened={isDeafened}
        onToggleDeafen={toggleDeafen}
        voiceMode={voiceMode}
        onSetVoiceMode={setVoiceMode}
        onHoldToTalk={holdToTalk}
        voiceStatus={voiceStatus}
        voiceError={voiceError}
        speakingUserIds={speakingUserIds}
        roomCode={roomCode}
        currentDrawerNickname={drawerNickname}
        isDrawer={false}
        labels={chatDrawerLabels}
      />
    </div>
  );
};
