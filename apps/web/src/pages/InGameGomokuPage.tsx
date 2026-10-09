import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Copy,
  Check,
  Eye,
  Volume2,
  VolumeX,
  MessageSquare,
  Undo2,
  Handshake,
  Flag,
  Lightbulb,
  History,
  Grid,
  Radio,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button, Avatar, InGameChatDrawer } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { toggleMute, toggleDeafen, setVoiceMode, holdToTalk } from '../services/voice';
import { leaveRoom } from '../services/room-session';

/**
 * Gomoku Board Coordinates (15 x 15)
 * Columns: A - O (0 - 14)
 * Rows: 1 - 15 (0 - 14)
 */
const BOARD_SIZE = 15;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
const STAR_POINTS = [
  { x: 3, y: 3 },
  { x: 11, y: 3 },
  { x: 7, y: 7 }, // 天元 (Tengen)
  { x: 3, y: 11 },
  { x: 11, y: 11 },
];

export type StoneColor = 'black' | 'white';

export interface MoveStep {
  x: number;
  y: number;
  color: StoneColor;
  step: number;
  timestamp?: number;
}

/**
 * Gomoku Interface Contract for Codex
 * This explicit state & event interface defines everything Codex needs to wire up
 * the game engine, WebSocket room protocols, and game store.
 */
export interface GomokuContractProps {
  board?: (StoneColor | null)[][];
  currentTurn?: StoneColor;
  myColor?: StoneColor;
  lastMove?: MoveStep | null;
  moveHistory?: MoveStep[];
  turnDuration?: number;
  turnTimeRemaining?: number;
  myTotalTime?: string;
  opponentTotalTime?: string;
  roundIndex?: number;
  totalRounds?: number;
  spectatorCount?: number;
  undoRemaining?: number;
  gameStatus?: 'waiting' | 'playing' | 'round_over' | 'game_over';
  winner?: StoneColor | 'draw' | null;
  opponentPlayer?: {
    id: string;
    nickname: string;
    avatarUrl?: string;
    rank?: string;
    winRate?: string;
  };
  myPlayer?: {
    id?: string;
    nickname?: string;
    avatarUrl?: string;
    rank?: string;
    winRate?: string;
  };
  onPlaceStone?: (x: number, y: number) => void;
  onRequestUndo?: () => void;
  onRequestDraw?: () => void;
  onResign?: () => void;
  onRequestHint?: () => void;
  onSendQuickChat?: (text: string) => void;
  onSendEmoji?: (emoji: string) => void;
  onLeaveRoom?: () => void;
}

export const InGameGomokuPage: React.FC<GomokuContractProps> = ({
  board: externalBoard,
  currentTurn: externalTurn,
  myColor: externalMyColor,
  lastMove: externalLastMove,
  moveHistory: externalHistory,
  turnDuration: externalTurnDuration = 30,
  turnTimeRemaining: externalTurnTimeRemaining,
  myTotalTime: externalMyTotalTime,
  opponentTotalTime: externalOpponentTotalTime,
  roundIndex: externalRoundIndex,
  totalRounds: externalTotalRounds,
  spectatorCount: externalSpectatorCount,
  undoRemaining: externalUndoRemaining,
  gameStatus: externalGameStatus = 'waiting',
  winner: _externalWinner,
  opponentPlayer: externalOpponent,
  myPlayer: externalMyPlayer,
  onPlaceStone,
  onRequestUndo,
  onRequestDraw,
  onResign,
  onRequestHint,
  onSendQuickChat,
  onSendEmoji,
  onLeaveRoom,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Global user & room stores (truthful real room data)
  const currentUserId = useUserStore((s) => s.id);
  const userNickname = useUserStore((s) => s.nickname);
  const userAvatar = useUserStore((s) => s.avatar);

  const {
    room,
    messages,
    sendMessage,
    isMuted,
    isDeafened,
    voiceStatus,
    voiceError,
    speakingUserIds,
    voiceMode,
  } = useRoomStore();

  // Local UI display toggles
  const [copied, setCopied] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  // Status and resolved game props
  const gameStatus = externalGameStatus;
  const isPlaying = gameStatus === 'playing';

  // Empty 15x15 board if external board not supplied
  const emptyBoard = useMemo(
    () => Array.from({ length: BOARD_SIZE }, () => Array<StoneColor | null>(BOARD_SIZE).fill(null)),
    []
  );
  const board = externalBoard || emptyBoard;

  const currentTurn = externalTurn || (isPlaying ? 'black' : undefined);
  const myColor: StoneColor = externalMyColor || 'black';
  const lastMove = externalLastMove || null;
  const turnTimeRemaining = externalTurnTimeRemaining;

  // Real room opponent resolution (truthful user data from room.players, without fake rank/winRate)
  const realOpponent = useMemo(() => {
    if (externalOpponent) return externalOpponent;
    if (room?.players && room.players.length > 1) {
      const opp = room.players.find((p) => p.id !== currentUserId);
      if (opp) {
        return {
          id: opp.id,
          nickname: opp.nickname,
          avatarUrl: opp.avatar,
          rank: undefined,
          winRate: undefined,
        };
      }
    }
    return {
      id: '',
      nickname: t('gomoku.opponentWaiting', '等待对手'),
      avatarUrl: undefined,
      rank: undefined,
      winRate: undefined,
    };
  }, [externalOpponent, room?.players, currentUserId, t]);

  const myNickname = externalMyPlayer?.nickname || userNickname || t('common.player', '玩家');
  const myAvatar = externalMyPlayer?.avatarUrl || userAvatar;
  const myRank = externalMyPlayer?.rank;

  const isMyTurn = isPlaying && currentTurn === myColor;
  const isOpponentSpeaking = realOpponent?.id ? speakingUserIds.includes(realOpponent.id) : false;
  const isMeSpeaking = currentUserId ? speakingUserIds.includes(currentUserId) : false;

  // Handle cell click / stone placement - only when playing, on my turn, and cell is empty
  const handleCellClick = (x: number, y: number) => {
    if (!isPlaying) return;
    if (!isMyTurn) return;
    if (board[y]?.[x] !== null) return;
    if (onPlaceStone) {
      onPlaceStone(x, y);
    }
  };

  const roomCode = room?.roomCode || room?.roomId;

  const handleCopyRoomId = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleQuickChatClick = (text: string) => {
    if (onSendQuickChat) {
      onSendQuickChat(text);
    } else if (room) {
      sendMessage(text, true);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (onSendEmoji) {
      onSendEmoji(emoji);
    } else if (room) {
      sendMessage(emoji, true);
    }
  };

  const handleExit = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      leaveRoom();
      navigate('/lobby');
    }
  };

  const handleResign = () => {
    setShowResignDialog(false);
    if (onResign) {
      onResign();
    }
  };

  // Convert coordinate to standard Go string (e.g., x=7, y=7 => H8)
  const formatCoord = (x: number, y: number) => {
    const col = COL_LABELS[x] || '?';
    const row = 15 - y;
    return `${col}${row}`;
  };

  // Quick preset chat phrases
  const quickChatPhrases = [
    t('gomoku.quickChats.respect', '承让了！'),
    t('gomoku.quickChats.brilliant', '这步走得妙啊 👍'),
    t('gomoku.quickChats.hurry', '快点吧，我等得花儿都谢了 🌸'),
    t('gomoku.quickChats.rematch', '再来一局！'),
  ];

  // Quick emoticons
  const quickEmojis = [
    { label: t('gomoku.emojis.tea', '请茶'), icon: '🍵' },
    { label: t('gomoku.emojis.think', '沉思'), icon: '💡' },
    { label: t('gomoku.emojis.applause', '鼓掌'), icon: '👏' },
    { label: t('gomoku.emojis.killer', '杀气'), icon: '💥' },
  ];

  const moveHistory = externalHistory || [];

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-background text-foreground overflow-hidden select-none">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="w-full bg-card/80 backdrop-blur-md border-b border-border px-3 sm:px-6 py-2 shrink-0 z-20 flex items-center justify-between gap-2 shadow-xs">
        {/* Left: Back + Room Code + Mode */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full hover:bg-muted shrink-0"
            onClick={() => setShowExitDialog(true)}
            aria-label={t('gomoku.exitRoom', '退出对局')}
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Button>

          {/* Room # with Copy Chip (only displayed if roomCode exists) */}
          {roomCode && (
            <button
              onClick={handleCopyRoomId}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/80 hover:bg-muted text-xs font-bold text-foreground transition-all shrink-0 cursor-pointer"
              title={t('gomoku.copied', '房间号已复制')}
            >
              <span className="text-primary font-black">#</span>
              <span>{roomCode}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Match format badge (only if totalRounds is specified) */}
          {externalTotalRounds !== undefined && (
            <span className="hidden sm:inline-flex text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
              {t('gomoku.roundBadgeNormal', { current: externalTotalRounds, defaultValue: `${externalTotalRounds}局` })}
            </span>
          )}
        </div>

        {/* Center: Round / Match Status Badge */}
        <div className="flex items-center justify-center shrink-0">
          {externalRoundIndex !== undefined ? (
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-extrabold text-xs sm:text-sm tracking-wide shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>
                {externalTotalRounds && externalRoundIndex === externalTotalRounds
                  ? t('gomoku.roundBadge', {
                      current: externalRoundIndex,
                      defaultValue: `第 ${externalRoundIndex} 局 · 决胜局`,
                    })
                  : t('gomoku.roundBadgeNormal', {
                      current: externalRoundIndex,
                      defaultValue: `第 ${externalRoundIndex} 局`,
                    })}
              </span>
            </div>
          ) : isPlaying ? (
            <div className="px-3 py-1 rounded-full bg-muted border border-border text-foreground font-bold text-xs sm:text-sm">
              {t('gomoku.title', '五子棋')}
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm">
              {t('gomoku.opponentWaiting', '等待对局开始')}
            </div>
          )}
        </div>

        {/* Right: Spectators + Audio/Voice + Chat Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Spectators (only if spectatorCount > 0) */}
          {externalSpectatorCount !== undefined && externalSpectatorCount > 0 && (
            <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground font-medium">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>{externalSpectatorCount}</span>
            </div>
          )}

          {/* Voice Speaker / Deafen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full hover:bg-muted shrink-0 text-muted-foreground"
            onClick={() => toggleDeafen()}
            aria-label={isDeafened ? '取消静音全员' : '静音全员'}
          >
            {isDeafened ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-foreground" />
            )}
          </Button>

          {/* Room Chat Drawer Trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full hover:bg-muted shrink-0 relative text-muted-foreground"
            onClick={() => setIsChatDrawerOpen(true)}
            aria-label={t('gomoku.voice.chatDrawer', '房间聊天')}
          >
            <MessageSquare className="w-4 h-4 text-foreground" />
            {messages.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
      </header>

      {/* 2. MAIN BATTLE AREA (VERSUS HEADER + GOMOKU BOARD) */}
      <main className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 max-w-5xl mx-auto w-full min-h-0 overflow-y-auto no-scrollbar">
        {/* VERSUS PLAYERS HEADER BAR */}
        <section className="w-full max-w-md sm:max-w-xl bg-card rounded-2xl border border-border p-2.5 sm:p-3 shadow-xs mb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Opponent Card (White Stones) */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative shrink-0">
                <Avatar
                  src={realOpponent.avatarUrl}
                  alt={realOpponent.nickname}
                  size="md"
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 ${
                    isOpponentSpeaking ? 'border-primary shadow-xs' : 'border-border'
                  }`}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-neutral-300 shadow-2xs flex items-center justify-center text-[10px]"
                  title={t('gomoku.whiteShort', '白子')}
                >
                  ⚪
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                    {realOpponent.nickname}
                  </h4>
                  {realOpponent.rank && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold shrink-0">
                      {realOpponent.rank}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium mt-0.5">
                  <span className={isPlaying && currentTurn === 'white' ? 'text-primary font-bold animate-pulse' : ''}>
                    {isPlaying
                      ? currentTurn === 'white'
                        ? t('gomoku.opponentThinking', '思考中...')
                        : t('gomoku.opponentReady', '等待中')
                      : t('gomoku.opponentWaiting', '等待对手')}
                  </span>
                  <span>·</span>
                  <span>{externalOpponentTotalTime || '--:--'}</span>
                </div>
              </div>
            </div>

            {/* Turn Timer & VS Center Badge */}
            <div className="flex flex-col items-center justify-center px-2 shrink-0">
              {/* Circular Progress Timer */}
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-muted/80 shadow-inner">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted/40 stroke-current"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {turnTimeRemaining !== undefined && externalTurnDuration > 0 && (
                    <path
                      className={`stroke-current transition-all duration-300 ${
                        turnTimeRemaining <= 5 ? 'text-rose-500' : 'text-primary'
                      }`}
                      strokeDasharray={`${Math.max(0, Math.min(100, (turnTimeRemaining / externalTurnDuration) * 100))}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                </svg>
                <span
                  className={`absolute text-xs sm:text-sm font-black ${
                    turnTimeRemaining !== undefined && turnTimeRemaining <= 5
                      ? 'text-rose-500 animate-ping'
                      : 'text-foreground'
                  }`}
                >
                  {turnTimeRemaining !== undefined ? turnTimeRemaining : '--'}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">
                VS
              </span>
            </div>

            {/* My Card (Black Stones) */}
            <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-end gap-1.5">
                  {myRank && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold shrink-0">
                      {myRank}
                    </span>
                  )}
                  <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                    {myNickname}
                  </h4>
                </div>
                <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground font-medium mt-0.5">
                  <span>{externalMyTotalTime || '--:--'}</span>
                  <span>·</span>
                  <span className={isPlaying && currentTurn === myColor ? 'text-primary font-bold animate-pulse' : ''}>
                    {isPlaying
                      ? currentTurn === myColor
                        ? t('gomoku.yourTurn', '轮到你落子！')
                        : t('gomoku.opponentTurn', '等待对方...')
                      : t('gomoku.opponentWaiting', '等待开始')}
                  </span>
                </div>
              </div>
              <div className="relative shrink-0">
                <Avatar
                  src={myAvatar}
                  alt={myNickname}
                  size="md"
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 ${
                    isMeSpeaking ? 'border-primary shadow-xs' : 'border-border'
                  }`}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 border border-neutral-700 shadow-2xs flex items-center justify-center text-[10px]"
                  title={t('gomoku.blackShort', '黑子')}
                >
                  ⚫
                </span>
              </div>
            </div>
          </div>

          {/* Turn Banner Strip */}
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {isPlaying ? (
                <>
                  <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                  <span className={isMyTurn ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''}>
                    {currentTurn === 'black'
                      ? t('gomoku.turnBlackAlert', '当前轮到黑方落子')
                      : t('gomoku.turnWhiteAlert', '当前轮到白方落子')}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
                  <span>{t('gomoku.opponentWaiting', '等待对局开始')}</span>
                </>
              )}
            </div>
            {lastMove ? (
              <span className="text-[11px] text-muted-foreground/90">
                {t('gomoku.lastMoveInfo', {
                  coord: formatCoord(lastMove.x, lastMove.y),
                  step: lastMove.step,
                  defaultValue: `最新落子: ${formatCoord(lastMove.x, lastMove.y)} (第${lastMove.step}手)`,
                })}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/60">{t('gomoku.noMoveYet', '等待首手落子')}</span>
            )}
          </div>
        </section>

        {/* 3. CENTRAL INTERACTIVE GOMOKU BOARD (15x15) */}
        <section className="relative flex items-center justify-center w-full max-w-[390px] sm:max-w-[460px] md:max-w-[500px] aspect-square my-auto shrink-0">
          {/* Wood Board Outer Surface */}
          <div className="relative w-full h-full rounded-2xl sm:rounded-3xl p-3 sm:p-5 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 dark:from-[#3a2717] dark:via-[#2b1c10] dark:to-[#1e130a] border-4 border-amber-400/90 dark:border-amber-900/80 shadow-2xl overflow-hidden flex flex-col justify-between">
            {/* Subtle Wood Texture Ring */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.12)_100%)] pointer-events-none rounded-2xl" />

            {/* Quick Board Corner Tools */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
              <button
                onClick={() => setShowCoordinates(!showCoordinates)}
                className="w-6 h-6 rounded-md bg-amber-900/10 dark:bg-white/10 hover:bg-amber-900/20 dark:hover:bg-white/20 text-amber-950 dark:text-amber-200 flex items-center justify-center transition-colors cursor-pointer"
                title={t('gomoku.toggleCoordinates', '坐标开关')}
                aria-label={t('gomoku.toggleCoordinates', '坐标开关')}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-6 h-6 rounded-md bg-amber-900/10 dark:bg-white/10 hover:bg-amber-900/20 dark:hover:bg-white/20 text-amber-950 dark:text-amber-200 flex items-center justify-center transition-colors cursor-pointer"
                title={t('gomoku.historyReview', '对局回放')}
                aria-label={t('gomoku.historyReview', '对局回放')}
              >
                <History className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top Column Labels (A-O) */}
            {showCoordinates && (
              <div className="grid grid-cols-15 w-full text-center text-[9px] sm:text-[10px] font-black text-amber-950/70 dark:text-amber-300/60 pb-1">
                {COL_LABELS.map((col) => (
                  <div key={col} className="w-full text-center">
                    {col}
                  </div>
                ))}
              </div>
            )}

            {/* 15x15 Grid Core */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center">
              {/* Intersection lines drawing via SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Horizontal & Vertical Grid Lines */}
                {Array.from({ length: BOARD_SIZE }).map((_, i) => {
                  const pct = (i / (BOARD_SIZE - 1)) * 100;
                  return (
                    <React.Fragment key={i}>
                      <line
                        x1="0"
                        y1={pct}
                        x2="100"
                        y2={pct}
                        stroke="currentColor"
                        className="text-amber-950/60 dark:text-amber-200/40"
                        strokeWidth="0.75"
                      />
                      <line
                        x1={pct}
                        y1="0"
                        x2={pct}
                        y2="100"
                        stroke="currentColor"
                        className="text-amber-950/60 dark:text-amber-200/40"
                        strokeWidth="0.75"
                      />
                    </React.Fragment>
                  );
                })}

                {/* Star Points (星位与天元) */}
                {STAR_POINTS.map((pt, idx) => {
                  const cx = (pt.x / (BOARD_SIZE - 1)) * 100;
                  const cy = (pt.y / (BOARD_SIZE - 1)) * 100;
                  return (
                    <circle
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r={pt.x === 7 && pt.y === 7 ? '1.8' : '1.4'}
                      fill="currentColor"
                      className="text-amber-950/80 dark:text-amber-200/70"
                    />
                  );
                })}
              </svg>

              {/* 15x15 Interactive Grid Touch Points */}
              <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 w-full h-full">
                {Array.from({ length: BOARD_SIZE }).map((_, y) =>
                  Array.from({ length: BOARD_SIZE }).map((_, x) => {
                    const stone = board[y]?.[x] || null;
                    const isLast = lastMove && lastMove.x === x && lastMove.y === y;
                    const isHovered = hoveredCell && hoveredCell.x === x && hoveredCell.y === y;
                    const canClick = isPlaying && isMyTurn && stone === null && !!onPlaceStone;

                    return (
                      <div
                        key={`${x}-${y}`}
                        onClick={() => handleCellClick(x, y)}
                        onMouseEnter={() => setHoveredCell({ x, y })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`relative flex items-center justify-center ${
                          canClick ? 'cursor-pointer group' : stone ? 'cursor-default' : 'cursor-not-allowed'
                        }`}
                      >
                        {/* Concrete Placed Stone */}
                        {stone ? (
                          <motion.div
                            initial={{ scale: 0.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className={`w-[85%] h-[85%] rounded-full relative flex items-center justify-center select-none ${
                              stone === 'black'
                                ? 'bg-[radial-gradient(circle_at_32%_32%,#6a6a6a,#1f1f1f_55%,#000000_100%)] shadow-md border border-neutral-900'
                                : 'bg-[radial-gradient(circle_at_32%_32%,#ffffff,#f5f5f7_55%,#d8d8de_100%)] shadow-md border border-neutral-300'
                            }`}
                          >
                            {/* Last Move Target Ring & Step Number */}
                            {isLast && (
                              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
                            )}
                            {isLast && (
                              <span
                                className={`text-[9px] sm:text-[10px] font-black z-10 ${
                                  stone === 'black' ? 'text-primary-foreground' : 'text-primary'
                                }`}
                              >
                                {lastMove.step}
                              </span>
                            )}
                          </motion.div>
                        ) : (
                          /* Hover Preview Stone (Only if cell is empty, playing, & my turn) */
                          isHovered && canClick && (
                            <div
                              className={`w-[80%] h-[80%] rounded-full opacity-40 transition-transform scale-95 pointer-events-none ${
                                myColor === 'black'
                                  ? 'bg-neutral-900'
                                  : 'bg-white border border-neutral-400'
                              }`}
                            />
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Row Labels (1-15) */}
            {showCoordinates && (
              <div className="grid grid-cols-15 w-full text-center text-[9px] sm:text-[10px] font-black text-amber-950/70 dark:text-amber-300/60 pt-1">
                {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                  <div key={i} className="w-full text-center">
                    {15 - i}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. BATTLE INTERACTION & EMOTES BAR */}
        <section className="w-full max-w-md sm:max-w-xl space-y-2 mt-2 shrink-0">
          {/* Preset Quick Chat Bubbles */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {quickChatPhrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickChatClick(phrase)}
                className="px-2.5 py-1 rounded-full bg-card hover:bg-muted border border-border/80 text-xs font-semibold text-foreground whitespace-nowrap shadow-2xs hover:shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Quick Floating Emojis */}
          <div className="flex items-center justify-between gap-1.5 bg-card/60 backdrop-blur-xs rounded-xl p-1.5 border border-border/60">
            <div className="flex items-center gap-1 sm:gap-2">
              {quickEmojis.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleEmojiClick(item.icon)}
                  className="px-2 py-1 rounded-lg hover:bg-muted text-xs font-bold text-foreground flex items-center gap-1 transition-all active:scale-90 cursor-pointer"
                  title={item.label}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="hidden sm:inline text-xs text-muted-foreground">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Voice PTT Pill */}
            <button
              onMouseDown={() => {
                if (voiceMode === 'hold') holdToTalk(true);
              }}
              onMouseUp={() => {
                if (voiceMode === 'hold') holdToTalk(false);
              }}
              onTouchStart={() => {
                if (voiceMode === 'hold') holdToTalk(true);
              }}
              onTouchEnd={() => {
                if (voiceMode === 'hold') holdToTalk(false);
              }}
              className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              <Radio className={`w-3.5 h-3.5 ${isMeSpeaking ? 'animate-ping' : ''}`} />
              <span>{t('gomoku.voice.holdToTalk', '按住说话')}</span>
            </button>
          </div>
        </section>

        {/* 5. BOTTOM ACTION CONTROLS BAR (对局操作金刚键 - 无状态或未轮到时依据真实条件禁用) */}
        <section className="w-full max-w-md sm:max-w-xl grid grid-cols-4 gap-2 pt-2 pb-1 shrink-0">
          {/* 悔棋 (Undo) */}
          <Button
            variant="outline"
            disabled={!onRequestUndo || !isPlaying || (externalUndoRemaining !== undefined && externalUndoRemaining <= 0)}
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-border hover:bg-muted text-foreground relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onRequestUndo}
          >
            <Undo2 className="w-4 h-4 mb-0.5 text-foreground group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.undo', '悔棋')}</span>
            <span className="text-[9px] text-muted-foreground font-medium scale-90">
              {externalUndoRemaining !== undefined
                ? `${externalUndoRemaining}`
                : t('gomoku.actions.undoBadge', '需对方同意')}
            </span>
          </Button>

          {/* 求和 (Draw) */}
          <Button
            variant="outline"
            disabled={!onRequestDraw || !isPlaying}
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-border hover:bg-muted text-foreground relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onRequestDraw}
          >
            <Handshake className="w-4 h-4 mb-0.5 text-foreground group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.draw', '求和')}</span>
            <span className="text-[9px] text-muted-foreground font-medium scale-90">
              {t('gomoku.actions.drawBadge', '协议和棋')}
            </span>
          </Button>

          {/* 认输 (Resign) */}
          <Button
            variant="outline"
            disabled={!onResign || !isPlaying}
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-rose-300/40 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setShowResignDialog(true)}
          >
            <Flag className="w-4 h-4 mb-0.5 text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.resign', '认输')}</span>
            <span className="text-[9px] text-rose-500/80 font-medium scale-90">
              {t('gomoku.actions.resign', '放弃对局')}
            </span>
          </Button>

          {/* AI 提示 (Hint) */}
          <Button
            variant="outline"
            disabled={!onRequestHint || !isPlaying}
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-border hover:bg-muted text-foreground relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onRequestHint}
          >
            <Lightbulb className="w-4 h-4 mb-0.5 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.hint', 'AI 提示')}</span>
            <span className="text-[9px] text-amber-500/80 font-medium scale-90">
              {t('gomoku.actions.hintBadge', '提示')}
            </span>
          </Button>
        </section>
      </main>

      {/* IN-GAME CHAT DRAWER */}
      <InGameChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        onSendMessage={(text) => sendMessage(text, false)}
        players={room?.players || []}
        currentUserId={currentUserId}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isDeafened={isDeafened}
        onToggleDeafen={toggleDeafen}
        speakingUserIds={speakingUserIds}
        voiceStatus={voiceStatus}
        voiceError={voiceError}
        voiceMode={voiceMode}
        onSetVoiceMode={setVoiceMode}
      />

      {/* EXIT GAME CONFIRMATION MODAL */}
      <AnimatePresence>
        {showExitDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {t('gomoku.exitConfirmTitle', '退出确认')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('gomoku.exitConfirmDesc', '对局正在进行中，提前离开将被判定为认输，确定要退出房间吗？')}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowExitDialog(false)}>
                  {t('common.cancel', '取消')}
                </Button>
                <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleExit}>
                  {t('gomoku.exitRoom', '退出对局')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESIGN CONFIRMATION MODAL */}
      <AnimatePresence>
        {showResignDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {t('gomoku.actions.resign', '认输')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('gomoku.controls.confirmResign', '确定要认输吗？此举将结束本局比赛并由对方获胜。')}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowResignDialog(false)}>
                  {t('common.cancel', '取消')}
                </Button>
                <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleResign}>
                  {t('common.confirm', '确认认输')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOVE HISTORY REVIEW MODAL (Truthful move replay from props, no mock step generator) */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-2xl border border-border p-5 shadow-2xl space-y-4 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span>
                    {t('gomoku.stepReplayTitle', {
                      total: moveHistory.length,
                      defaultValue: `对局历史步数 (共 ${moveHistory.length} 手)`,
                    })}
                  </span>
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-full"
                  onClick={() => setShowHistoryModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 py-1 text-xs font-semibold">
                {moveHistory.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">
                    {t('gomoku.noMoveYet', '暂无对局记录')}
                  </p>
                ) : (
                  moveHistory.map((stepItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-6 text-right">#{stepItem.step}</span>
                        <span>{stepItem.color === 'black' ? '⚫ 黑方' : '⚪ 白方'}</span>
                      </div>
                      <span className="font-mono text-primary font-bold">
                        {formatCoord(stepItem.x, stepItem.y)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button variant="default" onClick={() => setShowHistoryModal(false)}>
                  {t('common.close', '关闭')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
