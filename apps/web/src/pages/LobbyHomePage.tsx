import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  PlusCircle,
  Hash,
  Users,
  Play,
  Palette,
  Timer,
  ChevronRight,
  Flame,
  Lock,
  Loader2,
  AlertCircle,
  X,
  DoorOpen,
} from 'lucide-react';
import { Button, Card, Badge, Avatar, Input } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { fetchPresence, fetchRooms, quickMatch } from '../services/api';
import { connectRoom } from '../services/room-session';

export const LobbyHomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: userId, nickname } = useUserStore();

  const [joinCode, setJoinCode] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Private room password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [targetRoomIdentifier, setTargetRoomIdentifier] = useState<string>('');
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 15-second polling for online count and active rooms
  const { data: presenceData } = useQuery({
    queryKey: ['presence'],
    queryFn: fetchPresence,
    refetchInterval: 15000,
  });

  const {
    data: roomsData,
    isLoading: isRoomsLoading,
    refetch: refetchRooms,
  } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    refetchInterval: 15000,
  });

  const rooms = roomsData?.rooms || [];

  const handleQuickMatch = async () => {
    setIsMatching(true);
    setActionError(null);
    try {
      const match = await quickMatch();
      const canonicalRoomId = await connectRoom(match.roomId, undefined, match.ticket);
      navigate(`/room/${canonicalRoomId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '快速匹配失败，请重试';
      setActionError(msg);
    } finally {
      setIsMatching(false);
    }
  };

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;

    setIsJoining(true);
    setActionError(null);
    try {
      const canonicalRoomId = await connectRoom(code);
      navigate(`/room/${canonicalRoomId}`);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : '加入房间失败';
      if (msg.includes('密码') || err?.status === 403) {
        setTargetRoomIdentifier(code);
        setRoomPassword('');
        setPasswordError(null);
        setPasswordModalOpen(true);
      } else {
        setActionError(msg);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectRoom = async (roomId: string, isPrivate: boolean) => {
    if (isPrivate) {
      setTargetRoomIdentifier(roomId);
      setRoomPassword('');
      setPasswordError(null);
      setPasswordModalOpen(true);
      return;
    }

    setIsJoining(true);
    setActionError(null);
    try {
      const canonicalRoomId = await connectRoom(roomId);
      navigate(`/room/${canonicalRoomId}`);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : '加入房间失败';
      if (msg.includes('密码') || err?.status === 403) {
        setTargetRoomIdentifier(roomId);
        setRoomPassword('');
        setPasswordError(null);
        setPasswordModalOpen(true);
      } else {
        setActionError(msg);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomPassword.trim()) {
      setPasswordError('请输入房间密码');
      return;
    }

    setIsJoining(true);
    setPasswordError(null);
    try {
      const canonicalRoomId = await connectRoom(targetRoomIdentifier, roomPassword.trim());
      setPasswordModalOpen(false);
      navigate(`/room/${canonicalRoomId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '密码错误或加入失败';
      setPasswordError(msg);
    } finally {
      setIsJoining(false);
    }
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
            {presenceData?.onlineCount !== undefined
              ? t('lobby.onlineCount', { count: presenceData.onlineCount })
              : t('lobby.syncingOnline', '正在同步在线人数...')}
          </span>
        </div>

        <Badge variant="subtle" className="gap-1.5 font-bold">
          <Flame className="w-3.5 h-3.5 text-primary" />
          <span>{t('lobby.lobbyStatus', '经典重磅升级')}</span>
        </Badge>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 hover:bg-rose-500/20 rounded-full cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

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
                disabled={isMatching}
                onClick={handleQuickMatch}
                className="bg-white text-[var(--theme-primary,#5B5BF0)] hover:bg-white/90 shadow-xl font-black gap-2"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('lobby.quickMatchSearching', '匹配寻找房间中...')}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>{t('lobby.quickMatch')}</span>
                  </>
                )}
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
            <p className="text-xs text-muted-foreground">{t('lobby.joinByCodeDesc', '朋友已经建好房间？直接输入 6 位房间号即可直达')}</p>
          </div>
        </div>

        <form onSubmit={handleJoinByCode} className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setActionError(null);
            }}
            placeholder={t('lobby.joinPlaceholder')}
            className="w-full sm:w-48 text-center tracking-widest font-mono font-bold"
            maxLength={10}
            disabled={isJoining}
          />
          <Button type="submit" size="sm" disabled={isJoining || !joinCode.trim()} className="h-12 px-6">
            {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{t('lobby.joinBtn')}</span>}
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
            <span>{t('lobby.allGamesCount', { count: 4 })}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Draw and Guess Card */}
          <Card
            hoverEffect
            onClick={() => navigate('/games/draw-and-guess')}
            className="md:col-span-2 p-6 bg-gradient-to-br from-card via-card to-indigo-50/50 dark:to-indigo-950/20 border-2 border-indigo-500/20 cursor-pointer"
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
          <Card className="p-6 flex flex-col justify-between space-y-4 opacity-75">
            <div>
              <Badge variant="muted" className="mb-2">
                {t('lobby.comingSoon', '敬请期待')}
              </Badge>
              <h4 className="text-xl font-black text-foreground">{t('lobby.partyLudo', '飞行棋大乱斗')}</h4>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {t('lobby.partyLudoDesc', '经典复古飞行棋，新增道具卡与多玩家淘汰赛制，正在精心打磨中。')}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
              <span>状态: {t('lobby.inDev', '研发中')}</span>
              <span className="font-bold text-muted-foreground">{t('games.unreleased', '暂未开放')}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Active Public Rooms List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t('lobby.activeRooms')}
            </h3>
            <span className="text-xs font-bold text-muted-foreground">({rooms.length})</span>
          </div>
          <Button size="sm" variant="surface" onClick={handleCreateRoom} className="text-xs font-bold cursor-pointer">
            <PlusCircle className="w-4 h-4 mr-1" />
            <span>{t('lobby.createRoom', '创建房间')}</span>
          </Button>
        </div>

        {isRoomsLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[var(--theme-primary,#5B5BF0)] animate-spin" />
            <p className="text-xs font-bold text-muted-foreground">{t('lobby.syncingRooms', '正在同步大厅公开房间...')}</p>
          </div>
        ) : rooms.length === 0 ? (
          /* Empty Room State - No Fake Cards! */
          <Card className="p-10 text-center flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-border/80">
            <div className="w-16 h-16 rounded-3xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <DoorOpen className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-foreground">{t('lobby.noRooms')}</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                {t('lobby.noRoomsDesc')}
              </p>
            </div>
            <Button onClick={handleCreateRoom} className="font-bold gap-2 cursor-pointer">
              <PlusCircle className="w-4 h-4" />
              <span>{t('lobby.createRoomNow')}</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              return (
                <Card
                  key={room.roomId}
                  hoverEffect={!isFull}
                  onClick={() => !isFull && handleSelectRoom(room.roomId, room.isPrivate)}
                  className={`p-5 flex flex-col justify-between space-y-4 cursor-pointer ${
                    isFull ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={room.status === 'waiting' ? 'mint' : 'muted'} className="text-[10px]">
                          {room.status === 'waiting' ? t('lobby.waiting') : t('lobby.playing')}
                        </Badge>
                        {room.isPrivate && (
                          <span title="加密房间" className="text-muted-foreground">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        #{room.roomCode}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-base text-foreground line-clamp-1">
                      {room.title}
                    </h5>

                    <p className="text-xs text-muted-foreground font-medium">
                      房号: {room.roomCode}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {room.playerCount}/{room.maxPlayers}
                    </span>

                    <span className="text-xs font-bold text-[var(--theme-primary,#5B5BF0)]">
                      {isFull ? t('lobby.fullRoom', '已满员') : room.isPrivate ? t('lobby.joinWithPassword', '密码加入 →') : t('lobby.joinClick', '点击加入 →')}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Private Room Password Modal */}
      <AnimatePresence>
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <Card className="p-6 space-y-5 border-2 border-border shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-foreground">私密房间密码</h4>
                      <p className="text-[11px] text-muted-foreground">该房间设有访问密码</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="p-1 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {passwordError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <Input
                    type="password"
                    value={roomPassword}
                    onChange={(e) => {
                      setRoomPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="请输入房间密码 (4-64 位)"
                    autoFocus
                    maxLength={64}
                    disabled={isJoining}
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="surface"
                      onClick={() => setPasswordModalOpen(false)}
                      className="flex-1 font-bold text-xs"
                      disabled={isJoining}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      disabled={isJoining || !roomPassword.trim()}
                      className="flex-1 font-black text-xs gap-1"
                    >
                      {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>确认进入</span>}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
