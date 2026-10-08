import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Crown,
  Play,
  UserPlus,
  Share2,
  Settings,
  ChevronLeft,
  Volume2,
  Mic,
  MicOff,
} from 'lucide-react';
import { Card, Button, Badge, Avatar, ChatWindow, VoiceDock } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';

export const RoomWaitingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const { id: userId, nickname, avatar } = useUserStore();
  const {
    room,
    messages,
    addMessage,
    isMuted,
    toggleMute,
    speakingUserIds,
    togglePlayerReady,
    initDemoRoom,
  } = useRoomStore();
  const { initDemoGame } = useGameStore();

  const [copied, setCopied] = useState(false);

  // If room is empty, initialize demo room
  React.useEffect(() => {
    if (!room) {
      initDemoRoom(userId, nickname, avatar);
    }
  }, [room, userId, nickname, avatar, initDemoRoom]);

  const currentRoom = room || {
    roomId: roomId || 'room_idavoll_demo',
    roomCode: '886928',
    hostId: userId,
    title: '周五下班嗨玩画画局',
    settings: {
      title: '周五下班嗨玩画画局',
      maxPlayers: 8,
      drawDuration: 60,
      totalRounds: 3,
      wordDifficulty: 'medium',
    },
    players: [
      {
        id: userId,
        nickname,
        avatar,
        isHost: true,
        isReady: true,
        isOnline: true,
        score: 180,
        micMuted: false,
      },
    ],
  };

  const isHost = currentRoom.hostId === userId;
  const me = currentRoom.players.find((p) => p.id === userId);
  const isMeReady = me?.isReady ?? false;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    // Start game as drawer
    initDemoGame(userId, true);
    navigate('/game/drawer');
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
        type: isDanmaku ? 'danmaku' : 'text',
        content,
        senderNickname: nickname,
        senderAvatar: avatar,
        isDanmaku: !!isDanmaku,
      },
    });
  };

  const maxSlots = currentRoom.settings?.maxPlayers || 8;
  const slots = Array.from({ length: maxSlots });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-foreground">
              {currentRoom.settings?.title || '周五下班嗨玩画画局'}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              作画时间: {currentRoom.settings?.drawDuration}s · 共 {currentRoom.settings?.totalRounds} 轮 · 词库难度: 标准
            </p>
          </div>
        </div>

        {/* Room Code Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border-2 border-[var(--theme-primary,#5B5BF0)] text-[var(--theme-primary,#5B5BF0)] shadow-sm hover:scale-105 transition-all cursor-pointer font-extrabold text-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>房号: {currentRoom.roomCode}</span>
            <span className="text-[11px] opacity-75">{copied ? '已复制!' : '点击复制'}</span>
          </button>

          <Button
            size="sm"
            variant="surface"
            onClick={handleCopyCode}
            className="h-10 px-3 text-xs gap-1 font-bold"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">邀请链接</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Seats & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Player Seats (2 columns on large screen) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-foreground">玩家席位</span>
                <Badge variant="subtle" className="text-xs font-bold">
                  {currentRoom.players.length} / {maxSlots} 人
                </Badge>
              </div>

              {isHost && (
                <span className="text-xs text-muted-foreground font-semibold">
                  所有准备就绪后即可开局
                </span>
              )}
            </div>

            {/* Grid Seats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {slots.map((_, idx) => {
                const player = currentRoom.players[idx];

                if (player) {
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative p-4 rounded-3xl bg-muted/40 border border-border flex flex-col items-center justify-center text-center space-y-2 group shadow-sm"
                    >
                      {player.isHost && (
                        <div className="absolute top-2 left-2 p-1 rounded-full bg-amber-500 text-white shadow" title="房主">
                          <Crown className="w-3 h-3" />
                        </div>
                      )}

                      <Avatar src={player.avatar} alt={player.nickname} size="lg" status="online" />

                      <div className="w-full">
                        <h5 className="font-extrabold text-sm text-foreground truncate px-1">
                          {player.nickname}
                        </h5>
                        <p className="text-[11px] text-muted-foreground font-medium">积分: {player.score}</p>
                      </div>

                      <Badge
                        variant={player.isReady ? 'mint' : 'muted'}
                        className="text-[10px] font-black px-2.5 py-0.5"
                      >
                        {player.isReady ? '已准备' : '等待中'}
                      </Badge>
                    </motion.div>
                  );
                }

                return (
                  <div
                    key={`empty_${idx}`}
                    onClick={handleCopyCode}
                    className="p-4 rounded-3xl border-2 border-dashed border-border/80 hover:border-[var(--theme-primary,#5B5BF0)]/60 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition-colors group min-h-[140px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-[var(--theme-primary,#5B5BF0)] group-hover:scale-110 transition-all">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">
                      {t('roomWaiting.inviteSlot')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Voice Dock */}
            <VoiceDock
              players={currentRoom.players}
              currentUserId={userId}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              speakingUserIds={speakingUserIds}
            />

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {!isHost && (
                  <Button
                    size="lg"
                    variant={isMeReady ? 'secondary' : 'default'}
                    onClick={() => togglePlayerReady(userId)}
                    className="font-black px-8"
                  >
                    {isMeReady ? t('roomWaiting.cancelReadyBtn') : t('roomWaiting.readyBtn')}
                  </Button>
                )}
              </div>

              {isHost && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    variant="surface"
                    onClick={() => {
                      initDemoGame(userId, false);
                      navigate('/game/guesser');
                    }}
                    className="font-black px-6 text-sm gap-1.5"
                  >
                    <span>🔍 猜题者视角体验</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleStartGame}
                    className="w-full sm:w-auto font-black px-8 gap-2 text-base shadow-xl"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>🎨 画手视角开局</span>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Reusable In-Room Chat Window */}
        <div className="h-[480px] lg:h-auto flex flex-col">
          <ChatWindow
            messages={messages}
            currentUserId={userId}
            onSendMessage={handleSendMessage}
            title="房间交流与猜词"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};
