import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Timer,
  Maximize2,
  Trophy,
  Send,
  Sparkles,
  HelpCircle,
  ChevronLeft,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Avatar,
  DrawBoard,
  ChatWindow,
  DanmakuOverlay,
  VoiceDock,
  Input,
} from '@idavoll/ui';
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
  const [timeLeft, setTimeLeft] = useState(52);
  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState(true);

  useEffect(() => {
    if (!gameState) {
      initDemoGame(userId, false);
    }
  }, [gameState, userId, initDemoGame]);

  // Timer countdown
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
  const currentScores = gameState?.scores || [];

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || hasGuessedCorrect) return;

    const trimmed = guessInput.trim();
    const isCorrect = submitGuess(trimmed, userId, nickname);

    // Also add to chat / danmaku
    addMessage({
      version: 'v1',
      seq: Date.now(),
      timestamp: Date.now(),
      senderId: userId,
      type: 'chat:message',
      payload: {
        id: `msg_${Date.now()}`,
        type: isCorrect ? 'correct_guess' : 'guess',
        content: isCorrect ? `🎉 猜对了！答案就是【${currentWord}】` : trimmed,
        senderNickname: nickname,
        senderAvatar: avatar,
        isDanmaku: true,
      },
    });

    if (isCorrect) {
      setHasGuessedCorrect(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setGuessInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 flex-1 flex flex-col">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/room/room_idavoll_demo')}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Badge variant="mint" className="font-black text-xs px-2.5">
                猜词者视角
              </Badge>
              <span className="text-xs font-bold text-muted-foreground">
                画手: {gameState?.drawerNickname || '画画小能手'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-foreground">
              提示: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold tracking-widest text-lg">_ _</span>
              <span className="text-xs text-muted-foreground font-normal ml-2">
                (分类: {gameState?.wordCategory || '水果食物'} · {currentWord.length} 个字)
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-base shadow-sm">
            <Timer className="w-4 h-4 animate-spin" />
            <span className="font-mono">{timeLeft}s</span>
          </div>

          <Button
            size="sm"
            variant="surface"
            onClick={() => navigate('/game/fullscreen')}
            className="h-10 px-3 text-xs gap-1 font-bold"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">全屏弹幕</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/game/result')}
            className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            结算
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[540px]">
        {/* Left: Leaderboard (Desktop) */}
        <div className="hidden lg:flex flex-col space-y-3">
          <Card className="p-4 flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>实时积分榜</span>
              </span>
              <Badge variant="subtle" className="text-[10px]">
                {currentScores.length} 玩家
              </Badge>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {currentScores.map((score, idx) => (
                <div
                  key={score.playerId}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                    score.playerId === userId
                      ? 'bg-[var(--theme-primary,#5B5BF0)]/15 border border-[var(--theme-primary,#5B5BF0)]/30'
                      : 'bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-muted-foreground w-4 text-center">
                      {idx + 1}
                    </span>
                    <Avatar src={score.avatar} alt={score.nickname} size="sm" />
                    <div>
                      <h6 className="text-xs font-bold text-foreground truncate max-w-[90px]">
                        {score.nickname}
                      </h6>
                      {score.hasGuessedCorrectly && (
                        <span className="text-[10px] font-bold text-emerald-500">已猜对 ✓</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-[var(--theme-primary,#5B5BF0)]">
                    {score.score}
                  </span>
                </div>
              ))}
            </div>

            <VoiceDock
              players={room?.players || []}
              currentUserId={userId}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              speakingUserIds={speakingUserIds}
            />
          </Card>
        </div>

        {/* Center: Realtime Canvas & Guess Input */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] rounded-3xl overflow-hidden shadow-xl border border-border bg-white dark:bg-slate-900">
            <DanmakuOverlay
              items={messages.map((m) => ({
                id: m.payload.id,
                text: m.payload.content,
                color: m.payload.color || '#5B5BF0',
                fontSize: 16,
                topPercent: Math.random() * 70 + 10,
                senderNickname: m.payload.senderNickname,
                timestamp: m.timestamp,
              }))}
              enabled={isDanmakuEnabled}
            />

            <DrawBoard
              strokes={currentStrokes}
              isDrawer={false}
              width={1000}
              height={750}
              className="w-full h-full pointer-events-none"
            />

            {/* Correct guess banner overlay */}
            <AnimatePresence>
              {hasGuessedCorrect && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-emerald-500 text-white font-black text-sm shadow-xl flex items-center gap-2 z-30"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>恭喜！你已猜出正确答案！等待本轮结束</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Guess Input Box */}
          <Card className="p-3 bg-card/90 backdrop-blur-md">
            <form onSubmit={handleGuessSubmit} className="flex items-center gap-2">
              <Input
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder={hasGuessedCorrect ? '你已猜中！可继续在聊天框为好友加油~' : '输入你的猜测，回车提交抢答...'}
                disabled={hasGuessedCorrect}
                className="h-12 font-bold text-base"
              />
              <Button
                type="submit"
                disabled={hasGuessedCorrect || !guessInput.trim()}
                className="h-12 px-6 font-black gap-1.5 whitespace-nowrap shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{t('inGame.submitGuess')}</span>
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: Reusable Chat Window */}
        <div className="h-[360px] lg:h-auto flex flex-col">
          <ChatWindow
            messages={messages}
            currentUserId={userId}
            onSendMessage={(content, isDanmaku) => {
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
                  isDanmaku: !!isDanmaku,
                },
              });
            }}
            title="实时猜词流与聊天"
            placeholder="聊天或猜词..."
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};
