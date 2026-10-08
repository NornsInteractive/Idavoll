import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { DrawBoard, InGameChatDrawer, DanmakuOverlay } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';
import { toggleMute, toggleDeafen, setVoiceMode, holdToTalk } from '../services/voice';
import { leaveRoom } from '../services/room-session';

export const InGameDrawerPage: React.FC = () => {
  const { t } = useTranslation();
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
    currentWord,
    addStroke,
    undoStroke,
    redoStroke,
    clearStrokes,
    selectWord,
    rerollWord,
    revealHint,
  } = useGameStore();

  const [currentColor, setCurrentColor] = useState('#413FD6');
  const [currentSize, setCurrentSize] = useState(8);
  const [isEraser, setIsEraser] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [desktopChatTab, setDesktopChatTab] = useState<'guess' | 'chat'>('guess');
  const [isDanmakuOn, setIsDanmakuOn] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // If room or game state is missing, show real syncing state
  if (!room || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--theme-primary,#5B5BF0)]" />
        <h2 className="text-xl font-bold text-foreground">{t('inGame.loadingRoom', '正在同步游戏状态...')}</h2>
        <p className="text-xs text-muted-foreground">{t('inGame.loadingHint', '如果长时间未加载，请尝试返回大厅')}</p>
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            navigate('/lobby');
          }}
          className="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
        >
          {t('inGame.backToLobby', '返回大厅')}
        </button>
      </div>
    );
  }

  const strokes = gameState.strokes || [];
  const roomCode = room.roomCode;
  const currentRound = gameState.currentRound || room.currentRound || 1;
  const totalRounds = gameState.totalRounds || room.settings?.totalRounds || 3;
  const timeLeft = gameState.timeLeft ?? 0;
  const wordToDraw = gameState.currentWord || currentWord || '';
  const wordCategory = gameState.wordCategory || '';
  const wordLength = gameState.currentWordLength || (wordToDraw ? wordToDraw.length : 0);
  const rerollsLeft = gameState.rerollsLeft ?? 0;
  const hintsLeft = gameState.hintsLeft ?? 0;
  const hasGuessedAnyone = gameState.scores.some((s) => s.hasGuessedCorrectly) ?? false;
  const players = room.players || [];

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    try {
      if (!isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSendDanmaku = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!danmakuInput.trim()) return;
    sendMessage(danmakuInput.trim(), true);
    setDanmakuInput('');
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

  const mobileColorSwatches = [
    { color: '#413FD6', title: '主色蓝' },
    { color: '#FC695C', title: '珊瑚红' },
    { color: '#2EC4A6', title: '薄荷绿' },
    { color: '#FFD13B', title: '明亮黄' },
    { color: '#38BDF8', title: '天青蓝' },
    { color: '#161A30', title: '炭墨黑' },
    { color: '#FFFFFF', title: '纯白色', border: true },
    { color: '#8D5B4C', title: '暖棕褐' },
  ];

  const desktopColorSwatches = [
    '#161A30', '#475569', '#94A3B8', '#FFFFFF',
    '#413FD6', '#5B5BF0', '#818CF8', '#C7D2FE',
    '#AE3029', '#FC695C', '#F97316', '#FBBF24',
    '#10B981', '#2EC4A6', '#06B6D4', '#38BDF8',
    '#8B5CF6', '#EC4899', '#8D5B4C', '#FDE047',
  ];

  // Combined score map
  const scoresMap = new Map(gameState?.scores.map((s) => [s.playerId, s]) || []);

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background select-none font-body-md antialiased ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''
      }`}
    >
      {/* =========================================================================
          1. MOBILE VIEW (< lg: 1024px) - 100% Exact match to temp/stitch_idavoll
         ========================================================================= */}
      <div className="lg:hidden w-full h-full flex justify-center items-start overflow-hidden">
        <div
          className={`w-full ${
            isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'
          } flex flex-col justify-between bg-surface relative overflow-hidden shadow-2xl`}
        >
          {/* Top Status Bar */}
          <header className="pt-2 px-3 pb-1 bg-surface shrink-0 z-20">
            <div className="flex items-center justify-between gap-1.5 h-11">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLeave}
                  className="tactile-btn w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
                  title={t('inGame.exitRoom', '退出房间')}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="font-label-sm text-[12px] text-on-surface font-extrabold tracking-tight">
                      #{roomCode}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
                  </div>
                  <span className="font-label-sm text-[10px] text-primary font-bold">
                    {t('inGame.roundDrawerInfo', { current: currentRound, total: totalRounds, defaultValue: `第 ${currentRound}/${totalRounds} 轮 · 画手` })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-secondary-fixed/50 border border-secondary/20 px-2.5 py-1 rounded-full shadow-xs">
                <span className="material-symbols-outlined text-secondary text-[16px] animate-pulse">
                  timer
                </span>
                <span className="font-headline-sm text-[14px] font-black text-secondary tracking-tight leading-none">
                  {timeLeft}s
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={undoStroke}
                  disabled={!strokes.length}
                  className="tactile-btn w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface disabled:opacity-40 transition-colors cursor-pointer"
                  title={t('inGame.undo', '撤销')}
                  aria-label={t('inGame.undo', '撤销')}
                >
                  <span className="material-symbols-outlined text-[18px]">undo</span>
                </button>
                <button
                  type="button"
                  onClick={redoStroke}
                  className="tactile-btn w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
                  title={t('inGame.redo', '重做')}
                  aria-label={t('inGame.redo', '重做')}
                >
                  <span className="material-symbols-outlined text-[18px]">redo</span>
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface transition-colors cursor-pointer ${
                    isFullscreen ? 'bg-primary text-on-primary' : 'bg-surface-container'
                  }`}
                  title={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenDanmaku', '全屏画板')}
                  aria-label={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenDanmaku', '全屏画板')}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatDrawerOpen(true)}
                  className="tactile-btn relative w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed transition-colors cursor-pointer"
                  title={t('inGame.chatAndVoice', '聊天与猜词动态')}
                  aria-label={t('inGame.chatAndVoice', '聊天与猜词动态')}
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  {messages.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary border border-surface"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Players Scores Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto py-1.5 no-scrollbar scroll-smooth">
              {players.map((p) => {
                const isSpeaking = speakingUserIds.includes(p.id);
                const scoreItem = scoresMap.get(p.id);
                const scoreVal = scoreItem?.score ?? p.score;
                const isMe = p.id === userId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 border ${
                      isMe
                        ? 'bg-primary-fixed/40 border-primary/40'
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
                      {p.id === gameState?.drawerId && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 text-[8px]">
                          🎨
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col text-left pr-1">
                      <span className="font-label-sm text-[10px] font-bold text-on-surface truncate max-w-[50px]">
                        {p.nickname}
                      </span>
                      <span className="font-label-sm text-[9px] font-extrabold text-primary">
                        {scoreVal}{t('inGame.scorePoints', '分')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </header>

          {/* Prompt Information Banner */}
          <div className="px-3 py-1.5 bg-surface shrink-0 z-20">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">brush</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider text-primary">
                      {t('inGame.drawingPrompt', '本轮题目')}
                    </span>
                    <span className="bg-surface px-1.5 py-0.2 rounded-md font-label-sm text-[10px] text-on-surface-variant font-medium">
                      {wordCategory ? `${wordCategory} · ` : ''}{t('inGame.wordChars', { length: wordLength, defaultValue: `${wordLength}字` })}
                    </span>
                  </div>
                  <span className="font-headline-sm text-[16px] font-black text-on-surface truncate tracking-tight">
                    {wordToDraw || t('inGame.waitingWordSelect', '等待选词')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {hintsLeft > 0 && (
                  <button
                    type="button"
                    onClick={revealHint}
                    className="tactile-btn flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 px-2 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer"
                  >
                    <span>{t('inGame.hint', '提示')}({hintsLeft})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={rerollWord}
                  disabled={rerollsLeft <= 0 || hasGuessedAnyone}
                  className="tactile-btn flex items-center gap-1 bg-surface border border-outline-variant/60 text-on-surface px-2 py-1 rounded-xl text-[11px] font-extrabold hover:bg-surface-container transition-all cursor-pointer disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[13px]">refresh</span>
                  <span>{t('inGame.reroll', '换词')}({rerollsLeft})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Area with 800x600 4:3 Ratio */}
          <main className="flex-1 w-full relative bg-slate-900 overflow-hidden flex items-center justify-center">
            <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

            <div className="w-full h-full flex items-center justify-center p-1">
              <DrawBoard
                strokes={strokes}
                onStrokeUpdate={(s) => addStroke(s)}
                onStrokeComplete={(s) => addStroke(s)}
                currentColor={currentColor}
                currentSize={currentSize}
                isEraser={isEraser}
                isDrawer={true}
                disabled={gameState.status !== 'drawing'}
                width={800}
                height={600}
                className="w-full h-full rounded-2xl shadow-xl"
              />
            </div>
          </main>

          {/* Bottom Dock Tools */}
          <footer className="bg-surface border-t border-surface-variant/40 p-2 shrink-0 z-20 space-y-2">
            {/* Color Swatches */}
            <div className="flex items-center justify-between gap-1 px-1">
              {mobileColorSwatches.map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => {
                    setIsEraser(false);
                    setCurrentColor(item.color);
                  }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    !isEraser && currentColor === item.color
                      ? 'scale-125 ring-3 ring-primary shadow-md'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: item.color }}
                  title={item.title}
                />
              ))}
            </div>

            {/* Brush Sizes, Eraser, Clear */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {[4, 8, 16, 24].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCurrentSize(size)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                      currentSize === size && !isEraser
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface'
                    }`}
                  >
                    {size === 4 ? t('inGame.brushFine', '细') : size === 8 ? t('inGame.brushMedium', '中') : size === 16 ? t('inGame.brushThick', '粗') : t('inGame.brushVeryThick', '特粗')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEraser((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-colors cursor-pointer ${
                    isEraser
                      ? 'bg-secondary text-on-secondary shadow-md'
                      : 'bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">ink_eraser</span>
                  <span>{t('inGame.eraser', '橡皮擦')}</span>
                </button>
                <button
                  type="button"
                  onClick={clearStrokes}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-surface-container hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  {t('inGame.clear', '清屏')}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* =========================================================================
          2. DESKTOP VIEW (>= lg: 1024px) - 3-Column Professional Widescreen Layout
         ========================================================================= */}
      <div className="hidden lg:flex w-full h-full flex-col bg-surface overflow-hidden">
        {/* Desktop Top Navbar */}
        <header className="h-14 px-6 bg-surface-container-low border-b border-surface-variant/40 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black">
                🎨
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
              {t('inGame.roundDrawingInfo', { current: currentRound, total: totalRounds, defaultValue: `第 ${currentRound}/${totalRounds} 轮 · 绘画进行中` })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Badge */}
            <div className="flex items-center gap-1.5 bg-secondary-fixed/50 border border-secondary/30 px-3 py-1 rounded-full shadow-xs">
              <span className="material-symbols-outlined text-secondary text-[18px] animate-pulse">
                timer
              </span>
              <span className="font-headline-sm text-base font-black text-secondary">
                {t('inGame.countdownBadge', { time: timeLeft, defaultValue: `${timeLeft}s 倒计时` })}
              </span>
            </div>

            {/* Push to talk indicator / hold space */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-2">
              <span>{voiceMode === 'hold' ? (!isMuted ? '正在讲话...' : '按住空格讲话') : '自由麦模式'}</span>
            </div>

            {/* Audio & Mic Controls */}
            <button
              type="button"
              aria-label={voiceMode === 'hold' ? (!isMuted ? '松开静音' : '按住说话') : (isMuted ? '开麦' : '静音')}
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
                    ? '发言中...'
                    : '按住说话'
                  : isMuted
                  ? t('inGame.micMuted', '麦克风静音')
                  : t('inGame.micOpen', '已开麦')}
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
              <span>{isDeafened ? t('inGame.cancelDeafen', '取消闭音') : t('inGame.deafenMute', '闭音')}</span>
            </button>

            <button
              type="button"
              onClick={handleLeave}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-rose-500/10 hover:text-rose-600 text-xs font-black transition-colors cursor-pointer"
            >
              {t('inGame.exitRoom', '退出房间')}
            </button>
          </div>
        </header>

        {/* Desktop 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column (288px): Players & Scores */}
          <aside className="w-72 bg-surface-container-lowest border-r border-surface-variant/40 flex flex-col justify-between p-4 shrink-0 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-on-surface">{t('inGame.playersLeaderboard', '玩家榜单')}</h4>
                <span className="text-xs font-bold text-muted-foreground">
                  {t('inGame.playersCount', { current: players.length, total: room?.settings?.maxPlayers || 8, defaultValue: `${players.length}/${room?.settings?.maxPlayers || 8}人` })}
                </span>
              </div>

              <div className="space-y-2">
                {players.map((p, idx) => {
                  const scoreItem = scoresMap.get(p.id);
                  const scoreVal = scoreItem?.score ?? p.score;
                  const isSpeaking = speakingUserIds.includes(p.id);
                  const isMe = p.id === userId;
                  const isCurDrawer = p.id === gameState?.drawerId;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                        isCurDrawer
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
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-xs text-on-surface truncate max-w-[90px]">
                              {p.nickname}
                            </span>
                            {isMe && <span className="text-[10px] text-primary font-bold">(我)</span>}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            {scoreItem?.hasGuessedCorrectly ? t('inGame.guessedCorrectly', '✓ 已猜中') : isCurDrawer ? t('inGame.imArtist', '作画中') : t('inGame.imGuessing', '猜词中')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-primary font-mono block">
                          {scoreVal}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{t('inGame.scorePoints', '积分')}</span>
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
              <span>{t('inGame.inviteFriends', { code: roomCode, defaultValue: `+ 邀请好友 (#${roomCode})` })}</span>
            </button>
          </aside>

          {/* Center Column (Flex-1): Canvas Studio */}
          <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
            {/* Center Top Subheader */}
            <div className="h-12 px-6 bg-surface-container-low/90 backdrop-blur-md border-b border-surface-variant/40 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-xs font-black">
                  {t('inGame.drawingWord', '当前作画题目')}
                </span>
                <span className="font-headline-sm text-lg font-black text-on-surface tracking-tight">
                  【 {wordToDraw || t('inGame.waitingWordSelect', '等待选词')} 】
                </span>
                <span className="text-xs text-muted-foreground font-bold">
                  {wordCategory ? `类别: ${wordCategory} · ` : ''}{t('inGame.wordCharsDesktop', { length: wordLength, defaultValue: `${wordLength}个字` })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {hintsLeft > 0 && (
                  <button
                    type="button"
                    onClick={revealHint}
                    className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold hover:bg-amber-500/20 cursor-pointer"
                  >
                    {t('inGame.publishFirstHint', { count: hintsLeft, defaultValue: `公布首字提示 (剩${hintsLeft}次)` })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={rerollWord}
                  disabled={rerollsLeft <= 0 || hasGuessedAnyone}
                  className="px-3 py-1 rounded-xl bg-surface border border-outline-variant/60 hover:bg-surface-variant text-xs font-bold text-on-surface transition-colors cursor-pointer disabled:opacity-40"
                >
                  {t('inGame.changeWordDesktop', { count: rerollsLeft, defaultValue: `换题 (剩${rerollsLeft}次)` })}
                </button>
              </div>
            </div>

            {/* Canvas Stage */}
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
              <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

              <div className="w-full h-full max-w-[800px] max-h-[600px] aspect-[4/3] relative flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden">
                <DrawBoard
                  strokes={strokes}
                  onStrokeUpdate={(s) => addStroke(s)}
                  onStrokeComplete={(s) => addStroke(s)}
                  currentColor={currentColor}
                  currentSize={currentSize}
                  isEraser={isEraser}
                  isDrawer={true}
                  disabled={gameState.status !== 'drawing'}
                  width={800}
                  height={600}
                  className="w-full h-full rounded-2xl border-0"
                />
              </div>
            </div>

            {/* Bottom Toolbar Dock */}
            <footer className="h-16 px-6 bg-surface-container-low border-t border-surface-variant/40 flex items-center justify-between shrink-0 z-20">
              {/* Palette */}
              <div className="flex items-center gap-1.5">
                {desktopColorSwatches.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      setIsEraser(false);
                      setCurrentColor(hex);
                    }}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      !isEraser && currentColor === hex
                        ? 'scale-125 ring-2 ring-primary shadow-sm'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>

              {/* Stroke Size and Eraser/Clear */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-surface-variant/40">
                  {[4, 8, 16, 24].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCurrentSize(size)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentSize === size && !isEraser
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface hover:bg-surface-variant'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEraser((p) => !p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-colors ${
                    isEraser
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'bg-surface border border-outline-variant/60 text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">ink_eraser</span>
                  <span>{t('inGame.eraser', '橡皮擦')}</span>
                </button>

                <button
                  type="button"
                  onClick={undoStroke}
                  disabled={!strokes.length}
                  className="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/60 text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer disabled:opacity-40"
                >
                  {t('inGame.undo', '撤销')}
                </button>

                <button
                  type="button"
                  onClick={clearStrokes}
                  className="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/60 text-xs font-bold hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  {t('inGame.clear', '清屏')}
                </button>
              </div>
            </footer>
          </main>

          {/* Right Column (352px): Danmaku & Chat Stream */}
          <aside className="w-88 bg-surface-container-lowest border-l border-surface-variant/40 flex flex-col justify-between shrink-0 overflow-hidden">
            {/* Tab header */}
            <div className="h-12 px-4 border-b border-surface-variant/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDesktopChatTab('guess')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    desktopChatTab === 'guess'
                      ? 'bg-primary text-on-primary'
                      : 'text-muted-foreground hover:bg-surface-variant'
                  }`}
                >
                  {t('inGame.liveGuessFeed', '实时猜词动态')}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopChatTab('chat')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    desktopChatTab === 'chat'
                      ? 'bg-primary text-on-primary'
                      : 'text-muted-foreground hover:bg-surface-variant'
                  }`}
                >
                  {t('inGame.roomChatTab', '房间聊天')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsDanmakuOn((p) => !p)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer ${
                  isDanmakuOn ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                {isDanmakuOn ? t('inGame.danmakuOn', '弹幕: 开') : t('inGame.danmakuOff', '弹幕: 关')}
              </button>
            </div>

            {/* Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                  {t('inGame.noGuessRecords', '暂无猜词记录，作画后玩家抢答将显示于此')}
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

            {/* Send Danmaku / Chat Bar */}
            <form
              onSubmit={handleSendDanmaku}
              className="p-3 bg-surface-container-low border-t border-surface-variant/40 flex items-center gap-2"
            >
              <input
                type="text"
                value={danmakuInput}
                onChange={(e) => setDanmakuInput(e.target.value)}
                placeholder={t('inGame.sendDanmakuPlaceholder', '发送弹幕互动...')}
                className="flex-1 bg-surface px-3 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!danmakuInput.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-black disabled:opacity-40 cursor-pointer"
              >
                {t('inGame.send', '发送')}
              </button>
            </form>
          </aside>
        </div>
      </div>

      {/* Word Selection Dialog (When status is selecting_word) */}
      {gameState?.status === 'selecting_word' && gameState.wordChoices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface p-6 rounded-3xl border-2 border-primary/40 shadow-2xl space-y-5 text-center">
            <div className="space-y-1">
              <span className="text-xs font-black text-primary uppercase tracking-wider">
                {t('inGame.pickWordSubtitle', '轮到你作画啦！')}
              </span>
              <h3 className="text-2xl font-black text-on-surface">{t('inGame.pickWordTitle', '请选择本回合你要画的词语')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('inGame.pickWordDesc', '选择后题目将对其他玩家隐藏，作画后即可开始抢答！')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {gameState.wordChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => selectWord(choice)}
                  className="py-3 px-4 rounded-2xl bg-primary/10 hover:bg-primary hover:text-white border border-primary/30 text-primary font-black text-base transition-all hover:scale-102 cursor-pointer"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Turn End Summary Overlay */}
      {gameState?.status === 'turn_ended' && gameState.turnSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface p-6 rounded-3xl border-2 border-border shadow-2xl space-y-4 text-center">
            <span className="text-2xl">⏳</span>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-on-surface">{t('inGame.turnEndedTitle', '本轮作画已结束')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('inGame.correctAnswerIs', '正确答案是：')}
                <span className="text-primary font-black text-sm ml-1">
                  【{gameState.turnSummary.secretWord}】
                </span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary text-xs font-bold">
              {t('inGame.drawerEarnedReward', { score: gameState.turnSummary.drawerEarned, defaultValue: `你获得作画奖励: +${gameState.turnSummary.drawerEarned} 分` })}
            </div>
            <p className="text-[11px] text-muted-foreground animate-pulse">{t('inGame.preparingNextRound', '正在准备下一轮...')}</p>
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
        currentDrawerNickname={nickname}
        isDrawer={true}
      />
    </div>
  );
};
