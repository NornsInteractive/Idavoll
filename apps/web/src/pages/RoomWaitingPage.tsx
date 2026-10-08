import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Crown,
  Play,
  UserPlus,
  Share2,
  Settings,
  ChevronLeft,
  LogOut,
  Loader2,
  AlertCircle,
  X,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Card, Button, Badge, Avatar, ChatWindow, VoiceDock, Input } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { connectRoom, leaveRoom, disconnectRoom } from '../services/room-session';
import { toggleMute, toggleDeafen } from '../services/voice';
import { RoomSettings } from '@idavoll/protocol';

export const RoomWaitingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const { id: userId } = useUserStore();
  const {
    room,
    messages,
    sendMessage,
    isMuted,
    isDeafened,
    speakingUserIds,
    togglePlayerReady,
    startGame,
    updateSettings,
    connectionState,
    error,
    clearError,
  } = useRoomStore();

  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Private room password modal on direct invite
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Settings form state (for host)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editRounds, setEditRounds] = useState(3);
  const [editDifficulty, setEditDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [editMaxPlayers, setEditMaxPlayers] = useState(8);

  const pendingSettingsRef = useRef<RoomSettings | null>(null);

  // Connect or switch to target room when route roomId changes or on direct visit
  useEffect(() => {
    if (!roomId) return;

    // A room matches the URL if either its canonical roomId or its 6-digit roomCode matches
    const isSameRoom = !!(room && (room.roomId === roomId || room.roomCode === roomId));

    // If current room is different from the route target, disconnect old room
    if (room && !isSameRoom) {
      disconnectRoom();
    }

    if (!room || !isSameRoom) {
      setIsConnecting(true);
      setConnectError(null);
      connectRoom(roomId)
        .then((canonicalRoomId) => {
          if (canonicalRoomId && canonicalRoomId !== roomId) {
            navigate(`/room/${canonicalRoomId}`, { replace: true });
          }
        })
        .catch((err: any) => {
          const msg = err instanceof Error ? err.message : '加入房间失败';
          if (msg.includes('密码') || err?.status === 403) {
            setPasswordModalOpen(true);
          } else {
            setConnectError(msg);
          }
        })
        .finally(() => {
          setIsConnecting(false);
        });
    }
  }, [roomId, room?.roomId, room?.roomCode, navigate]);

  // Synchronize host edit form with room settings
  useEffect(() => {
    if (room?.settings) {
      setEditTitle(room.settings.title);
      setEditDuration(room.settings.drawDuration);
      setEditRounds(room.settings.totalRounds);
      setEditDifficulty(room.settings.wordDifficulty);
      setEditMaxPlayers(room.settings.maxPlayers);

      // Check if pending settings update has been confirmed by server
      if (pendingSettingsRef.current) {
        const ps = pendingSettingsRef.current;
        if (
          room.settings.title === ps.title &&
          room.settings.drawDuration === ps.drawDuration &&
          room.settings.totalRounds === ps.totalRounds &&
          room.settings.wordDifficulty === ps.wordDifficulty &&
          room.settings.maxPlayers === ps.maxPlayers
        ) {
          setIsSavingSettings(false);
          pendingSettingsRef.current = null;
          setSettingsOpen(false);
        }
      }
    }
  }, [room?.settings]);

  // Listen for errors while saving settings
  useEffect(() => {
    if (error && isSavingSettings) {
      setSettingsError(error);
      setIsSavingSettings(false);
      pendingSettingsRef.current = null;
    }
  }, [error, isSavingSettings]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !roomPassword.trim()) {
      setPasswordError(t('lobby.passwordInputPlaceholder'));
      return;
    }

    setIsConnecting(true);
    setPasswordError(null);
    try {
      const canonicalRoomId = await connectRoom(roomId, roomPassword.trim());
      setPasswordModalOpen(false);
      setRoomPassword('');
      if (canonicalRoomId && canonicalRoomId !== roomId) {
        navigate(`/room/${canonicalRoomId}`, { replace: true });
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : '密码错误，请重试';
      setPasswordError(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetryConnect = () => {
    if (!roomId) return;
    setIsConnecting(true);
    setConnectError(null);
    connectRoom(roomId)
      .then((canonicalRoomId) => {
        if (canonicalRoomId && canonicalRoomId !== roomId) {
          navigate(`/room/${canonicalRoomId}`, { replace: true });
        }
      })
      .catch((err: any) => {
        const msg = err instanceof Error ? err.message : '连接失败';
        if (msg.includes('密码') || err?.status === 403) {
          setPasswordModalOpen(true);
        } else {
          setConnectError(msg);
        }
      })
      .finally(() => {
        setIsConnecting(false);
      });
  };

  const handleCopyInvite = () => {
    if (!room) return;
    const inviteUrl = `${window.location.origin}/room/${room.roomId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        prompt('请复制以下房间邀请链接：', inviteUrl);
      });
    } else {
      prompt('请复制以下房间邀请链接：', inviteUrl);
    }
  };

  const handleCopyCode = () => {
    if (!room) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(room.roomCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        prompt('房间号：', room.roomCode);
      });
    } else {
      prompt('房间号：', room.roomCode);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/lobby');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !room) return;

    setSettingsError(null);
    setIsSavingSettings(true);

    const newSettings: RoomSettings = {
      ...room.settings,
      title: editTitle.trim(),
      drawDuration: editDuration,
      totalRounds: editRounds,
      wordDifficulty: editDifficulty,
      maxPlayers: editMaxPlayers,
    };

    pendingSettingsRef.current = newSettings;
    updateSettings(newSettings);

    // Timeout fallback after 5s if server doesn't respond
    setTimeout(() => {
      if (pendingSettingsRef.current) {
        setIsSavingSettings(false);
        setSettingsError('设置更新超时，请重试');
        pendingSettingsRef.current = null;
      }
    }, 5000);
  };

  // Loading or Connection Error States
  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-5 min-h-[70vh]">
        {connectError ? (
          <Card className="p-8 max-w-md text-center space-y-4 border-2 border-rose-500/30">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">{t('roomWaiting.roomNotFound')}</h3>
              <p className="text-xs text-muted-foreground">{connectError}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="surface" onClick={handleRetryConnect} className="gap-1.5 font-bold cursor-pointer">
                <RefreshCw className="w-4 h-4" />
                <span>{t('roomWaiting.reconnect')}</span>
              </Button>
              <Button size="sm" onClick={() => navigate('/lobby')} className="font-bold cursor-pointer">
                <span>{t('settlement.backToLobby')}</span>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 text-[var(--theme-primary,#5B5BF0)] animate-spin" />
            <p className="text-sm font-bold text-muted-foreground">
              {isConnecting ? '正在连接房间与服务器...' : t('roomWaiting.notConnected')}
            </p>
          </div>
        )}

        {/* Private Room Password Modal (Direct URL Access) */}
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
                        <h4 className="font-extrabold text-base text-foreground">
                          {t('lobby.passwordModalTitle')}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {t('lobby.passwordModalDesc')}
                        </p>
                      </div>
                    </div>
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
                      placeholder={t('lobby.passwordInputPlaceholder')}
                      autoFocus
                      maxLength={64}
                      disabled={isConnecting}
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="surface"
                        onClick={() => navigate('/lobby')}
                        className="flex-1 font-bold text-xs cursor-pointer"
                        disabled={isConnecting}
                      >
                        {t('lobby.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isConnecting || !roomPassword.trim()}
                        className="flex-1 font-black text-xs gap-1 cursor-pointer"
                      >
                        {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{t('lobby.confirm')}</span>}
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
  }

  const isHost = room.hostId === userId;
  const me = room.players.find((p) => p.id === userId);
  const isMeReady = me?.isReady ?? false;

  // Strict Gating:
  // 1. At least 2 players
  // 2. All players must be online
  // 3. All non-host players must be ready
  // 4. Connection state must be 'connected'
  const allOnline = room.players.every((p) => p.isOnline);
  const allReady = room.players.every((p) => p.isHost || p.isReady);
  const isConnected = connectionState === 'connected';
  const canStart = room.players.length >= 2 && allOnline && allReady && isConnected;

  const maxSlots = room.settings?.maxPlayers || 8;
  const emptySlotsCount = Math.max(0, maxSlots - room.players.length);
  const emptySlots = Array.from({ length: emptySlotsCount });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={t('roomWaiting.leaveRoom')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-foreground">
                {room.settings?.title}
              </h2>
              {isHost && (
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  title={t('roomWaiting.editSettings')}
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              作画时间: {room.settings?.drawDuration}s · 共 {room.settings?.totalRounds} 轮 · 难度:{' '}
              {room.settings?.wordDifficulty === 'easy'
                ? '简单'
                : room.settings?.wordDifficulty === 'hard'
                ? '挑战'
                : '标准'}
            </p>
          </div>
        </div>

        {/* Room Code Pill & Invite */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border-2 border-[var(--theme-primary,#5B5BF0)] text-[var(--theme-primary,#5B5BF0)] shadow-sm hover:scale-105 transition-all cursor-pointer font-extrabold text-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{t('roomWaiting.roomCode')}: {room.roomCode}</span>
            <span className="text-[11px] opacity-75">{copied ? '已复制!' : '点击复制'}</span>
          </button>

          <Button
            size="sm"
            variant="surface"
            onClick={handleCopyInvite}
            className="h-10 px-3 text-xs gap-1 font-bold cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('roomWaiting.inviteFriends')}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleLeaveRoom}
            className="h-10 px-3 text-xs gap-1 font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('roomWaiting.leaveRoom')}</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Seats & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Player Seats */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-foreground">{t('roomWaiting.playerSeats')}</span>
                <Badge variant="subtle" className="text-xs font-bold">
                  {room.players.length} / {maxSlots} 人
                </Badge>
              </div>

              {isHost ? (
                <span className="text-xs font-semibold text-muted-foreground">
                  {!isConnected
                    ? t('roomWaiting.notConnected')
                    : !allOnline
                    ? t('roomWaiting.hasOfflinePlayers')
                    : canStart
                    ? t('roomWaiting.allReadyToStart')
                    : t('roomWaiting.atLeastTwoPlayers')}
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {isMeReady ? '已准备，等待房主开始' : '点击下方按钮准备'}
                </span>
              )}
            </div>

            {/* Grid Seats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {room.players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative p-4 rounded-3xl bg-muted/40 border border-border flex flex-col items-center justify-center text-center space-y-2 group shadow-sm"
                >
                  {player.isHost && (
                    <div
                      className="absolute top-2 left-2 p-1 rounded-full bg-amber-500 text-white shadow"
                      title={t('roomWaiting.hostBadge')}
                    >
                      <Crown className="w-3 h-3" />
                    </div>
                  )}

                  <Avatar
                    src={player.avatar}
                    alt={player.nickname}
                    size="lg"
                    status={player.isOnline ? 'online' : 'offline'}
                  />

                  <div className="w-full">
                    <h5 className="font-extrabold text-sm text-foreground truncate px-1">
                      {player.nickname}
                      {player.id === userId ? ' (我)' : ''}
                    </h5>
                    <p className="text-[11px] text-muted-foreground font-medium">积分: {player.score}</p>
                  </div>

                  <Badge
                    variant={player.isHost ? 'default' : player.isReady ? 'mint' : 'muted'}
                    className="text-[10px] font-black px-2.5 py-0.5"
                  >
                    {player.isHost ? t('roomWaiting.hostBadge') : player.isReady ? t('roomWaiting.readyBadge') : t('roomWaiting.waitingBadge')}
                  </Badge>
                </motion.div>
              ))}

              {emptySlots.map((_, idx) => (
                <div
                  key={`empty_${idx}`}
                  onClick={handleCopyInvite}
                  className="p-4 rounded-3xl border-2 border-dashed border-border/80 hover:border-[var(--theme-primary,#5B5BF0)]/60 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition-colors group min-h-[140px]"
                >
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-[var(--theme-primary,#5B5BF0)] group-hover:scale-110 transition-all">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">
                    {t('roomWaiting.inviteSlot')}
                  </span>
                </div>
              ))}
            </div>

            {/* Voice Dock */}
            <VoiceDock
              players={room.players}
              currentUserId={userId}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              isDeafened={isDeafened}
              onToggleDeafen={toggleDeafen}
              speakingUserIds={speakingUserIds}
            />

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {!isHost && (
                  <Button
                    size="lg"
                    variant={isMeReady ? 'secondary' : 'default'}
                    onClick={togglePlayerReady}
                    className="font-black px-8 cursor-pointer"
                  >
                    {isMeReady ? t('roomWaiting.cancelReadyBtn') : t('roomWaiting.readyBtn')}
                  </Button>
                )}
              </div>

              {isHost && (
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    disabled={!canStart}
                    onClick={startGame}
                    className="w-full sm:w-auto font-black px-8 gap-2 text-base shadow-xl cursor-pointer disabled:opacity-40"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>{t('roomWaiting.startGameBtn')}</span>
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
            onSendMessage={(content, isDanmaku) => sendMessage(content, isDanmaku)}
            title="房间交流与猜词"
            className="flex-1"
          />
        </div>
      </div>

      {/* Host Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md"
            >
              <Card className="p-6 space-y-5 border-2 border-border shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-foreground">
                        {t('roomWaiting.editSettings')}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">仅房主有权更改当前房间配置</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSavingSettings) setSettingsOpen(false);
                    }}
                    className="p-1 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {settingsError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{settingsError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">房间标题</label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={30}
                      disabled={isSavingSettings}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">作画时间 (秒)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[45, 60, 90].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          disabled={isSavingSettings}
                          onClick={() => setEditDuration(sec)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            editDuration === sec
                              ? 'bg-[var(--theme-primary,#5B5BF0)] text-white'
                              : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {sec}秒
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">总轮数</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 5, 8].map((round) => (
                        <button
                          key={round}
                          type="button"
                          disabled={isSavingSettings}
                          onClick={() => setEditRounds(round)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            editRounds === round
                              ? 'bg-[var(--theme-primary,#5B5BF0)] text-white'
                              : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {round}轮
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">词库难度</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'easy', label: '简单' },
                        { key: 'medium', label: '标准' },
                        { key: 'hard', label: '挑战' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          disabled={isSavingSettings}
                          onClick={() => setEditDifficulty(item.key as any)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            editDifficulty === item.key
                              ? 'bg-[var(--theme-primary,#5B5BF0)] text-white'
                              : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="surface"
                      disabled={isSavingSettings}
                      onClick={() => setSettingsOpen(false)}
                      className="flex-1 font-bold text-xs cursor-pointer"
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSavingSettings || !editTitle.trim()}
                      className="flex-1 font-black text-xs gap-1 cursor-pointer"
                    >
                      {isSavingSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('roomWaiting.savingSettings')}</span>
                        </>
                      ) : (
                        <span>保存设置</span>
                      )}
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
