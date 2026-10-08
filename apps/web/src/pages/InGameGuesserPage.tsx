import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Timer,
  Maximize2,
  Minimize2,
  Trophy,
  Send,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  MessageSquare,
  Zap,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Avatar,
  DrawBoard,
  ChatWindow,
  InGameChatDrawer,
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
  const [timeLeft, setTimeLeft] = useState(48);
  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState(true);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const handleSendMessage = (content: string, isDanmaku?: boolean) => {
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
  };

  const toggleFullscreenMode = () => {
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

  const [revealedHint, setRevealedHint] = useState('旋');
  const [guessHistory, setGuessHistory] = useState([
    { id: 'h1', text: '🎉 系统：阿雅 (Aya) 猜中了正确答案！(+100分)', type: 'correct' },
    { id: 'h2', text: '浩浩 (你)：碰碰车？ ❌ 不对', type: 'wrong' },
    { id: 'h3', text: '糖糖：摩天轮？ ❌ 差一点', type: 'close' },
    { id: 'h4', text: '系统：画手 小明 使用了提示卡，公布首字「旋」', type: 'system' },
  ]);

  const quickPhrases = ['💡 申请提示', '🎠 旋转木马', '🎡 摩天轮', '🏎️ 碰碰车', '👏 太像了！'];
  const reactionEmojis = ['👏', '😂', '❤️', '🔥', '🎉'];

  const sendReaction = (emoji: string) => {
    handleSendMessage(emoji, true);
  };

  const requestHint = () => {
    setRevealedHint('旋');
    handleSendMessage('💡 浩浩 向画手申请了字数线索！', false);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-background select-none touch-none overscroll-none">
      {/* =========================================================================
          FULLSCREEN GUESSER IMMERSION MODE (切换全屏功能)
         ========================================================================= */}
      {isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden touch-none overscroll-none select-none">
          {/* Floating Top Controls HUD */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-30 flex items-center justify-between pointer-events-none pt-safe">
            <div className="flex items-center gap-2 pointer-events-auto">
              <Badge className="bg-[var(--theme-primary,#5B5BF0)] text-white border-0 font-black px-3 py-1 text-xs shadow-md">
                🔍 猜词全屏沉浸
              </Badge>
              {/* Word Hint Character Slots */}
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-bold shadow-xs">
                <span className="text-[10px] opacity-80 mr-1">{gameState?.wordCategory || '游乐场设施'}:</span>
                <span className="w-5 h-5 rounded bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
                  {revealedHint}
                </span>
                <span className="w-5 h-5 rounded bg-white/30 flex items-center justify-center font-black text-xs">
                  _
                </span>
                <span className="w-5 h-5 rounded bg-white/30 flex items-center justify-center font-black text-xs">
                  _
                </span>
                <span className="w-5 h-5 rounded bg-white/30 flex items-center justify-center font-black text-xs">
                  _
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/80 backdrop-blur-md text-white text-xs font-mono font-black shadow-md">
                <Timer className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>

              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(true)}
                className="relative w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center cursor-pointer shadow-md"
                title="打开聊天"
              >
                <MessageSquare className="w-4 h-4" />
                {messages.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              <Button
                size="sm"
                variant="surface"
                onClick={toggleFullscreenMode}
                className="h-8 px-3 text-xs gap-1 font-bold bg-white/20 hover:bg-white/30 text-white border-0 shadow-md backdrop-blur-md cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>退出全屏</span>
              </Button>
            </div>
          </div>

          {/* Canvas with Danmaku */}
          <div className="relative flex-1 w-full h-full">
            <DanmakuOverlay
              items={messages.map((m) => ({
                id: m.payload.id,
                text: m.payload.content,
                color: m.payload.color || '#5B5BF0',
                fontSize: 18,
                topPercent: Math.random() * 55 + 15,
                senderNickname: m.payload.senderNickname,
                timestamp: m.timestamp,
              }))}
              enabled={true}
            />

            <DrawBoard
              strokes={currentStrokes}
              isDrawer={false}
              width={1280}
              height={960}
              className="w-full h-full rounded-none border-0 pointer-events-none"
            />

            {/* Floating Floating Reaction Emojis in Fullscreen */}
            <div className="absolute right-3 bottom-20 z-30 flex flex-col gap-1.5 pointer-events-auto">
              {reactionEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-lg active:scale-125 transition-transform shadow-md cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Floating Bottom Guess Bar in Fullscreen */}
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-3 z-30 pb-safe">
            <form
              onSubmit={handleGuessSubmit}
              className="p-1.5 bg-card/95 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl flex items-center gap-1.5"
            >
              <div className="pl-3 text-xs font-black text-[var(--theme-primary,#5B5BF0)] shrink-0">
                🚀 抢答:
              </div>

              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder={hasGuessedCorrect ? '已猜对！可继续为好友加油~' : '输入你的猜测词（如：旋转木马）...'}
                disabled={hasGuessedCorrect}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              <Button
                type="submit"
                size="sm"
                disabled={hasGuessedCorrect || !guessInput.trim()}
                className="h-9 px-5 font-black gap-1 shrink-0 rounded-full bg-[var(--theme-primary,#5B5BF0)] text-white"
              >
                <Send className="w-3.5 h-3.5" />
                <span>猜词</span>
              </Button>
            </form>
          </div>
        </div>
      ) : (
        /* =========================================================================
            STANDARD GUESSER MODE (你画我猜-猜题者界面 - 6eb7224b014e469d9bd9d93ef5d011a5)
            Strictly 100dvh, zero page scroll!
           ========================================================================= */
        <>
          {/* Top Header HUD (Stitch standard height 52px) */}
          <header className="h-13 shrink-0 px-3 sm:px-4 flex items-center justify-between border-b border-border/80 bg-card/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/room/room_idavoll_demo')}
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                title="退出房间"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black font-mono text-[var(--theme-primary,#5B5BF0)]">
                    #84920
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    第 2/5 轮
                  </span>
                  <Badge variant="mint" className="font-black text-[10px] px-1.5 py-0 shrink-0">
                    猜词者
                  </Badge>
                </div>
                <div className="text-xs font-bold text-foreground truncate">
                  当前画手:{' '}
                  <span className="font-black text-[var(--theme-primary,#5B5BF0)]">
                    {gameState?.drawerNickname || '小明'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right HUD status and buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Round Countdown Timer */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-xs sm:text-sm shadow-xs">
                <Timer className="w-3.5 h-3.5 animate-spin" />
                <span className="font-mono">{timeLeft}s</span>
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreenMode}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-full bg-[var(--theme-primary,#5B5BF0)]/10 hover:bg-[var(--theme-primary,#5B5BF0)]/20 text-[var(--theme-primary,#5B5BF0)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="全屏查看画板"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="text-xs">全屏</span>
              </button>

              {/* Mobile Chat Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(true)}
                className="lg:hidden relative w-8 h-8 rounded-full bg-[var(--theme-primary,#5B5BF0)] text-white flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-transform"
                title="打开聊天与语音"
              >
                <MessageSquare className="w-4 h-4" />
                {messages.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-card" />
                )}
              </button>
            </div>
          </header>

          {/* Word Hint Card & Character Slots (Crucial for Guesser in Stitch design) */}
          <div className="shrink-0 px-3 py-1.5 bg-card/60 border-b border-border/40 flex items-center justify-between gap-2 z-15">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold text-muted-foreground shrink-0">
                提示类别:
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-[var(--theme-primary,#5B5BF0)]/10 text-[var(--theme-primary,#5B5BF0)] shrink-0">
                {gameState?.wordCategory || '游乐场设施'} / 4个字
              </span>

              {/* Character Box Slots */}
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className="w-6 h-6 rounded-md bg-[var(--theme-primary,#5B5BF0)] text-white flex items-center justify-center font-black text-xs shadow-xs border border-[var(--theme-primary,#5B5BF0)] animate-pulse">
                  {revealedHint}
                </span>
                <span className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center font-bold text-xs text-muted-foreground">
                  _
                </span>
                <span className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center font-bold text-xs text-muted-foreground">
                  _
                </span>
                <span className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center font-bold text-xs text-muted-foreground">
                  _
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={requestHint}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>申请提示</span>
            </button>
          </div>

          {/* Horizontal Player Seats Strip (Avatars + Scores + Guessed Checkmarks) */}
          <div className="shrink-0 px-3 py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-muted/15 border-b border-border/40 z-10">
            {currentScores.map((score, idx) => {
              const isDrawerPlayer = score.nickname.includes('小明') || score.playerId === gameState?.drawerId;
              const isMe = score.playerId === userId;
              return (
                <div
                  key={score.playerId}
                  className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all text-xs ${
                    isMe
                      ? 'bg-[var(--theme-primary,#5B5BF0)]/15 border-[var(--theme-primary,#5B5BF0)]/40 text-foreground font-black'
                      : isDrawerPlayer
                      ? 'bg-amber-500/10 border-amber-500/30 text-foreground font-bold'
                      : score.hasGuessedCorrectly
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground font-bold'
                      : 'bg-card border-border/80 text-foreground'
                  }`}
                >
                  <Avatar src={score.avatar} alt={score.nickname} size="xs" />
                  <span className="text-[11px] font-bold truncate max-w-[55px] sm:max-w-[70px]">
                    {score.nickname}
                  </span>
                  <span className="text-[10px] font-mono font-black text-[var(--theme-primary,#5B5BF0)]">
                    {score.score}
                  </span>

                  {score.hasGuessedCorrectly && (
                    <span className="px-1 py-0 rounded-full bg-emerald-500 text-white text-[9px] font-black">
                      ✓
                    </span>
                  )}
                  {isDrawerPlayer && (
                    <span className="px-1 py-0 rounded-full bg-amber-500 text-white text-[9px] font-black">
                      🎨
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Content Area (Strictly flex-1 min-h-0: Fits remaining screen with NO page scroll) */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3">
            {/* Left: Leaderboard & Voice Dock (Desktop only) */}
            <div className="hidden lg:flex flex-col w-64 shrink-0 space-y-3">
              <Card className="p-3.5 flex-1 flex flex-col space-y-2 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-border shrink-0">
                  <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>实时积分榜</span>
                  </span>
                  <Badge variant="subtle" className="text-[10px]">
                    {currentScores.length} 玩家
                  </Badge>
                </div>

                <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                  {currentScores.map((score, idx) => (
                    <div
                      key={score.playerId}
                      className={`flex items-center justify-between p-2 rounded-xl transition-all ${
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
                          <h6 className="text-xs font-bold text-foreground truncate max-w-[80px]">
                            {score.nickname}
                          </h6>
                          {score.hasGuessedCorrectly && (
                            <span className="text-[10px] font-bold text-emerald-500">已猜对 ✓</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black font-mono text-[var(--theme-primary,#5B5BF0)]">
                        {score.score}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="shrink-0 pt-2 border-t border-border">
                  <VoiceDock
                    players={room?.players || []}
                    currentUserId={userId}
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                    speakingUserIds={speakingUserIds}
                  />
                </div>
              </Card>
            </div>

            {/* Center Canvas + Direct Live Guess Feed Area */}
            <div className="flex-1 min-h-0 flex flex-col relative w-full h-full gap-1.5">
              {/* Drawing Board Container (Spectator View) */}
              <div className="relative flex-1 min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-border bg-white dark:bg-slate-900">
                {/* Floating Drawer Status Badge */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-foreground">
                    {gameState?.drawerNickname || '小明'} 正在实时绘制中... ✍️
                  </span>
                </div>

                {/* Floating Danmaku Switch & Reactions on Canvas */}
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                  {reactionEmojis.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendReaction(emoji)}
                      className="w-7 h-7 rounded-full bg-card/80 hover:bg-card backdrop-blur-md flex items-center justify-center text-xs active:scale-125 transition-transform shadow-xs cursor-pointer border border-border"
                      title="发送互动表情"
                    >
                      {emoji}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsDanmakuEnabled(!isDanmakuEnabled)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer backdrop-blur-md shadow-xs ${
                      isDanmakuEnabled
                        ? 'bg-card/90 text-[var(--theme-primary,#5B5BF0)] border-[var(--theme-primary,#5B5BF0)]/30'
                        : 'bg-card/60 text-muted-foreground border-border'
                    }`}
                  >
                    {isDanmakuEnabled ? '🚀' : '关'}
                  </button>
                </div>

                {/* Realtime Danmaku Barrage */}
                <DanmakuOverlay
                  items={messages.map((m) => ({
                    id: m.payload.id,
                    text: m.payload.content,
                    color: m.payload.color || '#5B5BF0',
                    fontSize: 16,
                    topPercent: Math.random() * 60 + 15,
                    senderNickname: m.payload.senderNickname,
                    timestamp: m.timestamp,
                  }))}
                  enabled={isDanmakuEnabled}
                />

                {/* Drawing Board */}
                <DrawBoard
                  strokes={currentStrokes}
                  isDrawer={false}
                  width={1000}
                  height={750}
                  className="w-full h-full pointer-events-none"
                />

                {/* Correct guess celebration banner overlay */}
                <AnimatePresence>
                  {hasGuessedCorrect && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: -10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-xl flex items-center gap-1.5 z-30"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>🎉 恭喜！你已猜出正确答案！等待本轮结束</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Direct Visible Guess & Chat Feed (画板下方历史聊天与猜词记录 - Stitch Screen 4) */}
              <div className="shrink-0 h-16 sm:h-20 bg-muted/30 rounded-xl sm:rounded-2xl border border-border/60 p-1.5 sm:p-2 overflow-y-auto no-scrollbar flex flex-col gap-1 text-[11px]">
                {guessHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`px-2 py-0.5 rounded-md flex items-center justify-between font-bold leading-tight ${
                      item.type === 'correct'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        : item.type === 'close'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : item.type === 'system'
                        ? 'bg-[var(--theme-primary,#5B5BF0)]/10 text-[var(--theme-primary,#5B5BF0)]'
                        : 'bg-card text-foreground border border-border/40'
                    }`}
                  >
                    <span className="truncate">{item.text}</span>
                    <span className="text-[9px] text-muted-foreground ml-1 shrink-0">刚刚</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Reusable Chat Window (Desktop only) */}
            <div className="hidden lg:flex flex-col w-80 shrink-0">
              <ChatWindow
                messages={messages}
                currentUserId={userId}
                onSendMessage={handleSendMessage}
                title="实时猜词流与聊天"
                placeholder="输入猜测或与好友畅聊..."
                className="flex-1"
              />
            </div>
          </div>

          {/* Bottom Guess & Interaction Dock (黄金触控区 - Guesser Core Controls) */}
          <footer className="shrink-0 px-2 sm:px-4 py-2 bg-card/95 backdrop-blur-md border-t border-border z-20 pb-safe">
            <div className="max-w-4xl mx-auto flex flex-col gap-1.5">
              {/* Quick Phrases / Category suggestions */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {quickPhrases.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => {
                      if (phrase.includes('申请提示')) {
                        requestHint();
                      } else {
                        setGuessInput(phrase.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, ''));
                      }
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-[11px] font-bold text-foreground border border-border/60 active:scale-95 transition-all cursor-pointer"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* High-priority Guess input form */}
              <form onSubmit={handleGuessSubmit} className="flex items-center gap-2">
                {/* Voice & Quick trigger button */}
                <button
                  type="button"
                  onClick={() => setIsChatDrawerOpen(true)}
                  className="w-10 h-10 rounded-full bg-muted/80 hover:bg-muted text-foreground flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  title="语音与聊天"
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                </button>

                {/* Guess input */}
                <div className="relative flex-1">
                  <Input
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    placeholder={hasGuessedCorrect ? '已猜中！可为好友加油~' : '输入你的猜测词（如：旋转木马）...'}
                    disabled={hasGuessedCorrect}
                    className="h-10 font-bold text-xs sm:text-sm rounded-full pl-3.5 pr-3 border-border/80 bg-muted/40 focus:bg-background"
                  />
                </div>

                {/* Send / Guess Submit button */}
                <Button
                  type="submit"
                  disabled={hasGuessedCorrect || !guessInput.trim()}
                  className="h-10 px-5 rounded-full font-black text-xs sm:text-sm gap-1 whitespace-nowrap shadow-md shrink-0 bg-[var(--theme-primary,#5B5BF0)] text-white hover:opacity-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>猜词</span>
                </Button>
              </form>
            </div>
          </footer>
        </>
      )}

      {/* Reusable InGameChatDrawer (Exact Stitch replication) */}
      <InGameChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        currentUserId={userId}
        onSendMessage={handleSendMessage}
        players={room?.players || []}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        speakingUserIds={speakingUserIds}
        roomCode="84920"
        roundInfo="第 2/5 轮"
        currentDrawerNickname={gameState?.drawerNickname || '小明'}
        isDrawer={false}
      />
    </div>
  );
};

