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
import { useVoiceLabels } from '../hooks/useVoiceLabels';

export const InGameDrawerPage: React.FC = () => {
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
  const colorInputRef = useRef<HTMLInputElement | null>(null);

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

  // Loading state
  if (!room || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4 select-none">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <h2 className="text-xl font-bold text-on-surface">{t('inGame.loadingRoom', '正在同步游戏状态...')}</h2>
        <p className="text-xs text-outline">{t('inGame.loadingHint', '如果长时间未加载，请尝试返回大厅')}</p>
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            navigate('/lobby');
          }}
          className="px-4 py-2 rounded-full bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
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
  const hasGuessedAnyone = gameState.scores?.some((s) => s.hasGuessedCorrectly) ?? false;
  const players = room.players || [];
  const scoresMap = new Map(gameState.scores?.map((s) => [s.playerId, s]) || []);

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

  const handleSendEmoji = (emoji: string) => {
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

  // Latest guess message for mobile ticker
  const latestGuessMessage = messages.filter((m) => !m.payload.isDanmaku).slice(-1)[0];
  // Accurate current-turn correct guessers from gameState.scores (strictly current round, not historical messages)
  const currentTurnCorrectPlayers = gameState.scores?.filter((s) => s.hasGuessedCorrectly && s.playerId !== gameState.drawerId) || [];
  const latestCorrectPlayer = [...currentTurnCorrectPlayers].sort((a, b) => (b.guessRank ?? 0) - (a.guessRank ?? 0))[0];

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-on-surface select-none font-body-md antialiased flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''
      }`}
    >
      {/* Hidden Color Picker Input */}
      <input
        ref={colorInputRef}
        type="color"
        value={currentColor}
        onChange={(e) => {
          setIsEraser(false);
          setCurrentColor(e.target.value);
        }}
        className="hidden"
      />

      {/* =========================================================================
          1. MOBILE VIEWPORT CONTAINER (< lg: 1024px) - 100% Match to playhub_draw_guess_fullscreen
         ========================================================================= */}
      <div className="lg:hidden w-full h-full flex justify-center items-start overflow-hidden">
        <div
          className={`w-full ${
            isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'
          } flex flex-col justify-between bg-surface relative overflow-hidden shadow-2xl`}
        >
          {/* 1. COMPACT TOP STATUS BAR (STREAMLINED) */}
          <header className="pt-2 px-3 pb-1 bg-surface shrink-0 z-20">
            {/* Row 1: Back + Room Info + Timer + Voice Pill + Mode Toggle */}
            <div className="flex items-center justify-between gap-1.5 h-11">
              {/* Left: Exit + Room Round Info */}
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

              {/* Center: Compact Timer Pill */}
              <div className="flex items-center gap-1.5 bg-secondary-fixed/50 border border-secondary/20 px-2.5 py-1 rounded-full shadow-xs">
                <span className="material-symbols-outlined text-secondary text-[16px] animate-pulse">
                  timer
                </span>
                <span className="font-headline-sm text-[14px] font-black text-secondary tracking-tight leading-none">
                  {timeLeft}s
                </span>
              </div>

              {/* Right: Voice + Fullscreen Toggle Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsChatDrawerOpen(true)}
                  className="tactile-btn flex items-center gap-1 bg-surface-container text-on-surface px-2 py-1 rounded-full cursor-pointer"
                  title={t('voice.channel', '语音频道')}
                >
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      voiceStatus === 'connected' ? 'text-tertiary-container animate-bounce' : 'text-outline'
                    }`}
                  >
                    {voiceStatus === 'connected' ? 'mic' : voiceStatus === 'connecting' ? 'hourglass_top' : 'mic_off'}
                  </span>
                  <span className="font-label-sm text-[11px] font-bold">
                    {voiceStatus === 'connected'
                      ? speakingUserIds.length > 0
                        ? t('inGame.speakingCount', { count: speakingUserIds.length, defaultValue: `${speakingUserIds.length}人说话` })
                        : t('inGame.voiceConnected', '已连麦')
                      : voiceStatus === 'connecting'
                      ? t('voice.connecting', '连接中...')
                      : t('voice.channel', '语音')}
                  </span>
                </button>
                {/* Fullscreen Mode Switcher */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="tactile-btn flex items-center gap-1 bg-primary text-on-primary px-2.5 py-1 rounded-full shadow-sm hover:bg-primary-container cursor-pointer"
                  title={t('inGame.fullscreenBoard', '全屏画板')}
                >
                  <span
                    className="material-symbols-outlined text-[15px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    fullscreen
                  </span>
                  <span className="font-label-sm text-[11px] font-extrabold">{t('inGame.fullscreenBoard', '全屏画板')}</span>
                </button>
              </div>
            </div>

            {/* Row 2: Streamlined Secret Word Card + Floating Horizontal Player Avatars Strip */}
            <div className="mt-1 flex items-center justify-between gap-2">
              {/* Secret Word Pill (Drawer's Target Word) */}
              <div className="flex-1 bg-surface-container-low border border-surface-container rounded-xl px-2.5 py-1.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="material-symbols-outlined text-primary text-[17px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    visibility
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant font-bold shrink-0">
                    词条:
                  </span>
                  <span className="font-headline-sm text-[14px] font-black text-primary tracking-wide truncate">
                    【 {wordToDraw || t('inGame.waitingWordSelect', '等待选词')} 】
                  </span>
                  {wordLength > 0 && (
                    <span className="font-label-sm text-[10px] text-outline px-1.5 py-0.2 rounded-full bg-surface-container-highest shrink-0">
                      {t('inGame.wordChars', { length: wordLength, defaultValue: `${wordLength}字` })}
                    </span>
                  )}
                </div>
                {/* Reroll button */}
                <button
                  type="button"
                  onClick={rerollWord}
                  disabled={rerollsLeft <= 0 || hasGuessedAnyone}
                  className="tactile-btn shrink-0 flex items-center gap-0.5 bg-surface-container-highest text-primary hover:bg-primary hover:text-on-primary px-2 py-0.5 rounded-full font-label-sm text-[10px] transition-colors cursor-pointer disabled:opacity-40"
                  title={`换词 (剩${rerollsLeft}次)`}
                >
                  <span className="material-symbols-outlined text-[12px]">autorenew</span>
                  <span>{t('inGame.reroll', '换词')}</span>
                </button>
              </div>

              {/* Compact Floating Players Bubbles */}
              <div className="flex items-center gap-1 bg-surface-container-low border border-surface-container rounded-xl px-2 py-1 shrink-0">
                {players.map((p, idx) => {
                  const isMe = p.id === userId;
                  const scoreItem = scoresMap.get(p.id);
                  const isSpeaking = speakingUserIds.includes(p.id);
                  const isCurDrawer = p.id === gameState.drawerId;

                  return (
                    <div
                      key={p.id}
                      className="relative"
                      title={`${p.nickname} (${scoreItem?.score ?? p.score}分)`}
                    >
                      <img
                        className={`w-6 h-6 rounded-full object-cover ${
                          isMe
                            ? 'ring-2 ring-primary'
                            : idx === 0
                            ? 'ring-2 ring-amber-400'
                            : 'ring-1 ring-surface-variant'
                        } ${isSpeaking ? 'scale-110' : ''}`}
                        alt={p.nickname}
                        src={p.avatar}
                      />
                      {isCurDrawer && (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center font-bold">
                          画
                        </span>
                      )}
                      {idx === 0 && !isCurDrawer && (
                        <span className="absolute -top-1 -right-1 text-[9px] leading-none">👑</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </header>

          {/* 2. MAXIMIZED CANVAS IN ERGONOMIC GOLDEN REACH ZONE + FLOATING DANMAKU */}
          <main className="flex-1 px-3 flex flex-col justify-start min-h-[380px] relative z-10 pt-1 pb-1">
            <div className="w-full flex-1 bg-surface-container-lowest rounded-2xl canvas-border-active relative border border-primary/30 flex flex-col overflow-hidden shadow-lg select-none">
              {/* Top Action Floating Controls (Canvas Header Bar) */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto z-30">
                {/* Drawer Status Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm border border-surface-container text-on-surface">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span className="font-label-sm text-[11px] text-on-surface font-extrabold">
                    {t('inGame.goldenReachZone', '你的画板 · 黄金触控区')}
                  </span>
                </div>
                {/* Quick Editing Tools: Undo, Redo, Clear Screen & Fullscreen Expand button */}
                <div className="flex items-center gap-1 bg-surface-container-lowest/95 backdrop-blur-md p-1 rounded-full shadow-md border border-surface-container">
                  <button
                    type="button"
                    onClick={undoStroke}
                    disabled={!strokes.length || gameState.status !== 'drawing'}
                    className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                    title={t('inGame.undo', '撤销 (Undo)')}
                    aria-label={t('inGame.undo', '撤销')}
                  >
                    <span className="material-symbols-outlined text-[19px]">undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={redoStroke}
                    disabled={gameState.status !== 'drawing'}
                    className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                    title={t('inGame.redo', '重做 (Redo)')}
                    aria-label={t('inGame.redo', '重做')}
                  >
                    <span className="material-symbols-outlined text-[19px]">redo</span>
                  </button>
                  <div className="w-px h-4 bg-outline-variant my-auto"></div>
                  <button
                    type="button"
                    onClick={clearStrokes}
                    disabled={gameState.status !== 'drawing'}
                    className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-secondary-fixed transition-colors disabled:opacity-40 cursor-pointer"
                    title={t('inGame.clear', '清屏 (Clear)')}
                    aria-label={t('inGame.clear', '清屏')}
                  >
                    <span className="material-symbols-outlined text-[19px]">delete_sweep</span>
                  </button>
                  <div className="w-px h-4 bg-outline-variant my-auto"></div>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-primary bg-primary-fixed hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    title={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenBoard', '全屏画板')}
                    aria-label={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenBoard', '全屏画板')}
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                  </button>
                </div>
              </div>

              {/* Floating Danmaku Overlay lanes */}
              <div className="absolute top-12 left-0 right-0 h-28 pointer-events-none z-20 overflow-hidden flex flex-col justify-start gap-2 pt-1 px-3">
                {latestCorrectPlayer && (
                  <div className="danmaku-badge self-start flex items-center gap-1.5 bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full shadow-lg border border-white/20 transform -translate-x-1">
                    <span
                      className="material-symbols-outlined text-[15px] animate-bounce"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      celebration
                    </span>
                    <span className="font-label-sm text-[12px] font-black">
                      {latestCorrectPlayer.nickname} {t('inGame.guessedCorrectlyShort', '猜中了！')}
                    </span>
                    <span className="bg-white/25 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                      {latestCorrectPlayer.guessRank ? `#${latestCorrectPlayer.guessRank}` : '✓'}
                    </span>
                  </div>
                )}
              </div>

              <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

              {/* The Drawing Canvas Surface */}
              <div className="w-full h-full relative flex items-center justify-center bg-white cursor-crosshair">
                {/* Grid Dots Guideline Texture */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413FD6 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

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
                  className="w-full h-full rounded-2xl border-0 shadow-none"
                />
              </div>

              {/* Canvas Bottom Info Bar */}
              <div className="bg-surface-container-low/90 backdrop-blur-sm px-3 py-1 flex items-center justify-between border-t border-surface-container text-on-surface-variant z-10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">touch_app</span>
                  <span className="font-label-sm text-[11px] font-bold text-on-surface">
                    {t('inGame.goldenReachReady', '大拇指黄金触控区已就绪')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] text-outline">{t('inGame.strokesSyncing', '笔画实时同步')}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
              </div>
            </div>
          </main>

          {/* 3. ERGONOMIC LOWER TOOLBAR & COLOR PALETTE */}
          <div className="px-3 py-0.5 bg-surface shrink-0 z-20">
            <div className="bg-surface-container-low/90 border border-surface-container rounded-full px-2.5 py-1 shadow-xs flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="material-symbols-outlined text-primary text-[14px] shrink-0">forum</span>
                <div className="flex items-center gap-1 text-[11px] min-w-0 truncate">
                  {latestGuessMessage ? (
                    <>
                      <span className="font-bold text-primary shrink-0">
                        {latestGuessMessage.payload.senderNickname}:
                      </span>
                      <span className="text-on-surface truncate">
                        {latestGuessMessage.payload.content}
                      </span>
                    </>
                  ) : (
                    <span className="text-outline">暂无新消息，画出精彩一笔吧！</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(true)}
                className="tactile-btn shrink-0 flex items-center gap-0.5 text-[10px] text-outline hover:text-primary px-1.5 py-0.5 rounded-full bg-surface-container font-semibold transition-colors cursor-pointer"
                title="展开完整互动消息"
              >
                <span className="text-[10px]">{messages.length}条</span>
                <span className="material-symbols-outlined text-[12px]">expand_less</span>
              </button>
            </div>
          </div>

          <section className="px-3 pb-2 pt-1 bg-surface shrink-0 z-30">
            <div className="bg-surface-container-lowest rounded-2xl p-2.5 border border-surface-container canvas-shadow flex flex-col gap-2">
              {/* Palette Swatches */}
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {mobileColorSwatches.map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => {
                      setIsEraser(false);
                      setCurrentColor(item.color);
                    }}
                    className={`tactile-btn w-7 h-7 rounded-full shrink-0 shadow-xs relative flex items-center justify-center cursor-pointer ${
                      item.border ? 'border-2 border-outline-variant' : ''
                    } ${
                      !isEraser && currentColor === item.color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.title}
                  >
                    {!isEraser && currentColor === item.color && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.color === '#FFFFFF' ? 'bg-primary' : 'bg-white'
                        }`}
                      />
                    )}
                  </button>
                ))}
                {/* Color Wheel Picker */}
                <button
                  type="button"
                  onClick={() => colorInputRef.current?.click()}
                  className="tactile-btn w-7 h-7 rounded-full bg-gradient-to-tr from-pink-400 via-indigo-500 to-teal-300 flex items-center justify-center text-white shrink-0 shadow-sm cursor-pointer"
                  title="更多色彩"
                >
                  <span className="material-symbols-outlined text-[14px]">palette</span>
                </button>
              </div>

              {/* Core Tools Row: Pen, Eraser, Fill Bucket/Clear, Brush Size */}
              <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                {/* Tools Cluster */}
                <div className="flex items-center gap-1.5">
                  {/* Pencil */}
                  <button
                    type="button"
                    onClick={() => setIsEraser(false)}
                    className={`tactile-btn flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-[12px] shadow-sm cursor-pointer ${
                      !isEraser
                        ? 'bg-primary text-on-primary font-black'
                        : 'bg-surface-container text-on-surface'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ fontVariationSettings: !isEraser ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      edit
                    </span>
                    <span>{t('inGame.penTool', '画笔')}</span>
                  </button>

                  {/* Eraser */}
                  <button
                    type="button"
                    onClick={() => setIsEraser(true)}
                    className={`tactile-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full font-label-sm text-[12px] cursor-pointer transition-colors ${
                      isEraser
                        ? 'bg-secondary text-on-secondary font-black shadow-sm'
                        : 'bg-surface-container text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">ink_eraser</span>
                    <span>{t('inGame.eraserTool', '橡皮')}</span>
                  </button>
                </div>

                {/* Stroke Width Multi-toggle */}
                <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full">
                  {[
                    { size: 4, title: '细笔触', dotClass: 'w-1.5 h-1.5' },
                    { size: 8, title: '中笔触', dotClass: 'w-2.5 h-2.5' },
                    { size: 16, title: '粗笔触', dotClass: 'w-3.5 h-3.5' },
                  ].map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setCurrentSize(s.size)}
                      className={`tactile-btn w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                        currentSize === s.size && !isEraser
                          ? 'text-primary ring-2 ring-primary bg-surface-container-lowest'
                          : 'text-outline hover:text-on-surface'
                      }`}
                      title={s.title}
                    >
                      <span className={`${s.dotClass} rounded-full bg-current`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. BOTTOM ACTION FOOTER: QUICK HINT, EMOJI & PUSH-TO-TALK */}
          <footer className="bg-surface-container-lowest px-3 pt-1.5 pb-3 border-t border-surface-container shadow-md z-30 shrink-0">
            <div className="flex flex-col gap-1.5">
              {/* Danmaku Input */}
              <form
                onSubmit={handleSendDanmaku}
                className="flex items-center gap-1.5 bg-surface-container-low border border-surface-container rounded-full px-2 py-1 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => handleSendEmoji('🎨')}
                  className="tactile-btn w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0 cursor-pointer"
                  title="常用短语与表情"
                >
                  <span className="material-symbols-outlined text-[18px]">sentiment_satisfied</span>
                </button>
                <input
                  type="text"
                  value={danmakuInput}
                  onChange={(e) => setDanmakuInput(e.target.value)}
                  placeholder="发弹幕互动...（画手禁发答案）"
                  className="flex-1 bg-transparent border-0 text-on-surface placeholder:text-outline font-body-sm text-[12px] p-0 focus:ring-0 focus:outline-none truncate"
                />
                <button
                  type="submit"
                  disabled={!danmakuInput.trim()}
                  className="tactile-btn w-7 h-7 rounded-full bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                  title="发送弹幕"
                >
                  <span className="material-symbols-outlined text-[15px]">send</span>
                </button>
              </form>

              {/* Bottom Buttons Row: Hint + Emojis + PTT */}
              <div className="flex items-center justify-between gap-1.5">
                {/* Hint Button */}
                {hintsLeft > 0 && (
                  <button
                    type="button"
                    onClick={revealHint}
                    className="tactile-btn shrink-0 flex items-center gap-1 bg-surface-container-high text-primary hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-full font-label-sm text-[11px] transition-colors cursor-pointer"
                    title={`公布线索提示 (剩${hintsLeft}次)`}
                  >
                    <span
                      className="material-symbols-outlined text-[15px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      lightbulb
                    </span>
                    <span className="font-extrabold">提示</span>
                  </button>
                )}

                {/* Quick Reaction Emojis */}
                <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-full border border-surface-container">
                  {['👏', '😂', '🔥', '💡'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleSendEmoji(em)}
                      className="tactile-btn w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-[13px] cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>

                {/* Push-to-Talk Mic Button */}
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
                  className={`tactile-btn flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-full shadow-sm font-label-md text-[13px] font-black cursor-pointer select-none touch-none ${
                    !isMuted
                      ? 'bg-emerald-600 text-white shadow-md animate-pulse'
                      : 'bg-primary hover:bg-primary-container text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {!isMuted ? 'mic' : 'mic_none'}
                  </span>
                  <span>
                    {voiceMode === 'hold'
                      ? !isMuted
                        ? t('voice.releaseToMute', '松开发言')
                        : t('voice.holdToTalk', '按住说话')
                      : isMuted
                      ? t('voice.unmute', '开麦')
                      : t('voice.mute', '静音')}
                  </span>
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* =========================================================================
          2. DESKTOP VIEWPORT CONTAINER (>= lg: 1024px) - PlayHub Responsive Grid
         ========================================================================= */}
      <div className="hidden lg:flex flex-col w-full h-full bg-surface overflow-hidden">
        {/* DESKTOP TOP BAR / GAME HUD */}
        <header className="w-full bg-surface-container-lowest px-6 py-2.5 border-b border-surface-container shadow-xs flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black">
                🎨
              </div>
              <span className="font-headline-sm text-lg font-black text-on-surface">PlayHub</span>
            </div>
            <div className="h-4 w-[1px] bg-outline-variant/60"></div>

            {/* Room Tag Chip */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="tactile-btn flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant cursor-pointer"
              title="点击复制房号"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">tag</span>
              <span className="font-label-sm text-xs font-bold tracking-tight">
                #{roomCode} {copiedCode ? '✓' : ''}
              </span>
            </button>

            <span className="text-xs font-label-sm px-3 py-1 rounded-full bg-surface-container-high text-primary font-bold">
              第 {currentRound}/{totalRounds} 轮 · 绘画进行中
            </span>

            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-primary font-bold text-xs">
              <span className="material-symbols-outlined text-[15px]">edit</span>
              <span>灵魂画手</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer Badge */}
            <div className="flex items-center gap-2 bg-error-container text-secondary font-black px-3 py-1 rounded-full shadow-xs">
              <span className="material-symbols-outlined text-[18px] animate-pulse">timer</span>
              <span className="font-headline-sm text-sm">{timeLeft}s 倒计时</span>
            </div>

            {/* Push to talk voice button */}
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
              className={`tactile-btn px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors select-none touch-none cursor-pointer ${
                !isMuted
                  ? 'bg-emerald-600 text-white shadow-sm animate-pulse'
                  : 'bg-surface-container text-on-surface hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {!isMuted ? 'mic' : 'mic_off'}
              </span>
              <span>
                {voiceMode === 'hold'
                  ? !isMuted
                    ? t('voice.speakingNow', '发言中...')
                    : t('voice.holdToTalk', '按住说话 (Space)')
                  : isMuted
                  ? t('voice.unmute', '开麦')
                  : t('voice.mute', '静音')}
              </span>
            </button>

            {/* Direct Voice Mode Switcher (Hold to Talk vs Open Mic) */}
            <button
              type="button"
              onClick={() => setVoiceMode(voiceMode === 'hold' ? 'open' : 'hold')}
              aria-label={voiceMode === 'hold' ? t('voice.modeOpenAria', '切换到自由麦模式') : t('voice.modeHoldAria', '切换到按住说话模式')}
              title={voiceMode === 'hold' ? t('voice.modeOpenAria', '切换到自由麦模式') : t('voice.modeHoldAria', '切换到按住说话模式')}
              className="tactile-btn px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-xs font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">
                {voiceMode === 'hold' ? 'touch_app' : 'campaign'}
              </span>
              <span>{voiceMode === 'hold' ? t('voice.modeHold', '按住说话') : t('voice.modeOpen', '自由麦')}</span>
            </button>

            {/* Room Chat & Voice Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsChatDrawerOpen(true)}
              aria-label={t('voice.roomChatTitle', '房间交流')}
              title={t('voice.roomChatTitle', '房间交流')}
              className="tactile-btn relative p-2 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">forum</span>
              {messages.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-secondary"></span>
              )}
            </button>

            {/* Deafen toggle */}
            <button
              type="button"
              onClick={toggleDeafen}
              aria-label={isDeafened ? t('voice.undeafen', '取消闭音') : t('voice.deafen', '闭音')}
              className={`tactile-btn p-2 rounded-full border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                isDeafened
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                  : 'bg-surface-container text-muted-foreground border-outline-variant/50'
              }`}
              title={isDeafened ? t('voice.undeafen', '取消闭音') : t('voice.deafen', '闭音')}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDeafened ? 'volume_off' : 'volume_up'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsDanmakuOn((prev) => !prev)}
              className={`tactile-btn px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                isDanmakuOn ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-outline'
              }`}
            >
              {isDanmakuOn ? t('inGame.danmakuOn', '弹幕: 开') : t('inGame.danmakuOff', '弹幕: 关')}
            </button>

            <button
              type="button"
              onClick={handleLeave}
              className="tactile-btn px-3 py-1.5 rounded-full bg-error-container text-error text-xs font-bold hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              {t('inGame.exitRoom', '退出房间')}
            </button>
          </div>
        </header>

        {/* Subheader: Target Word Pill + Reroll + Hint */}
        <div className="w-full bg-surface-container-low px-6 py-2 border-b border-surface-container flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-extrabold">
              {t('inGame.drawingWord', '当前作画题目')}
            </span>
            <span className="font-headline-sm text-lg font-black text-primary tracking-wide">
              【 {wordToDraw || t('inGame.waitingWordSelect', '等待选词')} 】
            </span>
            <span className="text-xs font-bold text-outline">
              {wordCategory ? `${t('inGame.hintCategory', '提示分类')}: ${wordCategory} · ` : ''}
              {t('inGame.wordCharsDesktop', { length: wordLength || (wordToDraw ? wordToDraw.length : 0), defaultValue: `${wordLength || (wordToDraw ? wordToDraw.length : 0)}个字` })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hintsLeft > 0 && (
              <button
                type="button"
                onClick={revealHint}
                className="tactile-btn px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold hover:bg-amber-500/20 cursor-pointer"
              >
                {t('inGame.publishFirstHint', { count: hintsLeft, defaultValue: `公布首字提示 (剩${hintsLeft}次)` })}
              </button>
            )}
            <button
              type="button"
              onClick={rerollWord}
              disabled={rerollsLeft <= 0 || hasGuessedAnyone}
              className="tactile-btn px-3 py-1.5 rounded-full bg-surface border border-outline-variant/60 hover:bg-surface-variant text-xs font-bold text-on-surface transition-colors cursor-pointer disabled:opacity-40"
            >
              {t('inGame.changeWordDesktop', { count: rerollsLeft, defaultValue: `换题 (剩${rerollsLeft}次)` })}
            </button>
          </div>
        </div>

        {/* DESKTOP BODY 12-COLUMN FLUID CONTAINER (max 1440px) */}
        <div className="flex-1 max-w-[1440px] w-full mx-auto flex gap-4 p-4 min-h-0 overflow-hidden">
          {/* LEFT / CENTER COLUMN (Canvas + Palette) */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden">
            {/* Maximized Canvas Card */}
            <section className="flex-1 bg-surface-container-lowest rounded-2xl border border-primary/30 canvas-border-active canvas-shadow flex flex-col justify-between overflow-hidden relative min-h-[360px]">
              {/* Canvas Header Floating Controls */}
              <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-30 pointer-events-auto">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm border border-surface-container text-on-surface">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span className="font-label-sm text-xs font-black">{t('inGame.goldenReachZone', '你的画板 · 黄金触控区')}</span>
                </div>

                {/* Edit cluster: Undo, Redo, Clear, Fullscreen */}
                <div className="flex items-center gap-1.5 bg-surface-container-lowest/95 backdrop-blur-md p-1 rounded-full shadow-md border border-surface-container">
                  <button
                    type="button"
                    onClick={undoStroke}
                    disabled={!strokes.length || gameState.status !== 'drawing'}
                    className="tactile-btn px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-surface-container disabled:opacity-40 cursor-pointer"
                    title={t('inGame.undo', '撤销')}
                    aria-label={t('inGame.undo', '撤销')}
                  >
                    <span className="material-symbols-outlined text-[16px]">undo</span>
                    <span>{t('inGame.undo', '撤销')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={redoStroke}
                    disabled={gameState.status !== 'drawing'}
                    className="tactile-btn px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-surface-container disabled:opacity-40 cursor-pointer"
                    title={t('inGame.redo', '重做')}
                    aria-label={t('inGame.redo', '重做')}
                  >
                    <span className="material-symbols-outlined text-[16px]">redo</span>
                    <span>{t('inGame.redo', '重做')}</span>
                  </button>
                  <div className="w-px h-4 bg-outline-variant my-auto"></div>
                  <button
                    type="button"
                    onClick={clearStrokes}
                    disabled={gameState.status !== 'drawing'}
                    className="tactile-btn px-2.5 py-1 rounded-full text-xs font-bold text-secondary hover:bg-secondary-fixed disabled:opacity-40 cursor-pointer"
                    title={t('inGame.clear', '清屏')}
                    aria-label={t('inGame.clear', '清屏')}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    <span>{t('inGame.clear', '清屏')}</span>
                  </button>
                  <div className="w-px h-4 bg-outline-variant my-auto"></div>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="tactile-btn p-1.5 rounded-full text-primary bg-primary-fixed hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    title={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenBoard', '全屏画板')}
                    aria-label={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenBoard', '全屏画板')}
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_full</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChatDrawerOpen(true)}
                    className="tactile-btn p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    title={t('voice.roomChatTitle', '房间交流')}
                    aria-label={t('voice.roomChatTitle', '房间交流')}
                  >
                    <span className="material-symbols-outlined text-[16px]">forum</span>
                  </button>
                </div>
              </div>

              {/* Danmaku Barrage */}
              <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

              {/* Real Drawing Canvas Area */}
              <div className="w-full flex-1 relative flex items-center justify-center bg-white overflow-hidden min-h-[300px]">
                {/* Subtle Grid Dots */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413FD6 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Floating Correct Guess Celebration Badge */}
                {latestCorrectPlayer && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white px-5 py-2 rounded-full text-sm font-black shadow-xl flex items-center gap-2 animate-bounce pointer-events-none border border-white/20">
                    <span className="material-symbols-outlined text-[18px]">celebration</span>
                    <span>{latestCorrectPlayer.nickname} {t('inGame.guessedCorrectlyShort', '猜中了！')}</span>
                    <span className="bg-white/25 text-xs px-2 py-0.5 rounded-full font-mono">
                      {latestCorrectPlayer.guessRank ? `#${latestCorrectPlayer.guessRank}` : '✓'}
                    </span>
                  </div>
                )}

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
                  className="w-full h-full aspect-[4/3] max-w-[800px] max-h-[600px] rounded-xl border-0 shadow-none"
                />
              </div>

              {/* Canvas Bottom Info Bar */}
              <div className="bg-surface-container-low px-4 py-1.5 flex items-center justify-between border-t border-surface-container text-xs text-on-surface-variant shrink-0">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
                  <span>触控画板已就绪 · 完美还原笔触</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-outline">笔画实时广播中</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
              </div>
            </section>

            {/* Bottom Toolbar & Color Palette */}
            <footer className="bg-surface-container-lowest p-3 rounded-2xl border border-surface-container shadow-xs flex items-center justify-between gap-4 shrink-0">
              {/* Palette */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {desktopColorSwatches.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      setIsEraser(false);
                      setCurrentColor(hex);
                    }}
                    className={`tactile-btn w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      hex === '#FFFFFF' ? 'border border-outline-variant' : ''
                    } ${
                      !isEraser && currentColor === hex
                        ? 'scale-125 ring-2 ring-primary shadow-sm'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {/* Color Wheel */}
                <button
                  type="button"
                  onClick={() => colorInputRef.current?.click()}
                  className="tactile-btn w-6 h-6 rounded-full bg-gradient-to-tr from-pink-400 via-indigo-500 to-teal-300 flex items-center justify-center text-white shrink-0 shadow-sm cursor-pointer ml-1"
                  title="自定义取色器"
                >
                  <span className="material-symbols-outlined text-[13px]">palette</span>
                </button>
              </div>

              {/* Tools & Stroke Widths */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsEraser(false)}
                    className={`tactile-btn px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      !isEraser
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>{t('inGame.penTool', '画笔')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEraser(true)}
                    className={`tactile-btn px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      isEraser
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">ink_eraser</span>
                    <span>{t('inGame.eraserTool', '橡皮')}</span>
                  </button>
                </div>

                {/* Stroke Sizes */}
                <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl">
                  {[4, 8, 16, 24].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCurrentSize(size)}
                      className={`tactile-btn px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentSize === size && !isEraser
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface hover:bg-surface-variant'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            </footer>
          </div>

          {/* RIGHT COLUMN (Player Seats & Live Guess/Chat Stream) */}
          <div className="w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Player Leaderboard */}
            <section className="bg-surface-container-lowest rounded-2xl p-3 border border-surface-container shadow-xs flex flex-col shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-secondary-container">
                    leaderboard
                  </span>
                  <span className="font-label-sm text-sm font-bold text-on-surface">{t('inGame.leaderboard', '实时积分榜')}</span>
                </div>
                <span className="text-xs text-outline font-bold">
                  {players.filter((p) => p.isOnline).length}/{room.settings?.maxPlayers || 8} {t('inGame.playersOnline', '人在线')}
                </span>
              </div>

              <div className="max-h-[180px] overflow-y-auto space-y-1.5 pt-2 custom-scroll">
                {players.map((p, idx) => {
                  const isSpeaking = speakingUserIds.includes(p.id);
                  const scoreItem = scoresMap.get(p.id);
                  const scoreVal = scoreItem?.score ?? p.score;
                  const isMe = p.id === userId;
                  const isCurDrawer = p.id === gameState.drawerId;
                  const hasCorrect = scoreItem?.hasGuessedCorrectly;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all ${
                        isCurDrawer
                          ? 'bg-primary-fixed/50 border-primary/30'
                          : hasCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : isMe
                          ? 'bg-surface-container border-primary-container'
                          : 'bg-surface-container-low border-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold overflow-hidden shrink-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.nickname} className="w-full h-full object-cover" />
                          ) : (
                            p.nickname.slice(0, 1)
                          )}
                          {isCurDrawer && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-secondary-container text-on-primary flex items-center justify-center text-[8px]">
                              🎨
                            </span>
                          )}
                          {hasCorrect && !isCurDrawer && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center text-[8px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-label-sm text-xs font-bold text-on-surface truncate max-w-[100px]">
                              {p.nickname}
                            </span>
                            {isMe && <span className="text-[10px] text-primary font-bold">(你)</span>}
                            {idx === 0 && <span className="text-[10px]">👑</span>}
                          </div>
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            {isCurDrawer ? '作画中' : hasCorrect ? '✓ 已猜对' : '猜词中'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-sm text-primary font-mono block">{scoreVal}</span>
                        <span className="text-[9px] text-outline font-medium">积分</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Live Guess & Room Chat Stream Card */}
            <section className="flex-1 bg-surface-container-lowest rounded-2xl p-3 border border-surface-container shadow-xs flex flex-col justify-between overflow-hidden min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDesktopChatTab('guess')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      desktopChatTab === 'guess'
                        ? 'bg-primary text-on-primary'
                        : 'text-outline hover:bg-surface-container'
                    }`}
                  >
                    实时猜词动态
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopChatTab('chat')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      desktopChatTab === 'chat'
                        ? 'bg-primary text-on-primary'
                        : 'text-outline hover:bg-surface-container'
                    }`}
                  >
                    房间聊天
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-outline">画手禁剧透</span>
                  <button
                    type="button"
                    onClick={() => setIsChatDrawerOpen(true)}
                    className="tactile-btn p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    title={t('voice.roomChatTitle', '房间交流')}
                    aria-label={t('voice.roomChatTitle', '房间交流')}
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 custom-scroll text-xs">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-outline font-medium">
                    暂无猜词记录，作画后玩家抢答将显示于此
                  </div>
                ) : (
                  messages.map((m) => {
                    const isCorrect = m.payload.type === 'correct_guess';
                    const isMe = m.senderId === userId;
                    const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    if (isCorrect) {
                      return (
                        <div
                          key={m.payload.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim text-on-tertiary-fixed font-medium"
                        >
                          <span className="text-base">🎉</span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="font-bold">{m.payload.senderNickname}</span>
                            <span>{t('inGame.guessedCorrectly', '猜中了正确答案！')}</span>
                          </div>
                          <span className="font-black text-tertiary px-1.5 py-0.5 rounded-md bg-tertiary-fixed/40">
                            ✓
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={m.payload.id} className="flex items-start gap-1.5">
                        <span
                          className={`font-bold shrink-0 ${isMe ? 'text-primary' : 'text-on-surface-variant'}`}
                        >
                          {m.payload.senderNickname} {isMe ? '(你)' : ''}:
                        </span>
                        <div className="flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface font-body-sm text-xs">
                          <span>{m.payload.content}</span>
                          {m.payload.isDanmaku ? (
                            <span className="text-secondary font-bold text-[10px] flex items-center">
                              <span className="material-symbols-outlined text-[12px]">chat</span>
                            </span>
                          ) : (
                            <span className="text-error font-bold text-[10px] flex items-center">
                              <span className="material-symbols-outlined text-[12px]">close</span> 不对
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-outline ml-auto self-center">{timeStr}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Danmaku Input Bar */}
              <form
                onSubmit={handleSendDanmaku}
                className="pt-2 border-t border-surface-container-high/60 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={danmakuInput}
                  onChange={(e) => setDanmakuInput(e.target.value)}
                  placeholder={t('inGame.danmakuPlaceholderDrawer', '发弹幕互动...（画手禁发答案）')}
                  className="flex-1 bg-surface-container-low px-3 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!danmakuInput.trim()}
                  className="tactile-btn px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-black disabled:opacity-40 cursor-pointer"
                >
                  {t('inGame.send', '发送')}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>

      {/* Word Selection Dialog (When status is selecting_word) */}
      {gameState.status === 'selecting_word' && gameState.wordChoices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface p-6 rounded-3xl border-2 border-primary/40 shadow-2xl space-y-5 text-center">
            <div className="space-y-1">
              <span className="text-xs font-black text-primary uppercase tracking-wider">
                {t('inGame.pickWordSubtitle', '轮到你作画啦！')}
              </span>
              <h3 className="text-2xl font-black text-on-surface">
                {t('inGame.pickWordTitle', '请选择本回合你要画的词语')}
              </h3>
              <p className="text-xs text-outline">
                {t('inGame.pickWordDesc', '选择后题目将对其他玩家隐藏，作画后即可开始抢答！')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {gameState.wordChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => selectWord(choice)}
                  className="tactile-btn py-3 px-4 rounded-2xl bg-primary/10 hover:bg-primary hover:text-white border border-primary/30 text-primary font-black text-base transition-all cursor-pointer"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Turn End Summary Overlay */}
      {gameState.status === 'turn_ended' && gameState.turnSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface p-6 rounded-3xl border-2 border-border shadow-2xl space-y-4 text-center">
            <span className="text-3xl">🎉</span>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-on-surface">{t('inGame.turnEndedTitle', '本轮作画已结束')}</h4>
              <p className="text-xs text-outline">
                {t('inGame.correctAnswerIs', '正确答案是：')}
                <span className="text-primary font-black text-base ml-1">
                  【{gameState.turnSummary.secretWord}】
                </span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary text-xs font-bold">
              {t('inGame.drawerEarnedReward', {
                score: gameState.turnSummary.drawerEarned,
                defaultValue: `你获得作画奖励: +${gameState.turnSummary.drawerEarned} 分`,
              })}
            </div>
            <p className="text-[11px] text-outline animate-pulse">
              {t('inGame.preparingNextRound', '正在准备下一轮...')}
            </p>
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
        labels={chatDrawerLabels}
      />
    </div>
  );
};
