import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  PlusCircle,
  Hash,
  ArrowRight,
  Users,
  Play,
  Palette,
  Timer,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { Button, Card, Badge, Avatar, Input } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';

const MOCK_ROOMS = [
  {
    id: 'room_101',
    code: '772911',
    title: '下班开黑速来！麦克风全开',
    hostName: '画神小智',
    hostAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Host1',
    players: 5,
    maxPlayers: 8,
    status: 'waiting',
    difficulty: '简单日常',
  },
  {
    id: 'room_idavoll_demo',
    code: '886928',
    title: '周五下班嗨玩画画局',
    hostName: '涂鸦大师',
    hostAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyFox',
    players: 4,
    maxPlayers: 8,
    status: 'waiting',
    difficulty: '标准进阶',
  },
  {
    id: 'room_103',
    code: '639102',
    title: '灵魂画作专场 (猜不出别笑)',
    hostName: '草莓可乐',
    hostAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Host3',
    players: 7,
    maxPlayers: 8,
    status: 'playing',
    difficulty: '脑洞大开',
  },
  {
    id: 'room_104',
    code: '519823',
    title: '英语/成语绘画挑战群',
    hostName: '学霸小猫',
    hostAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Host4',
    players: 3,
    maxPlayers: 6,
    status: 'waiting',
    difficulty: '脑洞大开',
  },
];

export const LobbyHomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: userId, nickname, avatar } = useUserStore();
  const { initDemoRoom } = useRoomStore();
  const [joinCode, setJoinCode] = useState('');

  const handleQuickMatch = () => {
    initDemoRoom(userId, nickname, avatar);
    navigate('/room/room_idavoll_demo');
  };

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    initDemoRoom(userId, nickname, avatar);
    navigate(`/room/room_idavoll_demo`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      {/* Top Status & Online Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-muted-foreground">
            {t('lobby.onlineCount', { count: 4820 })}
          </span>
        </div>

        <Badge variant="subtle" className="gap-1.5 font-bold">
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>S3 赛季热烈进行中</span>
        </Badge>
      </div>

      {/* Hero Banner Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      >
        <Card className="p-6 sm:p-10 bg-gradient-to-r from-[var(--theme-primary,#5B5BF0)] via-indigo-600 to-[#FF6B5E] text-white border-0 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Shapes */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none flex items-center justify-center">
            <Palette className="w-96 h-96 -rotate-12 translate-x-20" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <Badge className="bg-white/20 text-white backdrop-blur-md border border-white/30 text-xs px-3 py-1">
              ✨ 经典重磅升级
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {t('lobby.bannerTitle')}
            </h2>
            <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed">
              {t('lobby.bannerDesc')}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={handleQuickMatch}
                className="bg-white text-[var(--theme-primary,#5B5BF0)] hover:bg-white/90 shadow-xl font-black gap-2"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>{t('lobby.quickMatch')}</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={handleCreateRoom}
                className="border-white/80 text-white hover:bg-white/20 font-black gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{t('lobby.createRoom')}</span>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Join By Room Code Bar */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-[var(--theme-primary,#5B5BF0)]">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-foreground">
              {t('lobby.joinByCode')}
            </h4>
            <p className="text-xs text-muted-foreground">朋友已经建好房间？直接输入 6 位房间号即可直达</p>
          </div>
        </div>

        <form onSubmit={handleJoinByCode} className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder={t('lobby.joinPlaceholder')}
            className="w-full sm:w-48 text-center tracking-widest font-mono font-bold"
            maxLength={6}
          />
          <Button type="submit" size="sm" className="h-12 px-6">
            <span>{t('lobby.joinBtn')}</span>
          </Button>
        </form>
      </Card>

      {/* Featured Game Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {t('lobby.popularGames')}
          </h3>
          <button
            onClick={() => navigate('/games')}
            className="flex items-center gap-1 text-xs font-bold text-[var(--theme-primary,#5B5BF0)] hover:underline cursor-pointer"
          >
            <span>全部游戏 (4)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Draw and Guess Card */}
          <Card
            hoverEffect
            onClick={() => navigate('/games/draw-and-guess')}
            className="md:col-span-2 p-6 bg-gradient-to-br from-card via-card to-indigo-50/50 dark:to-indigo-950/20 border-2 border-indigo-500/20"
          >
            <div className="flex flex-col sm:flex-row justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs font-black">
                    🔥 最受欢迎
                  </Badge>
                  <span className="text-xs font-bold text-muted-foreground">2-12 人多人同屏</span>
                </div>

                <h4 className="text-2xl sm:text-3xl font-black text-foreground">
                  你画我猜 (Draw & Guess)
                </h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  脑洞大开的派对灵魂画画游戏！实时 Canvas 笔触同步，全屏飘字弹幕抢答，支持自选词库与多轮计分！
                </p>

                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground pt-2">
                  <span className="flex items-center gap-1">
                    <Timer className="w-4 h-4 text-indigo-500" /> 60s 快速轮转
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-teal-500" /> 实时语音 + 弹幕
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col justify-end items-end gap-2">
                <Button size="lg" className="w-full sm:w-auto font-black gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  <span>立即畅玩</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Secondary Game Card Placeholder */}
          <Card
            hoverEffect
            onClick={() => navigate('/games')}
            className="p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <Badge variant="muted" className="mb-2">
                即将上线
              </Badge>
              <h4 className="text-xl font-black text-foreground">飞行棋大乱斗</h4>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                经典复古飞行棋，新增道具卡与多玩家淘汰赛制，即将开放体验！
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
              <span>预约人数: 1,420</span>
              <span className="font-bold text-[var(--theme-primary,#5B5BF0)]">敬请期待</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Active Public Rooms List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {t('lobby.activeRooms')}
          </h3>
          <Button size="sm" variant="surface" onClick={handleCreateRoom} className="text-xs font-bold">
            <PlusCircle className="w-4 h-4 mr-1" />
            创建房间
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_ROOMS.map((room) => {
            const isFull = room.players >= room.maxPlayers;
            return (
              <Card
                key={room.id}
                hoverEffect
                onClick={() => {
                  initDemoRoom(userId, nickname, avatar);
                  navigate('/room/room_idavoll_demo');
                }}
                className="p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={room.status === 'waiting' ? 'mint' : 'muted'} className="text-[10px]">
                      {room.status === 'waiting' ? t('lobby.waiting') : t('lobby.playing')}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      #{room.code}
                    </span>
                  </div>

                  <h5 className="font-extrabold text-base text-foreground line-clamp-1">
                    {room.title}
                  </h5>

                  <div className="flex items-center gap-2 pt-1">
                    <Avatar src={room.hostAvatar} alt={room.hostName} size="sm" />
                    <span className="text-xs text-muted-foreground font-medium truncate">
                      房主: {room.hostName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {room.players}/{room.maxPlayers}
                  </span>

                  <span className="text-xs font-bold text-[var(--theme-primary,#5B5BF0)]">
                    {isFull ? '已满员' : '点击加入 →'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
