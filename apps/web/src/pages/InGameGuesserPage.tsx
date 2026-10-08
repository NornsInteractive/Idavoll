import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';
import { DrawBoard, InGameChatDrawer, DanmakuOverlay } from '@idavoll/ui';
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
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isDanmakuOn, setIsDanmakuOn] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; delay: number }[]>([]);
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
  const drawerNickname = gameState.drawerNickname || '';
  const wordCategory = gameState.wordCategory || '日常词汇';
  const wordLength = gameState.currentWordLength || 0;
  const wordHint = gameState.wordHint || '';
  const players = room.players || [];

  // Determine if current user has guessed correctly
  const myScoreItem = gameState.scores?.find((s) => s.playerId === userId);
  const hasGuessedCorrect =
    (myScoreItem?.hasGuessedCorrectly ?? false) || (guessResult?.correct ?? false);

  const scoresMap = new Map(gameState.scores?.map((s) => [s.playerId, s]) || []);

  const handleGuessSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guessInput.trim() || hasGuessedCorrect) return;

    submitGuess(guessInput.trim());
    setGuessInput('');
  };

  const handleSendReaction = (emoji: string) => {
    sendMessage(emoji, true);
    const newEmoji = { id: `${Date.now()}-${Math.random()}`, emoji, delay: 0 };
    setFloatingEmojis((prev) => [...prev.slice(-8), newEmoji]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newEmoji.id));
    }, 2800);
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

  // Determine character slots (revealing hint character if available)
  const slotCount = Math.max(1, wordLength || 4);
  const firstChar = wordHint ? wordHint.replace(/^[^\w\u4e00-\u9fa5]*/, '').slice(0, 1) : '';
  const slots = Array.from({ length: slotCount }).map((_, idx) => {
    if (idx === 0 && firstChar) return firstChar;
    return '_';
  });

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-on-surface select-none font-body-md antialiased flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''
      }`}
    >
      {/* =========================================================================
          1. MOBILE VIEWPORT CONTAINER (< lg: 1024px) - 100% Match to playhub/code.html
         ========================================================================= */}
      <div className="lg:hidden w-full h-full flex justify-center items-center overflow-hidden">
        <main
          className={`w-full ${
            isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'
          } flex flex-col justify-between bg-surface shadow-2xl relative overflow-hidden select-none`}
        >
          {/* TOP BAR / GAME HUD */}
          <header className="w-full bg-surface-container-lowest px-3 pt-2 pb-1.5 shadow-xs flex flex-col gap-1 shrink-0 z-20">
            {/* Upper Status Row */}
            <div className="flex items-center justify-between">
              {/* Room & Round Chips & Identity Badge */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="tactile-btn flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant cursor-pointer"
                  title={t('inGame.copyRoomCode', '点击复制房号')}
                >
                  <span className="material-symbols-outlined text-[13px] text-primary">tag</span>
                  <span className="font-label-sm text-[12px] font-bold tracking-tight">
                    {roomCode} {copiedCode ? '✓' : ''}
                  </span>
                </button>
                <span className="text-[11px] font-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
                  第 {currentRound}/{totalRounds} 轮
                </span>
                {/* Identity Badge: Guesser */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-bold">
                  <span className="material-symbols-outlined text-[13px]">visibility</span>
                  <span className="text-[11px] font-label-sm">{t('inGame.guesserRole', '猜题者')}</span>
                </div>
              </div>

              {/* Timer & Top Controls */}
              <div className="flex items-center gap-1.5">
                {/* Circular Countdown Timer */}
                <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-error-container text-secondary font-extrabold text-[12px] shadow-xs">
                  <div className="absolute inset-0 rounded-full border-2 border-secondary-container timer-ring"></div>
                  <span>{timeLeft}s</span>
                </div>
                {/* Utility Icons */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setIsRulesOpen(true)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                    title={t('gameDetail.overviewTitle', '房间规则')}
                  >
                    <span className="material-symbols-outlined text-[16px]">help</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChatDrawerOpen(true)}
                    className="relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                    title={t('inGame.chatAndVoice', '聊天抽屉')}
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    {messages.length > 0 && (
                      <span className="absolute 0 0 w-2 h-2 rounded-full bg-secondary"></span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                    title={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenDanmaku', '全屏')}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLeave}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-error-container active:scale-95 text-error cursor-pointer"
                    title={t('inGame.exitRoom', '退出房间')}
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Player Seats Row (Horizontal Mini Seats) */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/60 px-0.5 overflow-x-auto no-scrollbar gap-1">
              {players.map((p) => {
                const isSpeaking = speakingUserIds.includes(p.id);
                const scoreItem = scoresMap.get(p.id);
                const scoreVal = scoreItem?.score ?? p.score;
                const isMe = p.id === userId;
                const isDrawer = p.id === gameState.drawerId;
                const hasCorrect = scoreItem?.hasGuessedCorrectly;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full shrink-0 border shadow-xs ${
                      isDrawer
                        ? 'bg-primary-fixed border-primary/20'
                        : hasCorrect
                        ? 'bg-surface-container-low border-tertiary-fixed-dim/40'
                        : isMe
                        ? 'bg-surface-container border-primary-container'
                        : 'bg-surface-container-low border-surface-container'
                    }`}
                  >
                    <div className="relative w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-[10px] font-bold overflow-hidden">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.nickname} className="w-full h-full object-cover" />
                      ) : (
                        p.nickname.slice(0, 1)
                      )}
                      {isDrawer && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-secondary-container text-on-primary flex items-center justify-center shadow-xs">
                          <span className="material-symbols-outlined text-[8px] pencil-anim">edit</span>
                        </span>
                      )}
                      {hasCorrect && !isDrawer && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-xs">
                          <span
                            className="material-symbols-outlined text-[9px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check
                          </span>
                        </span>
                      )}
                      {isSpeaking && (
                        <span className="absolute inset-0 rounded-full ring-2 ring-emerald-500 animate-pulse"></span>
                      )}
                    </div>
                    <div className="flex flex-col leading-none">
                      <div className="flex items-center gap-1">
                        <span className="font-label-sm text-[11px] font-bold text-on-surface truncate max-w-[36px]">
                          {isMe ? `${p.nickname} (你)` : p.nickname}
                        </span>
                        <span
                          className={`text-[8px] px-1 rounded-full font-bold ${
                            isDrawer
                              ? 'bg-primary-container text-on-primary-container'
                              : hasCorrect
                              ? 'text-tertiary'
                              : 'bg-surface-variant text-primary'
                          }`}
                        >
                          {isDrawer ? '作画' : hasCorrect ? '已猜对' : '待猜'}
                        </span>
                      </div>
                      <span className="text-[9px] font-body-sm font-bold text-on-surface-variant">
                        {scoreVal}分
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </header>

          {/* SECRET WORD HINT CARD (Guesser Perspective Banner) */}
          <section className="mx-3 mt-1.5 bg-gradient-to-r from-primary/10 via-surface-container-high to-surface-variant rounded-xl px-2.5 py-1.5 flex items-center justify-between border border-primary/15 shadow-xs shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[13px]">lightbulb</span>
                  提示分类
                </span>
                <span className="font-label-md text-label-md font-extrabold text-primary tracking-tight">
                  {wordCategory} · {wordLength || 4}个字
                </span>
              </div>
              {/* Word Blanks & Partial Clue */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-body-sm font-label-sm text-on-surface-variant font-bold">字数卡槽：</span>
                <div className="flex items-center gap-1">
                  {gameState.status === 'selecting_word' ? (
                    <span className="text-xs font-bold text-secondary animate-pulse">
                      {t('inGame.drawerSelectingWord', '画手正在挑选词语...')}
                    </span>
                  ) : (
                    slots.map((char, idx) => (
                      <div
                        key={idx}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black shadow-xs ${
                          char !== '_'
                            ? 'bg-primary-container text-on-primary-container text-[16px] ring-2 ring-primary/30'
                            : 'bg-surface-container-lowest border-2 border-dashed border-outline-variant text-outline text-sm'
                        }`}
                      >
                        {char}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* Action: Hint Help */}
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  sendMessage('申请提示 💡', false);
                }}
                className="tactile-btn px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container shadow-xs border border-primary/20 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px] text-secondary-container">
                  tips_and_updates
                </span>
                <span className="text-[11px] font-label-sm font-bold">申请提示</span>
              </button>
              <span className="text-[10px] text-on-surface-variant">
                {wordHint ? `已公布线索: ${wordHint}` : '提示未解锁'}
              </span>
            </div>
          </section>

          {/* LIVE DRAWING CANVAS (Spectator View with Live Art) */}
          <section className="mx-3 mt-1.5 flex flex-col relative shrink-0">
            <div className="w-full h-[190px] bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden relative flex flex-col justify-between">
              {/* Canvas Status & Floating Controls Overlay */}
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                {/* Live Painter Indicator */}
                <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-inverse-surface/80 backdrop-blur-xs text-inverse-on-surface shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-ping"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-container -ml-3"></span>
                  <span className="text-[11px] font-label-sm">
                    {drawerNickname || '画手'} 正在实时作画中...
                  </span>
                </div>
                {/* Canvas Action Tools */}
                <div className="pointer-events-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="w-6 h-6 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs shadow-xs flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 cursor-pointer"
                    title={t('inGame.fullscreenDanmaku', '全屏查看')}
                  >
                    <span className="material-symbols-outlined text-[14px]">fullscreen</span>
                  </button>
                </div>
              </div>

              {/* The Live Canvas Drawing Area */}
              <div className="w-full h-full relative flex items-center justify-center bg-white overflow-hidden">
                {/* Subtle Grid Texture for Drawing Paper Feel */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413fd6 0.8px, transparent 0.8px)',
                    backgroundSize: '14px 14px',
                  }}
                />

                {/* Danmaku Overlay */}
                <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

                {/* Real Live Canvas */}
                <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none">
                  <DrawBoard
                    strokes={strokes}
                    isDrawer={false}
                    width={800}
                    height={600}
                    className="w-full h-full aspect-[4/3] max-w-[800px] max-h-[600px] rounded-lg border-0 shadow-none pointer-events-none"
                  />
                </div>

                {/* Floating Cheers / Reaction Emojis */}
                {floatingEmojis.map((item) => (
                  <div
                    key={item.id}
                    className="absolute bottom-5 right-6 pointer-events-none flex flex-col items-center"
                  >
                    <span className="emoji-float text-2xl select-none">{item.emoji}</span>
                  </div>
                ))}

                {hasGuessedCorrect && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 animate-bounce pointer-events-none">
                    <span>🎉 恭喜！你已猜中正确答案</span>
                  </div>
                )}
              </div>

              {/* Canvas Footer: Quick Reactions Bar Overlay */}
              <div className="w-full bg-surface-container-low/95 px-2.5 py-1 flex items-center justify-between border-t border-surface-container shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-label-sm text-outline font-bold">画板反应:</span>
                  <button
                    type="button"
                    onClick={() => handleSendReaction('👏 棒')}
                    className="tactile-btn px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-[11px] shadow-xs cursor-pointer"
                  >
                    👏 棒
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendReaction('😂 抽象')}
                    className="tactile-btn px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-[11px] shadow-xs cursor-pointer"
                  >
                    😂 抽象
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendReaction('❤️ 懂了')}
                    className="tactile-btn px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-[11px] shadow-xs cursor-pointer"
                  >
                    ❤️ 懂了
                  </button>
                </div>
                <span className="text-[10px] font-label-sm font-bold text-primary">实时笔画同步中</span>
              </div>
            </div>
          </section>

          {/* LIVE CHAT & GUESS FEED (中间历史记录区域) */}
          <section className="mx-3 my-1.5 flex-1 min-h-0 bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-surface-container flex flex-col justify-between overflow-hidden">
            {/* Feed Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/60 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">forum</span>
                <span className="font-label-sm text-[12px] font-bold text-on-surface">实时竞猜与动态</span>
              </div>
              <span className="text-[10px] font-label-sm text-outline">答案保护已开启（防剧透）</span>
            </div>

            {/* Scrollable Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-2 py-1.5 pr-1 custom-scroll text-[13px]">
              {/* System Clue Alert */}
              {wordHint && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container-low text-on-surface-variant text-[11px] border-l-2 border-primary">
                  <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                  <span>
                    系统：画手 <strong className="text-primary">{drawerNickname || '画手'}</strong> 公布了线索「
                    <strong className="text-primary">{wordHint}</strong>」
                  </span>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-outline font-medium">
                  暂无猜词记录，大家的猜测将显示于此
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
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim text-on-tertiary-fixed"
                      >
                        <span className="text-[14px]">🎉</span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="font-bold font-label-sm">系统：{m.payload.senderNickname}</span>
                          <span className="text-[12px]">猜中了正确答案！</span>
                        </div>
                        <span className="font-extrabold text-[12px] text-tertiary">+100分</span>
                      </div>
                    );
                  }

                  return (
                    <div key={m.payload.id} className="flex items-start gap-1.5">
                      <span
                        className={`font-bold text-label-sm shrink-0 ${
                          isMe ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {m.payload.senderNickname} {isMe ? '(你)' : ''}:
                      </span>
                      <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full text-on-surface font-body-sm text-[12px]">
                        <span>{m.payload.content}</span>
                        {m.payload.isDanmaku ? (
                          <span className="text-secondary font-bold text-[10px] flex items-center">
                            <span className="material-symbols-outlined text-[12px]">chat</span>
                          </span>
                        ) : (
                          <span className="text-error font-bold text-[11px] flex items-center">
                            <span className="material-symbols-outlined text-[13px]">close</span> 不对
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-outline ml-auto self-center">{timeStr}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Guess Phrase Pills */}
            <div className="pt-1.5 border-t border-surface-container-high/60 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              {['旋转木马', '碰碰车', '过山车', '海盗船', '摩天轮'].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => {
                    if (!hasGuessedCorrect) {
                      submitGuess(phrase);
                    }
                  }}
                  className="tactile-btn px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-[11px] font-bold shrink-0 hover:bg-surface-variant cursor-pointer"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </section>

          {/* GUESS INPUT & INTERACTION CORE BAR (底部黄金触控交互区) */}
          <footer className="w-full bg-surface-container-lowest px-3 pt-2 pb-3 shadow-lg border-t border-surface-container flex flex-col gap-1.5 shrink-0 z-30">
            {/* Primary Input Field + Send Button */}
            <form onSubmit={handleGuessSubmit} className="flex items-center gap-2">
              <div className="flex-1 relative flex items-center">
                <span className="absolute left-3 text-outline material-symbols-outlined text-[18px]">search</span>
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  disabled={hasGuessedCorrect}
                  placeholder={
                    hasGuessedCorrect ? '你已猜中！静候其他玩家抢答...' : '输入你的猜测词（如：旋转木马）...'
                  }
                  className="w-full pl-9 pr-8 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/60 text-on-surface font-body-md text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-outline/70 font-semibold disabled:opacity-60"
                />
                {guessInput && (
                  <button
                    type="button"
                    onClick={() => setGuessInput('')}
                    className="absolute right-2.5 text-outline hover:text-on-surface cursor-pointer"
                    title="清空"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                  </button>
                )}
              </div>
              {/* Big Send / Guess Button */}
              <button
                type="submit"
                disabled={hasGuessedCorrect || !guessInput.trim()}
                className="tactile-btn px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-md font-bold shadow-md hover:bg-primary active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <span>猜词</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>

            {/* Voice Chat & Functional Row */}
            <div className="flex items-center justify-between pt-0.5">
              {/* Push to Talk Voice Control */}
              <div className="flex items-center gap-2">
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
                  className={`tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-transform shadow-xs cursor-pointer select-none touch-none ${
                    !isMuted
                      ? 'bg-emerald-600 text-white shadow-md animate-pulse'
                      : 'bg-surface-container text-primary hover:bg-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {!isMuted ? 'mic' : 'mic_none'}
                  </span>
                  <span className="font-label-sm text-label-sm font-bold">
                    {voiceMode === 'hold'
                      ? !isMuted
                        ? t('voice.releaseToMute', '松开发言')
                        : t('voice.holdToTalk', '按住说话')
                      : isMuted
                      ? t('voice.unmute', '开麦')
                      : t('voice.mute', '静音')}
                  </span>
                </button>

                {/* Voice Channel Status */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${
                    voiceStatus === 'connected'
                      ? 'bg-tertiary-fixed/30 text-tertiary'
                      : voiceStatus === 'connecting'
                      ? 'bg-amber-500/20 text-amber-600'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      voiceStatus === 'connected'
                        ? 'bg-tertiary animate-pulse'
                        : voiceStatus === 'connecting'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-outline'
                    }`}
                  ></span>
                  <span>
                    {voiceStatus === 'connected'
                      ? '语音已连通'
                      : voiceStatus === 'connecting'
                      ? '正在连接'
                      : '未连接'}
                  </span>
                </div>
              </div>

              {/* Right Side Utility Badges */}
              <div className="flex items-center gap-1">
                {/* Rank & Scoreboard Modal Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="tactile-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-secondary-container">
                    leaderboard
                  </span>
                  <span className="font-label-sm text-label-sm font-bold">积分榜</span>
                </button>
                {/* Quick Reaction Trigger */}
                <button
                  type="button"
                  onClick={() => handleSendReaction('🔥')}
                  className="tactile-btn w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container flex items-center justify-center shadow-xs cursor-pointer"
                  title="快速喝彩"
                >
                  <span className="material-symbols-outlined text-[18px]">add_reaction</span>
                </button>
              </div>
            </div>
          </footer>
        </main>
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
                🔍
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
              第 {currentRound}/{totalRounds} 轮 · 竞猜进行中
            </span>

            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-highest text-primary font-bold text-xs">
              <span className="material-symbols-outlined text-[15px]">visibility</span>
              <span>猜题者</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Circular Countdown Timer */}
            <div className="flex items-center gap-2 bg-error-container text-secondary font-black px-3 py-1 rounded-full shadow-xs">
              <span className="material-symbols-outlined text-[18px] animate-pulse">timer</span>
              <span className="font-headline-sm text-sm">{timeLeft}s 倒计时</span>
            </div>

            {/* Push to talk voice */}
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

            {/* Deafen toggle */}
            <button
              type="button"
              onClick={toggleDeafen}
              aria-label={isDeafened ? '取消闭音' : '闭音'}
              className={`tactile-btn p-2 rounded-full border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                isDeafened
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                  : 'bg-surface-container text-muted-foreground border-outline-variant/50'
              }`}
              title={isDeafened ? '取消闭音' : '闭音'}
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
              {isDanmakuOn ? '弹幕: 开' : '弹幕: 关'}
            </button>

            <button
              type="button"
              onClick={handleLeave}
              className="tactile-btn px-3 py-1.5 rounded-full bg-error-container text-error text-xs font-bold hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              退出房间
            </button>
          </div>
        </header>

        {/* DESKTOP BODY 12-COLUMN FLUID CONTAINER (max 1440px) */}
        <div className="flex-1 max-w-[1440px] w-full mx-auto flex gap-4 p-4 min-h-0 overflow-hidden">
          {/* LEFT / CENTER COLUMN (Game Board + Clues + Input) */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden">
            {/* Secret Word Hint Card */}
            <section className="bg-gradient-to-r from-primary/10 via-surface-container-high to-surface-variant rounded-2xl px-4 py-2.5 flex items-center justify-between border border-primary/15 shadow-xs shrink-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-xs font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[15px]">lightbulb</span>
                  提示分类
                </span>
                <span className="font-headline-sm text-base font-extrabold text-primary">
                  {wordCategory} · {wordLength || 4}个字
                </span>
                <div className="h-4 w-[1px] bg-primary/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-on-surface-variant">字数卡槽：</span>
                  {gameState.status === 'selecting_word' ? (
                    <span className="text-xs font-bold text-secondary animate-pulse">
                      {t('inGame.drawerSelectingWord', '画手正在挑选词语...')}
                    </span>
                  ) : (
                    slots.map((char, idx) => (
                      <div
                        key={idx}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shadow-xs ${
                          char !== '_'
                            ? 'bg-primary-container text-on-primary-container text-lg ring-2 ring-primary/30'
                            : 'bg-surface-container-lowest border-2 border-dashed border-outline-variant text-outline text-base'
                        }`}
                      >
                        {char}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant">
                  {wordHint ? `已公布线索: ${wordHint}` : '提示未解锁'}
                </span>
                <button
                  type="button"
                  onClick={() => sendMessage('申请提示 💡', false)}
                  className="tactile-btn px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container shadow-xs border border-primary/20 flex items-center gap-1 cursor-pointer font-bold text-xs"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary-container">
                    tips_and_updates
                  </span>
                  <span>申请提示</span>
                </button>
              </div>
            </section>

            {/* Live Drawing Canvas Card */}
            <section className="flex-1 bg-surface-container-lowest rounded-2xl border border-surface-container canvas-shadow flex flex-col justify-between overflow-hidden relative min-h-[360px]">
              {/* Canvas Header Floating Controls */}
              <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-inverse-surface/85 backdrop-blur-md text-inverse-on-surface shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
                  <span className="w-2 h-2 rounded-full bg-secondary-container -ml-4"></span>
                  <span className="text-xs font-label-sm font-bold">
                    {drawerNickname || '画手'} 正在实时挥毫作画中...
                  </span>
                </div>
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="tactile-btn px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-xs flex items-center gap-1 text-on-surface-variant hover:bg-surface-container text-xs font-bold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                    <span>全屏模式</span>
                  </button>
                </div>
              </div>

              {/* Real Drawing Canvas Area */}
              <div className="w-full flex-1 relative flex items-center justify-center bg-white overflow-hidden min-h-[300px]">
                {/* Subtle Grid Texture for Paper Feel */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413fd6 0.8px, transparent 0.8px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Danmaku Overlay */}
                <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

                {/* Real Canvas */}
                <div className="w-full h-full flex items-center justify-center p-3 pointer-events-none">
                  <DrawBoard
                    strokes={strokes}
                    isDrawer={false}
                    width={800}
                    height={600}
                    className="w-full h-full aspect-[4/3] max-w-[800px] max-h-[600px] rounded-xl border-0 shadow-none pointer-events-none"
                  />
                </div>

                {/* Floating Reaction Emojis */}
                {floatingEmojis.map((item) => (
                  <div
                    key={item.id}
                    className="absolute bottom-8 right-12 pointer-events-none flex flex-col items-center"
                  >
                    <span className="emoji-float text-3xl select-none">{item.emoji}</span>
                  </div>
                ))}

                {hasGuessedCorrect && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-black shadow-xl flex items-center gap-2 animate-bounce pointer-events-none">
                    <span>🎉 恭喜！你已猜中正确答案</span>
                  </div>
                )}
              </div>

              {/* Canvas Footer */}
              <div className="w-full bg-surface-container-low px-4 py-1.5 flex items-center justify-between border-t border-surface-container shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-label-sm text-outline font-bold">画板实时反应:</span>
                  {['👏 棒', '😂 抽象', '❤️ 懂了', '🎨 灵魂', '🔥 热烈'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      className="tactile-btn px-2.5 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-xs shadow-xs font-medium cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-label-sm font-bold text-primary">实时笔画高精同步中</span>
              </div>
            </section>

            {/* Bottom Guess Input & Interaction Bar */}
            <footer className="bg-surface-container-lowest p-3 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3 shrink-0">
              <form onSubmit={handleGuessSubmit} className="flex-1 flex items-center gap-2">
                <div className="flex-1 relative flex items-center">
                  <span className="absolute left-3.5 text-outline material-symbols-outlined text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    disabled={hasGuessedCorrect}
                    placeholder={
                      hasGuessedCorrect
                        ? '你已猜中！静候其他玩家抢答...'
                        : '输入你的猜测词（如：旋转木马，按回车提交）...'
                    }
                    className="w-full pl-10 pr-9 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/60 text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-outline/70 font-semibold disabled:opacity-60"
                  />
                  {guessInput && (
                    <button
                      type="button"
                      onClick={() => setGuessInput('')}
                      className="absolute right-3 text-outline hover:text-on-surface cursor-pointer"
                      title="清空"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={hasGuessedCorrect || !guessInput.trim()}
                  className="tactile-btn px-6 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-lg text-sm font-bold shadow-md hover:bg-primary active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40"
                >
                  <span>抢先猜词</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>

              {/* Quick Reaction Button */}
              <button
                type="button"
                onClick={() => handleSendReaction('🔥')}
                className="tactile-btn w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant shadow-xs cursor-pointer"
                title="热烈反应"
              >
                <span className="material-symbols-outlined text-[20px]">add_reaction</span>
              </button>
            </footer>
          </div>

          {/* RIGHT COLUMN (Player Seats & Scoreboard + Live Chat & Guess Stream) */}
          <div className="w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Player Seats & Leaderboard Card */}
            <section className="bg-surface-container-lowest rounded-2xl p-3 border border-surface-container shadow-xs flex flex-col shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-secondary-container">
                    leaderboard
                  </span>
                  <span className="font-label-sm text-sm font-bold text-on-surface">实时积分榜</span>
                </div>
                <span className="text-xs text-outline font-bold">
                  {players.length}/{room.settings?.maxPlayers || 8}人在线
                </span>
              </div>

              <div className="max-h-[180px] overflow-y-auto space-y-1.5 pt-2 custom-scroll">
                {players.map((p, idx) => {
                  const isSpeaking = speakingUserIds.includes(p.id);
                  const scoreItem = scoresMap.get(p.id);
                  const scoreVal = scoreItem?.score ?? p.score;
                  const isMe = p.id === userId;
                  const isDrawer = p.id === gameState.drawerId;
                  const hasCorrect = scoreItem?.hasGuessedCorrectly;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all ${
                        isDrawer
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
                          {isDrawer && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-secondary-container text-on-primary flex items-center justify-center text-[8px]">
                              🎨
                            </span>
                          )}
                          {hasCorrect && !isDrawer && (
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
                            {isDrawer ? '作画中' : hasCorrect ? '✓ 已猜对' : '猜词中'}
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

            {/* Live Chat & Guess Feed Card */}
            <section className="flex-1 bg-surface-container-lowest rounded-2xl p-3 border border-surface-container shadow-xs flex flex-col justify-between overflow-hidden min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">forum</span>
                  <span className="font-label-sm text-sm font-bold text-on-surface">实时竞猜与动态</span>
                </div>
                <span className="text-[10px] text-outline">答案保护已开启</span>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 custom-scroll text-xs">
                {wordHint && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs border-l-2 border-primary">
                    <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                    <span>
                      系统：画手 <strong className="text-primary">{drawerNickname || '画手'}</strong> 公布了线索「
                      <strong className="text-primary">{wordHint}</strong>」
                    </span>
                  </div>
                )}

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
                            <span>猜中了正确答案！</span>
                          </div>
                          <span className="font-black text-tertiary">+100分</span>
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

              {/* Quick Guess Phrase Pills */}
              <div className="pt-2 border-t border-surface-container-high/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {['旋转木马', '碰碰车', '过山车', '海盗船', '摩天轮', '旋转滑梯'].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => {
                      if (!hasGuessedCorrect) {
                        submitGuess(phrase);
                      }
                    }}
                    className="tactile-btn px-2.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-xs font-bold shrink-0 hover:bg-surface-variant cursor-pointer"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal for Mobile */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface p-5 rounded-3xl border border-surface-container shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary-container">leaderboard</span>
                <h3 className="font-headline-sm text-base font-extrabold text-on-surface">房间积分榜</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 custom-scroll">
              {players.map((p, idx) => {
                const scoreItem = scoresMap.get(p.id);
                const scoreVal = scoreItem?.score ?? p.score;
                const isMe = p.id === userId;
                const isDrawer = p.id === gameState.drawerId;
                const hasCorrect = scoreItem?.hasGuessedCorrectly;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low border border-surface-container"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black w-4 text-center text-outline">
                        {idx === 0 ? '👑' : `${idx + 1}`}
                      </span>
                      <img src={p.avatar} alt={p.nickname} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-on-surface">{p.nickname}</span>
                          {isMe && <span className="text-[10px] text-primary font-bold">(你)</span>}
                        </div>
                        <span className="text-[10px] text-outline">
                          {isDrawer ? '🎨 画手' : hasCorrect ? '✓ 已猜中' : '待猜'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-primary font-mono">{scoreVal}</span>
                      <span className="text-[10px] text-outline block">分</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface p-5 rounded-3xl border border-surface-container shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-sm text-base font-extrabold text-on-surface">游戏规则</h3>
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
              <p>1. 每轮随机一名玩家担当画手，根据题目作画。</p>
              <p>2. 其他玩家在竞猜栏输入答案，越快猜对积分越高。</p>
              <p>3. 答案具有防剧透保护，猜错不扣分，鼓励多试！</p>
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
            {gameState.turnSummary.guesserEarned?.[userId] ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                {t('inGame.guesserEarnedReward', { score: gameState.turnSummary.guesserEarned[userId] })}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-surface-container text-outline text-xs font-bold">
                {t('inGame.guesserMissedReward', '本轮未猜中，下一轮继续加油！')}
              </div>
            )}
            <p className="text-[11px] text-outline animate-pulse">{t('inGame.preparingNextRound', '正在准备下一轮...')}</p>
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
