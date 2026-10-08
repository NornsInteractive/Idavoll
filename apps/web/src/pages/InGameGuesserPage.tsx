import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { DrawBoard, InGameChatDrawer } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';

export const InGameGuesserPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { id: userId, nickname, avatar } = useUserStore();
  const { room, messages, addMessage, isMuted, toggleMute, speakingUserIds } = useRoomStore();
  const {
    gameState,
    currentWord,
    submitGuess,
    initDemoGame,
  } = useGameStore();

  const [guessInput, setGuessInput] = useState('旋转木马');
  const [hasGuessedCorrect, setHasGuessedCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(38);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [revealedHint, setRevealedHint] = useState('旋');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string }[]>([]);

  const [guessFeed, setGuessFeed] = useState([
    {
      id: 'f1',
      type: 'system_clue',
      text: '系统：画手 小明 使用了提示卡，公布首字「旋」',
    },
    {
      id: 'f2',
      type: 'wrong_guess',
      sender: '浩浩 (你)',
      content: '碰碰车？',
      badge: '不对',
      time: '36s',
    },
    {
      id: 'f3',
      type: 'close_guess',
      sender: '糖糖',
      content: '摩天轮？',
      badge: '差一点',
      time: '34s',
    },
    {
      id: 'f4',
      type: 'correct_guess',
      sender: '阿雅 (Aya)',
      text: '猜中了正确答案！',
      score: '+100分',
    },
  ]);

  useEffect(() => {
    if (!gameState) {
      initDemoGame(userId, false);
    }
  }, [gameState, userId, initDemoGame]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/game/result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const currentStrokes = gameState?.strokes || [];

  const handleGuessSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guessInput.trim() || hasGuessedCorrect) return;

    const trimmed = guessInput.trim();
    const isCorrect = submitGuess(trimmed, userId, nickname);

    if (isCorrect) {
      setHasGuessedCorrect(true);
      setGuessFeed((prev) => [
        ...prev,
        {
          id: `f_${Date.now()}`,
          type: 'correct_guess',
          sender: '浩浩 (你)',
          text: `猜中了正确答案！【${currentWord}】`,
          score: '+100分 ⚡',
        },
      ]);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      setGuessFeed((prev) => [
        ...prev,
        {
          id: `f_${Date.now()}`,
          type: 'wrong_guess',
          sender: '浩浩 (你)',
          content: `${trimmed}？`,
          badge: '不对',
          time: `${timeLeft}s`,
        },
      ]);
    }

    addMessage({
      version: 'v1',
      seq: Date.now(),
      timestamp: Date.now(),
      senderId: userId,
      type: 'chat:message',
      payload: {
        id: `msg_${Date.now()}`,
        type: isCorrect ? 'correct_guess' : 'guess',
        content: isCorrect ? `🎉 猜对了！答案是【${currentWord}】` : trimmed,
        senderNickname: '浩浩',
        senderAvatar: avatar,
        isDanmaku: true,
      },
    });

    setGuessInput('');
  };

  const triggerFloatingEmoji = (emoji: string) => {
    const newId = `emoji_${Date.now()}_${Math.random()}`;
    setFloatingEmojis((prev) => [...prev, { id: newId, emoji }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newId));
    }, 2800);

    addMessage({
      version: 'v1',
      seq: Date.now(),
      timestamp: Date.now(),
      senderId: userId,
      type: 'chat:message',
      payload: {
        id: `msg_${Date.now()}`,
        type: 'text',
        content: emoji,
        senderNickname: '浩浩',
        senderAvatar: avatar,
        isDanmaku: true,
      },
    });
  };

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

  const quickPhrases = ['旋木', '旋转木马', '旋转飞椅', '旋转滑梯'];

  return (
    <div className={`bg-background text-on-surface antialiased flex justify-center items-center h-screen overflow-hidden selection:bg-surface-variant selection:text-primary ${isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''}`}>
      {/* Mobile Viewport Container 390px (Exact Stitch Container) */}
      <main className={`w-full ${isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'} flex flex-col justify-between bg-surface shadow-2xl relative overflow-hidden select-none`}>
        {/* ========================================================================= */}
        {/* TOP BAR / GAME HUD (Shared Specs + Guesser Identity)                      */}
        {/* ========================================================================= */}
        <header className="w-full bg-surface-container-lowest px-3 pt-2 pb-1.5 shadow-xs flex flex-col gap-1 shrink-0 z-20">
          {/* Upper Status Row */}
          <div className="flex items-center justify-between">
            {/* Room & Round Chips */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined text-[13px] text-primary">tag</span>
                <span className="font-label-sm text-[12px] font-bold tracking-tight">84920</span>
              </div>
              <span className="text-[11px] font-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
                第 2/5 轮
              </span>
              {/* Identity Badge: Guesser */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-bold">
                <span className="material-symbols-outlined text-[13px]">visibility</span>
                <span className="text-[11px] font-label-sm">猜题者</span>
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
                  onClick={() => setIsChatDrawerOpen(true)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                  title="房间规则"
                >
                  <span className="material-symbols-outlined text-[16px]">help</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatDrawerOpen(true)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                  title="设置与聊天"
                >
                  <span className="material-symbols-outlined text-[16px]">settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/room/room_idavoll_demo')}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-error-container active:scale-95 text-error cursor-pointer"
                  title="退出房间"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Player Seats Row (Horizontal Mini Seats) */}
          <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/60 px-0.5 overflow-x-auto no-scrollbar gap-1">
            {/* Player 1: Painter (小明) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-fixed border border-primary/20 shadow-xs shrink-0">
              <div className="relative w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-[10px] font-bold">
                明
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-secondary-container text-on-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[8px] pencil-anim">edit</span>
                </span>
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] font-bold text-on-primary-fixed truncate max-w-[36px]">
                    小明
                  </span>
                  <span className="text-[8px] px-1 rounded-full bg-primary-container text-on-primary-container font-bold">
                    作画
                  </span>
                </div>
                <span className="text-[9px] font-body-sm text-on-primary-fixed-variant font-bold">
                  240分
                </span>
              </div>
            </div>

            {/* Player 2: Guessed Correctly (阿雅) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-low border border-tertiary-fixed-dim/40 shrink-0">
              <div className="relative w-5 h-5 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary text-[10px] font-bold">
                雅
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                </span>
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] font-bold text-on-surface truncate max-w-[36px]">
                    阿雅
                  </span>
                  <span className="text-[8px] font-bold text-tertiary">已猜对</span>
                </div>
                <span className="text-[9px] font-body-sm text-tertiary font-bold">+100分</span>
              </div>
            </div>

            {/* Player 3: Current User (浩浩 - 猜词中) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-primary-container shrink-0">
              <div className="relative w-5 h-5 rounded-full bg-surface-tint flex items-center justify-center text-on-primary text-[10px] font-bold">
                浩
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-tertiary-fixed border border-surface-container-lowest"></span>
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[11px] font-bold text-primary truncate max-w-[32px]">
                    你
                  </span>
                  <span className="text-[8px] px-1 rounded-full bg-surface-variant text-primary font-bold">
                    {hasGuessedCorrect ? '猜中' : '待猜'}
                  </span>
                </div>
                <span className="text-[9px] font-body-sm text-on-surface-variant font-bold">
                  {hasGuessedCorrect ? '280分' : '180分'}
                </span>
              </div>
            </div>

            {/* Player 4: Other Guesser (糖糖) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-low shrink-0">
              <div className="relative w-5 h-5 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant text-[10px] font-bold">
                糖
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-tertiary-fixed border border-surface-container-lowest"></span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-label-sm text-[11px] text-on-surface-variant truncate max-w-[36px]">
                  糖糖
                </span>
                <span className="text-[9px] font-body-sm text-outline font-bold">90分</span>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SECRET WORD HINT CARD (Crucial Guesser Perspective Banner)                */}
        {/* ========================================================================= */}
        <section className="mx-3 mt-1.5 bg-gradient-to-r from-primary/10 via-surface-container-high to-surface-variant rounded-xl px-2.5 py-1.5 flex items-center justify-between border border-primary/15 shadow-xs shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] font-bold">
                <span className="material-symbols-outlined text-[13px]">lightbulb</span>
                提示分类
              </span>
              <span className="font-label-md text-label-md font-extrabold text-primary tracking-tight">
                {gameState?.wordCategory || '游乐场设施'} · 4个字
              </span>
            </div>
            {/* Word Blanks & Partial Clue */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-body-sm font-label-sm text-on-surface-variant font-bold">
                字数卡槽：
              </span>
              <div className="flex items-center gap-1">
                {/* Hint revealed first character */}
                <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-display-hero-mobile text-[16px] font-black shadow-xs ring-2 ring-primary/30">
                  {revealedHint}
                </div>
                {/* Blank Slot 2 */}
                <div className="w-7 h-7 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-headline-sm text-outline">
                  {hasGuessedCorrect ? '转' : '_'}
                </div>
                {/* Blank Slot 3 */}
                <div className="w-7 h-7 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-headline-sm text-outline">
                  {hasGuessedCorrect ? '木' : '_'}
                </div>
                {/* Blank Slot 4 */}
                <div className="w-7 h-7 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-headline-sm text-outline">
                  {hasGuessedCorrect ? '马' : '_'}
                </div>
              </div>
            </div>
          </div>
          {/* Action: Hint Help / Skip Vote */}
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => {
                setRevealedHint('旋');
                addMessage({
                  version: 'v1',
                  seq: Date.now(),
                  timestamp: Date.now(),
                  senderId: userId,
                  type: 'chat:message',
                  payload: {
                    id: `msg_${Date.now()}`,
                    type: 'system',
                    content: '浩浩 向画手申请了更多提示！',
                    senderNickname: '系统',
                    senderAvatar: '',
                    isDanmaku: true,
                  },
                });
              }}
              className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container active:scale-95 shadow-xs border border-primary/20 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary-container">tips_and_updates</span>
              <span className="text-[11px] font-label-sm font-bold">申请提示</span>
            </button>
            <span className="text-[10px] text-on-surface-variant">首字已解锁 (1/4)</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LIVE DRAWING CANVAS (Spectator View with Live Carousel Art)               */}
        {/* ========================================================================= */}
        <section className="mx-3 mt-1.5 flex flex-col relative shrink-0">
          <div className="w-full h-[190px] bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden relative flex flex-col justify-between">
            {/* Canvas Status & Floating Controls Overlay */}
            <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
              {/* Live Painter Indicator */}
              <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-inverse-surface/80 backdrop-blur-xs text-inverse-on-surface shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-ping"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container -ml-3"></span>
                <span className="text-[11px] font-label-sm">小明 正在实时作画中...</span>
              </div>
              {/* Canvas Action Tools */}
              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-6 h-6 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs shadow-xs flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 cursor-pointer"
                  title="全屏查看"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>
            </div>

            {/* The Live Canvas Artwork (Drawing Carousel - 旋转木马) */}
            <div className="w-full h-full relative flex items-center justify-center bg-[#fafaff] overflow-hidden">
              {/* Subtle Grid Texture for Drawing Paper Feel */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#413fd6 0.8px, transparent 0.8px)',
                  backgroundSize: '14px 14px',
                }}
              ></div>

              {/* Embedded Live Canvas Stroke Board */}
              <DrawBoard
                strokes={currentStrokes}
                isDrawer={false}
                width={700}
                height={400}
                className="w-full h-full pointer-events-none z-10 border-0 rounded-none"
              />

              {/* Floating Cheers / Reaction Emojis */}
              {floatingEmojis.map((item) => (
                <div key={item.id} className="absolute bottom-6 right-8 pointer-events-none flex flex-col items-center z-20">
                  <span className="emoji-float text-xl select-none">{item.emoji}</span>
                </div>
              ))}
            </div>

            {/* Canvas Footer: Quick Reactions Bar Overlay */}
            <div className="w-full bg-surface-container-low/95 px-2.5 py-1 flex items-center justify-between border-t border-surface-container">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-label-sm text-outline font-bold">画板反应:</span>
                <button
                  type="button"
                  onClick={() => triggerFloatingEmoji('👏')}
                  className="px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant active:scale-90 text-[11px] shadow-xs cursor-pointer"
                >
                  👏 棒
                </button>
                <button
                  type="button"
                  onClick={() => triggerFloatingEmoji('😂')}
                  className="px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant active:scale-90 text-[11px] shadow-xs cursor-pointer"
                >
                  😂 抽象
                </button>
                <button
                  type="button"
                  onClick={() => triggerFloatingEmoji('❤️')}
                  className="px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant active:scale-90 text-[11px] shadow-xs cursor-pointer"
                >
                  ❤️ 懂了
                </button>
              </div>
              <span className="text-[10px] font-label-sm font-bold text-primary">实时笔画同步中</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LIVE CHAT & GUESS FEED (中间历史记录区域)                                  */}
        {/* ========================================================================= */}
        <section className="mx-3 my-1.5 flex-1 min-h-0 bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-surface-container flex flex-col justify-between overflow-hidden">
          {/* Feed Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/60">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">forum</span>
              <span className="font-label-sm text-label-sm font-bold text-on-surface">实时竞猜与动态</span>
            </div>
            <span className="text-[10px] font-label-sm text-outline">答案保护已开启（防剧透）</span>
          </div>

          {/* Scrollable Message Stream */}
          <div className="flex-1 overflow-y-auto space-y-2 py-1.5 pr-1 custom-scroll text-[13px]">
            {guessFeed.map((item) => {
              if (item.type === 'system_clue') {
                return (
                  <div key={item.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container-low text-on-surface-variant text-[11px] border-l-2 border-primary">
                    <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                    <span>{item.text}</span>
                  </div>
                );
              }
              if (item.type === 'wrong_guess') {
                return (
                  <div key={item.id} className="flex items-start gap-1.5">
                    <span className="font-bold text-primary text-label-sm shrink-0">{item.sender}:</span>
                    <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full text-on-surface font-body-sm">
                      <span>{item.content}</span>
                      <span className="text-error font-bold text-[11px] flex items-center">
                        <span className="material-symbols-outlined text-[13px]">close</span> {item.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-outline ml-auto self-center">{item.time}</span>
                  </div>
                );
              }
              if (item.type === 'close_guess') {
                return (
                  <div key={item.id} className="flex items-start gap-1.5">
                    <span className="font-bold text-on-surface-variant text-label-sm shrink-0">{item.sender}:</span>
                    <div className="flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-full text-on-surface font-body-sm">
                      <span>{item.content}</span>
                      <span className="text-secondary font-bold text-[11px] flex items-center">
                        <span className="material-symbols-outlined text-[13px]">priority_high</span> {item.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-outline ml-auto self-center">{item.time}</span>
                  </div>
                );
              }
              if (item.type === 'correct_guess') {
                return (
                  <div key={item.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim text-on-tertiary-fixed">
                    <span className="text-[14px]">🎉</span>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="font-bold font-label-sm">系统：{item.sender}</span>
                      <span className="text-[12px]">{item.text}</span>
                    </div>
                    <span className="font-extrabold text-[12px] text-tertiary">{item.score}</span>
                  </div>
                );
              }
              return null;
            })}

            {/* Live Typing Alert for others */}
            <div className="flex items-center gap-1 text-[11px] text-outline font-body-sm pl-1 italic">
              <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce"></span>
              <span>糖糖 正在输入猜测...</span>
            </div>
          </div>

          {/* Quick Guess Phrase Pills (黄金触控快捷候选项) */}
          <div className="pt-1.5 border-t border-surface-container-high/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {quickPhrases.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => {
                  setGuessInput(phrase);
                }}
                className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-[11px] font-bold shrink-0 hover:bg-surface-variant active:scale-95 cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* GUESS INPUT & INTERACTION CORE BAR (底部黄金触控交互区)                    */}
        {/* ========================================================================= */}
        <footer className="w-full bg-surface-container-lowest px-3 pt-2 pb-3 shadow-lg border-t border-surface-container flex flex-col gap-1.5 shrink-0 z-30">
          {/* Primary Input Field + Send Button */}
          <form onSubmit={handleGuessSubmit} className="flex items-center gap-2">
            <div className="flex-1 relative flex items-center">
              <span className="absolute left-3 text-outline material-symbols-outlined text-[18px]">search</span>
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="输入你的猜测词（如：旋转木马）..."
                className="w-full pl-9 pr-8 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/60 text-on-surface font-body-md text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-outline/70 font-semibold"
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
              className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-md font-bold shadow-md hover:bg-primary active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
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
                onClick={toggleMute}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-primary hover:bg-surface-variant active:scale-95 transition-transform shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">{isMuted ? 'mic_off' : 'mic'}</span>
                <span className="font-label-sm text-label-sm font-bold">{isMuted ? '开麦' : '按住说话'}</span>
              </button>

              {/* Voice Channel Status */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-tertiary-fixed/30 text-tertiary">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span className="text-[11px] font-bold">语音已连通</span>
              </div>
            </div>

            {/* Right Side Utility Badges */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container active:scale-95 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px] text-secondary-container">leaderboard</span>
                <span className="font-label-sm text-label-sm font-bold">积分榜</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(true)}
                className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
                title="互动与表情"
              >
                <span className="material-symbols-outlined text-[18px]">add_reaction</span>
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* Reusable InGameChatDrawer */}
      <InGameChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        currentUserId={userId}
        onSendMessage={(content) => {
          addMessage({
            version: 'v1',
            seq: Date.now(),
            timestamp: Date.now(),
            senderId: userId,
            type: 'chat:message',
            payload: {
              id: `msg_${Date.now()}`,
              type: 'text',
              content,
              senderNickname: nickname,
              senderAvatar: avatar,
              isDanmaku: false,
            },
          });
        }}
        players={room?.players || []}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        speakingUserIds={speakingUserIds}
        roomCode="84920"
        roundInfo="第 2/5 轮"
        currentDrawerNickname="小明"
        isDrawer={false}
      />
    </div>
  );
};
