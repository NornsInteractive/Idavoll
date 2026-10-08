import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Minimize2, Timer, Send, Smile, Sparkles, MessageSquare } from 'lucide-react';
import { DrawBoard, DanmakuOverlay, Button, Input, Badge } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';

export const InGameFullscreenPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { id: userId, nickname, avatar } = useUserStore();
  const { messages, addMessage } = useRoomStore();
  const { gameState, currentWord, submitGuess } = useGameStore();

  const [inputGuess, setInputGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(48);

  const handleSendDanmaku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputGuess.trim()) return;

    const trimmed = inputGuess.trim();
    submitGuess(trimmed, userId, nickname);

    addMessage({
      version: 'v1',
      seq: Date.now(),
      timestamp: Date.now(),
      senderId: userId,
      type: 'chat:message',
      payload: {
        id: `danmaku_${Date.now()}`,
        type: 'danmaku',
        content: trimmed,
        senderNickname: nickname,
        senderAvatar: avatar,
        isDanmaku: true,
      },
    });

    setInputGuess('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden">
      {/* Floating Top Controls HUD */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge className="bg-white/20 backdrop-blur-md text-white border border-white/30 font-black px-3 py-1 text-xs">
            沉浸全屏模式
          </Badge>
          <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
            提示: {gameState?.wordHint || '2个字 · 水果食物'}
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/80 backdrop-blur-md text-white text-xs font-mono font-black shadow">
            <Timer className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>

          <Button
            size="sm"
            variant="surface"
            onClick={() => navigate(-1)}
            className="h-8 px-3 text-xs gap-1 font-bold bg-white/20 hover:bg-white/30 text-white border-0 shadow backdrop-blur-md"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{t('inGame.exitFullscreen')}</span>
          </Button>
        </div>
      </div>

      {/* Main Drawing Canvas with Danmaku Barrage */}
      <div className="relative flex-1 w-full h-full">
        <DanmakuOverlay
          items={messages.map((m) => ({
            id: m.payload.id,
            text: m.payload.content,
            color: m.payload.color || '#5B5BF0',
            fontSize: 18,
            topPercent: Math.random() * 70 + 15,
            senderNickname: m.payload.senderNickname,
            timestamp: m.timestamp,
          }))}
          enabled={true}
        />

        <DrawBoard
          strokes={gameState?.strokes || []}
          isDrawer={false}
          width={1280}
          height={960}
          className="w-full h-full rounded-none border-0"
        />
      </div>

      {/* Floating Bottom Guess Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30">
        <form
          onSubmit={handleSendDanmaku}
          className="p-2 bg-card/90 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl flex items-center gap-2"
        >
          <div className="pl-3 text-xs font-black text-[var(--theme-primary,#5B5BF0)]">
            🚀 全屏弹幕
          </div>

          <input
            type="text"
            value={inputGuess}
            onChange={(e) => setInputGuess(e.target.value)}
            placeholder="发射全屏弹幕 / 抢答..."
            className="flex-1 bg-transparent px-3 py-1.5 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <Button type="submit" size="sm" className="h-9 px-5 font-black gap-1">
            <Send className="w-3.5 h-3.5" />
            <span>发射</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
