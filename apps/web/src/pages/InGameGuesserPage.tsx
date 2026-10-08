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

  const [guessInput, setGuessInput] = useState('');
  const [hasGuessedCorrect, setHasGuessedCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(42);
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
      sender: '浩浩',
      content: '碰碰车？',
      badge: '不对',
      time: '36s',
    },
    {
      id: 'f3',
      type: 'close_guess',
      sender: '糖糖',
      content: '摩天轮？',
      badge: '很接近了',
      time: '34s',
    },
    {
      id: 'f4',
      type: 'correct_guess',
      sender: '阿雅 (Aya)',
      text: '猜中了答案！获得第1名积分奖励',
      score: '+100分',
    },
    {
      id: 'f5',
      type: 'chat_msg',
      sender: '阿雅',
      content: '太简单啦！小明画的马头绝了哈哈哈哈 🎠',
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
          sender: '你 (浩浩)',
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
          sender: '你 (浩浩)',
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

  const mobileQuickPhrases = ['旋木', '旋转木马', '旋转飞椅', '旋转滑梯'];
  const desktopQuickPhrases = ['旋转木马', '碰碰车', '过山车', '摩天轮', '海盗船'];

  return (
    <div className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background select-none font-body-md antialiased ${isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''}`}>
      {/* =========================================================================
          1. MOBILE VIEW (< lg: 1024px) - 100% Exact match to temp/stitch_idavoll/playhub
         ========================================================================= */}
      <div className={`lg:hidden w-full h-full flex justify-center items-center overflow-hidden`}>
        <main className={`w-full ${isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'} flex flex-col justify-between bg-surface shadow-2xl relative overflow-hidden select-none`}>
          {/* Top Bar / Game HUD */}
          <header className="w-full bg-surface-container-lowest px-3 pt-2 pb-1.5 shadow-xs flex flex-col gap-1 shrink-0 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                  <span className="material-symbols-outlined text-[13px] text-primary">tag</span>
                  <span className="font-label-sm text-[12px] font-bold tracking-tight">84920</span>
                </div>
                <span className="text-[11px] font-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
                  第 2/5 轮
                </span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-bold">
                  <span className="material-symbols-outlined text-[13px]">visibility</span>
                  <span className="text-[11px] font-label-sm">猜题者</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-error-container text-secondary font-extrabold text-[12px] shadow-xs">
                  <div className="absolute inset-0 rounded-full border-2 border-secondary-container timer-ring"></div>
                  <span>{timeLeft}s</span>
                </div>
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

            <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/60 px-0.5 overflow-x-auto no-scrollbar gap-1">
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

          {/* Secret Word Hint Card */}
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
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-body-sm font-label-sm text-on-surface-variant font-bold">
                  字数卡槽：
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-display-hero-mobile text-[16px] font-black shadow-xs ring-2 ring-primary/30">
                    {revealedHint}
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-headline-sm text-outline">
                    {hasGuessedCorrect ? '转' : '_'}
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-headline-sm text-outline">
                    {hasGuessedCorrect ? '木' : '_'}
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-headline-sm text-outline">
                    {hasGuessedCorrect ? '马' : '_'}
                  </div>
                </div>
              </div>
            </div>
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

          {/* Live Drawing Canvas */}
          <section className="mx-3 mt-1.5 flex flex-col relative shrink-0">
            <div className="w-full h-[190px] bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden relative flex flex-col justify-between">
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-inverse-surface/80 backdrop-blur-xs text-inverse-on-surface shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-ping"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-container -ml-3"></span>
                  <span className="text-[11px] font-label-sm">小明 正在实时作画中...</span>
                </div>
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

              <div className="w-full h-full relative flex items-center justify-center bg-[#fafaff] overflow-hidden">
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413fd6 0.8px, transparent 0.8px)',
                    backgroundSize: '14px 14px',
                  }}
                ></div>

                <DrawBoard
                  strokes={currentStrokes}
                  isDrawer={false}
                  width={700}
                  height={400}
                  className="w-full h-full pointer-events-none z-10 border-0 rounded-none"
                />

                {floatingEmojis.map((item) => (
                  <div key={item.id} className="absolute bottom-6 right-8 pointer-events-none flex flex-col items-center z-20">
                    <span className="emoji-float text-xl select-none">{item.emoji}</span>
                  </div>
                ))}
              </div>

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

          {/* Live Chat & Guess Feed */}
          <section className="mx-3 my-1.5 flex-1 min-h-0 bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-surface-container flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/60">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">forum</span>
                <span className="font-label-sm text-label-sm font-bold text-on-surface">实时竞猜与动态</span>
              </div>
              <span className="text-[10px] font-label-sm text-outline">答案保护已开启（防剧透）</span>
            </div>

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

              <div className="flex items-center gap-1 text-[11px] text-outline font-body-sm pl-1 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce"></span>
                <span>糖糖 正在输入猜测...</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-surface-container-high/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {mobileQuickPhrases.map((phrase) => (
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

          {/* Bottom Interaction Core Bar */}
          <footer className="w-full bg-surface-container-lowest px-3 pt-2 pb-3 shadow-lg border-t border-surface-container flex flex-col gap-1.5 shrink-0 z-30">
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

              <button
                type="submit"
                disabled={hasGuessedCorrect || !guessInput.trim()}
                className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-md font-bold shadow-md hover:bg-primary active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <span>猜词</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-primary hover:bg-surface-variant active:scale-95 transition-transform shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">{isMuted ? 'mic_off' : 'mic'}</span>
                  <span className="font-label-sm text-label-sm font-bold">{isMuted ? '开麦' : '按住说话'}</span>
                </button>

                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-tertiary-fixed/30 text-tertiary">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  <span className="text-[11px] font-bold">语音已连通</span>
                </div>
              </div>

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
      </div>

      {/* =========================================================================
          2. DESKTOP VIEW (>= lg: 1024px) - 100% Exact match to Stitch Desktop Screen
             (Screen 30d51eb4a7004f00b53e157f8a40bc5a)
         ========================================================================= */}
      <div className="hidden lg:flex flex-col w-full h-full bg-background overflow-hidden">
        {/* Top Desktop Navigation Bar */}
        <header className="h-14 px-6 bg-surface-container-lowest border-b border-surface-container flex items-center justify-between shrink-0 z-30 shadow-xs">
          {/* Left Brand & Room Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/lobby')}>
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md font-black text-lg">
                🎮
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display-hero text-xl font-extrabold text-primary tracking-tight">PlayHub</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">你画我猜</span>
              </div>
            </div>

            <div className="h-5 w-px bg-outline-variant"></div>

            <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full text-xs font-bold text-on-surface">
              <span className="material-symbols-outlined text-[15px] text-primary">tag</span>
              <span>84920</span>
              <span className="text-on-surface-variant font-normal">画神集结开黑群</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText('84920')}
                className="hover:text-primary transition-colors cursor-pointer"
                title="复制房号"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
            </div>
          </div>

          {/* Center Round Progress & Urgency Timer */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>第 2/5 轮 · 猜题中</span>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-error-container text-secondary font-black text-sm shadow-xs border border-secondary/20">
              <span className="material-symbols-outlined text-[16px] animate-pulse">timer</span>
              <span>{timeLeft}s 紧急抢答</span>
            </div>
          </div>

          {/* Right Voice Status & Controls */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-surface-container text-on-surface px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>4人连麦中</span>
            </div>

            <button
              type="button"
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title="音量"
            >
              <span className="material-symbols-outlined text-[18px]">volume_up</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title={isMuted ? '开麦' : '静音'}
            >
              <span className="material-symbols-outlined text-[18px]">{isMuted ? 'mic_off' : 'mic'}</span>
            </button>

            <button
              type="button"
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title="设置"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>

            <div className="relative">
              <img className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-400" alt="浩浩" src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao" />
            </div>

            <button
              type="button"
              onClick={() => navigate('/room/room_idavoll_demo')}
              className="px-3 py-1.5 rounded-full border border-error/30 text-error hover:bg-error-container text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ml-1"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              <span>退出房间</span>
            </button>
          </div>
        </header>

        {/* Mystery Word Clue Banner */}
        <div className="h-13 px-6 bg-surface-container-low border-b border-surface-container flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Active Drawer Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest border border-surface-container shadow-xs">
              <div className="relative">
                <img className="w-7 h-7 rounded-full object-cover ring-1 ring-primary" alt="小明" src="https://api.dicebear.com/7.x/bottts/svg?seed=XiaoMing" />
                <span className="absolute -top-1 -right-1 text-[8px] bg-rose-500 text-white font-black px-1 rounded-full">LIVE</span>
              </div>
              <div className="text-xs">
                <span className="font-black text-on-surface">小明</span>
                <span className="text-[10px] text-primary font-bold ml-1">画手全能人</span>
                <span className="text-[10px] text-outline ml-1">· 正在实时绘制中... (画笔飞速移动中)</span>
              </div>
            </div>

            {/* Category Clue */}
            <span className="px-3 py-1 rounded-full bg-primary-fixed text-primary font-bold text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">category</span>
              <span>提示类别: 游乐场设施 · 4个字</span>
            </span>

            {/* Character Clue Slots */}
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-base shadow-xs animate-pulse">
                {revealedHint}
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-bold text-outline">
                {hasGuessedCorrect ? '转' : '_'}
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-bold text-outline">
                {hasGuessedCorrect ? '木' : '_'}
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-lowest border-2 border-dashed border-outline-variant flex items-center justify-center font-bold text-outline">
                {hasGuessedCorrect ? '马' : '_'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRevealedHint('旋');
                alert('已向画手申请线索，首字【旋】已揭示！');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-highest hover:bg-primary hover:text-white text-primary text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px] text-amber-500">lightbulb</span>
              <span>申请字数提示 (2/3)</span>
            </button>

            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>防剧透保护已生效</span>
            </div>
          </div>
        </div>

        {/* 3-Column Desktop Body Stage */}
        <div className="flex-1 min-h-0 flex overflow-hidden p-3 gap-3">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Realtime Scoreboard                           */}
          {/* ========================================================= */}
          <aside className="w-64 xl:w-72 shrink-0 bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between p-3 overflow-hidden">
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 border-b border-surface-container">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
                  <h4 className="font-label-md text-sm font-black text-on-surface">实时积分榜</h4>
                </div>
                <span className="text-[11px] font-bold text-outline">6 人本局</span>
              </div>

              {/* Player Ranking List */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scroll">
                {/* 1. Aya */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-tertiary-fixed-dim/60 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-xs text-amber-500 w-3 text-center">1</span>
                    <div className="relative">
                      <img className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-400" alt="阿雅" src="https://api.dicebear.com/7.x/bottts/svg?seed=Aya" />
                      <span className="absolute -bottom-1 -right-1 text-[9px] bg-emerald-500 text-white rounded-full px-0.5">✓</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-on-surface truncate">阿雅</span>
                        <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-700 font-bold">首中</span>
                      </div>
                      <span className="text-[10px] text-tertiary font-bold">已猜中第1名 (+100)</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-primary">420</div>
                    <span className="text-[9px] text-outline">分</span>
                  </div>
                </div>

                {/* 2. Self (HaoHao) */}
                <div className="p-2 rounded-xl bg-primary-fixed/30 border-2 border-primary flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-xs text-primary w-3 text-center">2</span>
                    <div className="relative">
                      <img className="w-8 h-8 rounded-full object-cover ring-2 ring-primary" alt="浩浩" src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-primary truncate">你 (浩浩)</span>
                        <span className="text-[9px] px-1 rounded bg-primary text-white font-bold">当前我</span>
                      </div>
                      <span className="text-[10px] text-primary font-bold">
                        {hasGuessedCorrect ? '已猜中答案！' : '极速思考中...'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-primary">
                      {hasGuessedCorrect ? '450' : '350'}
                    </div>
                    <span className="text-[9px] text-outline">分</span>
                  </div>
                </div>

                {/* 3. Xiao Ming (Spectator ranking) */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-xs text-outline w-3 text-center">3</span>
                    <img className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-variant" alt="浩浩" src="https://api.dicebear.com/7.x/bottts/svg?seed=Bot3" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-on-surface truncate block">洛洛</span>
                      <span className="text-[10px] text-on-surface-variant">试错思考中 [5次]</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-on-surface">290</div>
                    <span className="text-[9px] text-outline">分</span>
                  </div>
                </div>

                {/* 4. TangTang */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-xs text-outline w-3 text-center">4</span>
                    <img className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-variant" alt="糖糖" src="https://api.dicebear.com/7.x/bottts/svg?seed=TangTang" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-on-surface truncate block">糖糖</span>
                      <span className="text-[10px] text-secondary font-bold">快接近了！</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-on-surface">240</div>
                    <span className="text-[9px] text-outline">分</span>
                  </div>
                </div>

                {/* 5. Painter XiaoMing */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-xs text-outline w-3 text-center">5</span>
                    <img className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-variant" alt="小明" src="https://api.dicebear.com/7.x/bottts/svg?seed=XiaoMing" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-on-surface truncate block">小明 (画手)</span>
                      <span className="text-[10px] text-outline">本轮不计算积分</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-on-surface">210</div>
                    <span className="text-[9px] text-outline">分</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Invite */}
            <div className="pt-2 border-t border-surface-container flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + '/room/room_idavoll_demo');
                  alert('房间邀请链接已复制到剪贴板！');
                }}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">group_add</span>
                <span>快来一起开黑画画 Invite Friend</span>
              </button>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* CENTER COLUMN: Spectator Canvas & Guessing Stage           */}
          {/* ========================================================= */}
          <main className="flex-1 min-w-0 flex flex-col justify-between gap-3 overflow-hidden">
            {/* The Spectator Canvas Card */}
            <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-2xl border border-surface-container shadow-md relative overflow-hidden flex flex-col justify-between">
              {/* Canvas Header */}
              <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md border border-surface-container text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-on-surface">羁绊实时同步画板</span>
                  <span className="text-outline font-normal">| 笔画: 细圆·圆润/带喷粉</span>
                </div>

                <div className="flex items-center gap-1 bg-surface-container-lowest/90 backdrop-blur-md p-1 rounded-full border border-surface-container shadow-xs">
                  <button type="button" className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface" title="历史回放">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-primary hover:bg-surface-container"
                    title="全屏画布"
                  >
                    <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                  </button>
                </div>
              </div>

              {/* Real Spectator Canvas */}
              <div className="w-full h-full relative flex items-center justify-center bg-white overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413FD6 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                ></div>

                <DrawBoard
                  strokes={currentStrokes}
                  isDrawer={false}
                  width={1400}
                  height={900}
                  className="w-full h-full border-0 rounded-none z-10 pointer-events-none"
                />

                {/* Floating Danmaku Bubbles on Desktop Canvas */}
                <div className="absolute top-16 left-8 pointer-events-none z-20 space-y-2">
                  <div className="bg-surface-container-highest/90 backdrop-blur-md text-on-surface px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-block">
                    浩浩: 这是小马吗？旋转木马？？
                  </div>
                  <br />
                  <div className="bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-block">
                    阿雅: 妙极！太生动啦哈哈哈哈！
                  </div>
                </div>

                {floatingEmojis.map((item) => (
                  <div key={item.id} className="absolute bottom-10 right-14 pointer-events-none flex flex-col items-center z-20">
                    <span className="emoji-float text-3xl select-none">{item.emoji}</span>
                  </div>
                ))}
              </div>

              {/* Quick Reaction Bar Under Canvas */}
              <div className="px-4 py-2 bg-surface-container-low/95 border-t border-surface-container flex items-center justify-between text-xs z-20">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-outline">快捷互动:</span>
                  <button
                    type="button"
                    onClick={() => triggerFloatingEmoji('👏')}
                    className="px-3 py-1 rounded-full bg-surface-container-lowest hover:bg-surface-variant active:scale-95 text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <span>👏</span>
                    <span>给力 (12)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFloatingEmoji('😂')}
                    className="px-3 py-1 rounded-full bg-surface-container-lowest hover:bg-surface-variant active:scale-95 text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <span>😂</span>
                    <span>抽象画手 (15)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFloatingEmoji('❤️')}
                    className="px-3 py-1 rounded-full bg-surface-container-lowest hover:bg-surface-variant active:scale-95 text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <span>❤️</span>
                    <span>秒懂 (13)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFloatingEmoji('❓')}
                    className="px-3 py-1 rounded-full bg-surface-container-lowest hover:bg-surface-variant active:scale-95 text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <span>❓</span>
                    <span>猜不透 (3)</span>
                  </button>
                </div>

                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  120 FPS 极速低延迟
                </span>
              </div>
            </div>

            {/* High-Frequency Desktop Guessing Bar */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-md p-3 flex flex-col gap-2 shrink-0">
              <form onSubmit={handleGuessSubmit} className="flex items-center gap-3">
                <div className="flex-1 relative flex items-center bg-surface-container-low border border-outline-variant/60 rounded-full px-4 py-2.5">
                  <span className="material-symbols-outlined text-[20px] text-primary mr-2">edit</span>
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    placeholder={hasGuessedCorrect ? '已猜中答案！可继续在聊天框为好友助威~' : '输入你的猜测 (直接按 Enter 提交)...'}
                    disabled={hasGuessedCorrect}
                    className="w-full bg-transparent text-sm font-bold text-on-surface placeholder:text-outline focus:outline-none"
                  />
                  <span className="text-[11px] text-outline font-bold shrink-0 ml-2">剩余 8 次机会</span>
                </div>

                <button
                  type="submit"
                  disabled={hasGuessedCorrect || !guessInput.trim()}
                  className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-container text-white font-black text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>提交猜词 (Enter)</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>

              {/* Hot Guess Tags */}
              <div className="flex items-center gap-2 pt-1 border-t border-surface-container text-xs">
                <span className="text-outline font-bold shrink-0">热门候选快捷输入:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {desktopQuickPhrases.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => setGuessInput(phrase)}
                      className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-variant text-primary font-bold transition-colors cursor-pointer"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-tertiary ml-auto font-bold flex items-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">psychology</span>
                  AI 语义联想已开启
                </span>
              </div>
            </div>
          </main>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Live Guessing Log & Chat Stream             */}
          {/* ========================================================= */}
          <aside className="w-80 xl:w-88 shrink-0 bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between p-3 overflow-hidden">
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 border-b border-surface-container">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">chat</span>
                  <h4 className="font-label-md text-sm font-black text-on-surface">实时猜词流</h4>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {/* Anti-spoiler banner */}
              <div className="p-2 rounded-xl bg-surface-container-low text-[11px] text-on-surface-variant font-bold border border-surface-container flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">lock</span>
                <span>猜中答案将自动转为 *** 隐藏并加分，严防剧透！</span>
              </div>

              {/* Stream Cards */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scroll text-xs">
                <div className="text-center text-[10px] text-outline font-bold py-1">
                  第 2 轮已开始 · 题目为4字词语
                </div>

                {guessFeed.map((item) => {
                  if (item.type === 'system_clue') {
                    return (
                      <div key={item.id} className="p-2 rounded-xl bg-surface-container-low text-[11px] font-bold text-primary flex items-center gap-1.5 border-l-2 border-primary">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        <span>{item.text}</span>
                      </div>
                    );
                  }
                  if (item.type === 'wrong_guess') {
                    return (
                      <div key={item.id} className="flex items-start gap-2">
                        <img className="w-6 h-6 rounded-full object-cover shrink-0" alt="玩家" src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-on-surface-variant text-[11px] block">{item.sender}</span>
                          <div className="inline-flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-xl mt-0.5 text-on-surface font-semibold">
                            <span>{item.content}</span>
                            <span className="text-error font-bold text-[10px]">❌ 不对</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (item.type === 'close_guess') {
                    return (
                      <div key={item.id} className="flex items-start gap-2">
                        <img className="w-6 h-6 rounded-full object-cover shrink-0" alt="玩家" src="https://api.dicebear.com/7.x/bottts/svg?seed=TangTang" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-on-surface-variant text-[11px] block">{item.sender}</span>
                          <div className="inline-flex items-center gap-1.5 bg-secondary-fixed/30 border border-secondary/20 px-2.5 py-1 rounded-xl mt-0.5 text-secondary font-semibold">
                            <span>{item.content}</span>
                            <span className="font-bold text-[10px]">❗ 很接近了</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (item.type === 'correct_guess') {
                    return (
                      <div key={item.id} className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎉</span>
                          <div>
                            <div className="font-black text-on-surface">{item.sender}</div>
                            <div className="text-[10px] text-tertiary font-bold">{item.text}</div>
                          </div>
                        </div>
                        <span className="text-sm font-black text-tertiary font-mono">{item.score}</span>
                      </div>
                    );
                  }
                  if (item.type === 'chat_msg') {
                    return (
                      <div key={item.id} className="p-2 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold">
                        <span className="font-bold text-primary mr-1">{item.sender}:</span>
                        <span>{item.content}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Bottom Push to Talk & Volume */}
            <div className="pt-2 border-t border-surface-container flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">{isMuted ? 'mic_off' : 'mic'}</span>
                <span>{isMuted ? '按住空格说话 (Push to Talk)' : '正在通话中 (再次点击静音)'}</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-outline px-1">
                <span>队友音量:</span>
                <input type="range" min="0" max="100" defaultValue="85" className="w-32 accent-primary cursor-pointer" />
                <span>85%</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Shortcut Toast */}
        <div className="h-7 bg-surface-container-lowest border-t border-surface-container px-6 flex items-center justify-center text-[10px] text-outline shrink-0">
          <div className="flex items-center gap-2">
            <span>快捷键: 猜词 <kbd className="px-1.5 py-0.2 rounded bg-surface-container text-on-surface font-mono font-bold">Enter</kbd></span>
            <span>·</span>
            <span>抢答连麦: 长按 <kbd className="px-1.5 py-0.2 rounded bg-surface-container text-on-surface font-mono font-bold">Space</kbd> 语音</span>
          </div>
        </div>
      </div>

      {/* Reusable InGameChatDrawer for Mobile */}
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
