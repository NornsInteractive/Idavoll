import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Timer,
  Maximize2,
  Trophy,
  ChevronLeft,
  Flag,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Avatar,
  DrawBoard,
  PaletteBar,
  ChatWindow,
  InGameChatDrawer,
  DanmakuOverlay,
  VoiceDock,
} from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';

export const InGameDrawerPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { id: userId, nickname, avatar } = useUserStore();
  const { room, messages, addMessage, isMuted, toggleMute, speakingUserIds } = useRoomStore();
  const {
    gameState,
    currentWord,
    addStroke,
    undoStroke,
    clearStrokes,
    canUndo,
    initDemoGame,
  } = useGameStore();

  const [currentColor, setCurrentColor] = useState('#161A30');
  const [currentSize, setCurrentSize] = useState(8);
  const [isEraser, setIsEraser] = useState(false);
  const [timeLeft, setTimeLeft] = useState(58);
  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState(true);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  useEffect(() => {
    if (!gameState) {
      initDemoGame(userId, true);
    }
  }, [gameState, userId, initDemoGame]);

  // Countdown timer simulation
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

  const handleSendMessage = (content: string, isDanmaku?: boolean) => {
    addMessage({
      version: 'v1',
      seq: Date.now(),
      timestamp: Date.now(),
      senderId: userId,
      type: 'chat:message',
      payload: {
        id: `msg_${Date.now()}`,
        type: isDanmaku ? 'danmaku' : 'text',
        content,
        senderNickname: nickname,
        senderAvatar: avatar,
        isDanmaku: !!isDanmaku,
      },
    });
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-background select-none touch-none overscroll-none">
      {/* Top Game Navigation & Status Bar HUD */}
      <header className="h-14 shrink-0 px-3 sm:px-4 flex items-center justify-between border-b border-border/80 bg-card/90 backdrop-blur-md z-20">
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
              <Badge variant="secondary" className="font-black text-[11px] px-2 py-0 shrink-0">
                🎨 正在作画
              </Badge>
              <span className="text-[11px] font-bold text-muted-foreground">
                第 2/5 轮
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-foreground truncate">
              你的题目:{' '}
              <span className="text-[var(--theme-primary,#5B5BF0)] text-sm sm:text-base font-black underline decoration-wavy decoration-indigo-400">
                【{currentWord}】
              </span>
              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                ({gameState?.wordCategory || '日常事物'} · {currentWord.length}个字)
              </span>
            </h3>
          </div>
        </div>

        {/* Right HUD status and buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Round Countdown Timer */}
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-xs sm:text-sm shadow-xs">
            <Timer className="w-3.5 h-3.5 animate-spin" />
            <span className="font-mono">{timeLeft}s</span>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => navigate('/game/fullscreen')}
            className="w-8 h-8 sm:w-auto sm:px-2.5 rounded-full bg-muted/60 hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            title="沉浸全屏画板"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">全屏</span>
          </button>

          {/* Finish Round Button */}
          <button
            type="button"
            onClick={() => navigate('/game/result')}
            className="w-8 h-8 sm:w-auto sm:px-2.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            title="结束本轮"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">结算</span>
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

      {/* Horizontal Player Seats Strip */}
      <div className="shrink-0 px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar bg-muted/20 border-b border-border/40 z-10">
        <span className="text-[10px] font-black uppercase text-muted-foreground shrink-0 flex items-center gap-0.5">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span>猜题者:</span>
        </span>

        {currentScores.map((score, idx) => {
          const isMe = score.playerId === userId;
          return (
            <div
              key={score.playerId}
              className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all text-xs ${
                isMe
                  ? 'bg-amber-500/15 border-amber-500/40 text-foreground font-black'
                  : score.hasGuessedCorrectly
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-foreground font-bold'
                  : 'bg-card border-border/80 text-foreground'
              }`}
            >
              <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
              <Avatar src={score.avatar} alt={score.nickname} size="xs" />
              <span className="text-[11px] font-bold truncate max-w-[60px] sm:max-w-[80px]">
                {score.nickname}
              </span>
              <span className="text-[11px] font-mono font-black text-[var(--theme-primary,#5B5BF0)]">
                {score.score}
              </span>

              {score.hasGuessedCorrectly && (
                <span className="px-1 py-0 rounded-full bg-emerald-500 text-white text-[9px] font-black animate-bounce">
                  ✓ 已猜中
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content Area (Strictly flex-1 min-h-0: Fits viewport with NO scrolling) */}
      <div className="flex-1 min-h-0 flex overflow-hidden p-2 sm:p-3 gap-3">
        {/* Left: Player Leaderboard (Desktop only) */}
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
                      ? 'bg-amber-500/15 border border-amber-500/30'
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

        {/* Center: Live Drawing Canvas (Flex-1 dynamic height) */}
        <div className="flex-1 min-h-0 flex flex-col relative w-full h-full">
          <div className="relative flex-1 min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-border bg-white dark:bg-slate-900">
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

            {/* Drawing Canvas */}
            <DrawBoard
              strokes={currentStrokes}
              onStrokeComplete={(stroke) => addStroke(stroke)}
              currentColor={currentColor}
              currentSize={currentSize}
              isEraser={isEraser}
              isDrawer={true}
              width={1000}
              height={750}
              className="w-full h-full"
            />

            {/* Floating Danmaku Switch Chip */}
            <div className="absolute top-2.5 right-2.5 z-20">
              <button
                type="button"
                onClick={() => setIsDanmakuEnabled(!isDanmakuEnabled)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer backdrop-blur-md shadow-xs ${
                  isDanmakuEnabled
                    ? 'bg-card/90 text-[var(--theme-primary,#5B5BF0)] border-[var(--theme-primary,#5B5BF0)]/30'
                    : 'bg-card/60 text-muted-foreground border-border'
                }`}
              >
                {isDanmakuEnabled ? '🚀 弹幕开' : '弹幕关'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Reusable Chat Window (Desktop only) */}
        <div className="hidden lg:flex flex-col w-80 shrink-0">
          <ChatWindow
            messages={messages}
            currentUserId={userId}
            onSendMessage={handleSendMessage}
            title="实时猜词流与聊天"
            placeholder="与猜词玩家交流..."
            className="flex-1"
          />
        </div>
      </div>

      {/* Bottom Tool Palette Bar (Firmly docked at bottom safe-area) */}
      <footer className="shrink-0 px-2 sm:px-4 py-2 bg-card/95 backdrop-blur-md border-t border-border z-20 pb-safe">
        <div className="max-w-4xl mx-auto">
          <PaletteBar
            currentColor={currentColor}
            onColorChange={setCurrentColor}
            currentSize={currentSize}
            onSizeChange={setCurrentSize}
            isEraser={isEraser}
            onEraserToggle={setIsEraser}
            onUndo={undoStroke}
            onClear={clearStrokes}
            canUndo={canUndo}
          />
        </div>
      </footer>

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
        currentDrawerNickname={nickname}
        isDrawer={true}
      />
    </div>
  );
};
