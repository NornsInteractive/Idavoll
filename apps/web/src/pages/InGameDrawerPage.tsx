import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  Maximize2,
  Trophy,
  Users,
  ChevronLeft,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  HelpCircle,
  Flag,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Avatar,
  DrawBoard,
  PaletteBar,
  ChatWindow,
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 flex-1 flex flex-col">
      {/* Top Game Navigation & Status Bar */}
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
              <Badge variant="secondary" className="font-black text-xs px-2.5">
                正在作画
              </Badge>
              <span className="text-xs font-bold text-muted-foreground">
                第 1 / 3 轮
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-foreground">
              你的题目: <span className="text-[var(--theme-primary,#5B5BF0)] text-xl font-black underline decoration-wavy decoration-indigo-400">【{currentWord}】</span>
              <span className="text-xs text-muted-foreground font-normal ml-2">(水果食物 · 2个字)</span>
            </h3>
          </div>
        </div>

        {/* Center / Right Timer & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Round Countdown Timer */}
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-base shadow-sm">
            <Timer className="w-4 h-4 animate-spin" />
            <span className="font-mono">{timeLeft}s</span>
          </div>

          {/* Fullscreen Mode Button */}
          <Button
            size="sm"
            variant="surface"
            onClick={() => navigate('/game/fullscreen')}
            className="h-10 px-3 text-xs gap-1 font-bold"
            title="沉浸全屏画板"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">全屏弹幕</span>
          </Button>

          {/* End round test trigger */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/game/result')}
            className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">结算</span>
          </Button>
        </div>
      </div>

      {/* Main Interactive Board & Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[540px]">
        {/* Left: Player Leaderboard (Desktop) */}
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
                      : 'bg-muted/40 hover:bg-muted/70'
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

            {/* In-Game Voice Dock */}
            <VoiceDock
              players={room?.players || []}
              currentUserId={userId}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              speakingUserIds={speakingUserIds}
            />
          </Card>
        </div>

        {/* Center: Canvas & Tool Palette */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          {/* Drawing Canvas Container */}
          <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] rounded-3xl overflow-hidden shadow-xl border border-border">
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
              onStrokeComplete={(stroke) => addStroke(stroke)}
              currentColor={currentColor}
              currentSize={currentSize}
              isEraser={isEraser}
              isDrawer={true}
              width={1000}
              height={750}
              className="w-full h-full"
            />
          </div>

          {/* Palette Bar Tools */}
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

        {/* Right: Reusable Chat Window */}
        <div className="h-[360px] lg:h-auto flex flex-col">
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
    </div>
  );
};
