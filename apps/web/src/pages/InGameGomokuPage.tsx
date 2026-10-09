import React, { useState, useMemo, useEffect } from 'react';
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
  Sun,
  Moon,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button, Avatar, InGameChatDrawer, InGameChatDrawerLabels, QuickPhraseItem } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGomokuStore } from '../store/useGomokuStore';
import { toggleMute, toggleDeafen, setVoiceMode, holdToTalk } from '../services/voice';
import { leaveRoom } from '../services/room-session';
import { useVoiceLabels } from '../hooks/useVoiceLabels';
import { StoneColor, GomokuMove } from '@idavoll/protocol';

/**
 * Gomoku Board Coordinates (15 x 15)
 * Columns: A - P (excluding I) -> A, B, C, D, E, F, G, H, J, K, L, M, N, O, P
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

export interface MoveStep {
  x: number;
  y: number;
  color: StoneColor;
  step: number;
  timestamp?: number;
}

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
  isPreview?: boolean;
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
  turnDuration: externalTurnDuration,
  turnTimeRemaining: externalTurnTimeRemaining,
  myTotalTime: externalMyTotalTime,
  opponentTotalTime: externalOpponentTotalTime,
  roundIndex: externalRoundIndex,
  totalRounds: externalTotalRounds,
  spectatorCount: externalSpectatorCount,
  undoRemaining: externalUndoRemaining,
  gameStatus: externalGameStatus,
  winner: externalWinner,
  opponentPlayer: externalOpponent,
  myPlayer: externalMyPlayer,
  isPreview = false,
  onPlaceStone,
  onRequestUndo,
  onRequestDraw,
  onResign,
  onRequestHint,
  onSendQuickChat,
  onSendEmoji,
  onLeaveRoom,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { chatDrawerLabels, voiceDockLabels } = useVoiceLabels();

  // Global user & theme stores
  const currentUserId = useUserStore((s) => s.id);
  const userNickname = useUserStore((s) => s.nickname);
  const userAvatar = useUserStore((s) => s.avatar);
  const isDark = useUserStore((s) => s.isDark);
  const toggleTheme = useUserStore((s) => s.toggleTheme);
  const setLanguage = useUserStore((s) => s.setLanguage);

  // Global room stores (isolated completely when in preview mode)
  const {
    room: rawRoom,
    messages: rawMessages,
    sendMessage,
    isMuted: rawIsMuted,
    isDeafened: rawIsDeafened,
    voiceStatus: rawVoiceStatus,
    voiceError: rawVoiceError,
    speakingUserIds: rawSpeakingUserIds,
    voiceMode: rawVoiceMode,
    connectionState: rawConnectionState,
    error: rawRoomError,
    clearError: clearRoomError,
  } = useRoomStore();

  const room = isPreview ? null : rawRoom;
  const messages = isPreview ? [] : rawMessages;
  const speakingUserIds = isPreview ? [] : rawSpeakingUserIds;
  const isMuted = isPreview ? false : rawIsMuted;
  const isDeafened = isPreview ? false : rawIsDeafened;
  const voiceStatus = isPreview ? 'off' : rawVoiceStatus;
  const voiceError = isPreview ? null : rawVoiceError;
  const voiceMode = isPreview ? 'hold' : rawVoiceMode;
  const connectionState = isPreview ? 'connected' : rawConnectionState;
  const roomError = isPreview ? null : rawRoomError;
  const isConnected = connectionState === 'connected';

  // Gomoku Store state & actions
  const storeGameState = useGomokuStore((s) => s.gameState);
  const storeHint = useGomokuStore((s) => s.hint);
  const storePlaceStone = useGomokuStore((s) => s.placeStone);
  const storeRequestUndo = useGomokuStore((s) => s.requestUndo);
  const storeRequestDraw = useGomokuStore((s) => s.requestDraw);
  const storeReplyRequest = useGomokuStore((s) => s.replyRequest);
  const storeResign = useGomokuStore((s) => s.resign);
  const storeRequestHint = useGomokuStore((s) => s.requestHint);

  const gameState = isPreview ? null : storeGameState;

  // Local UI display toggles
  const [copied, setCopied] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  // Determine game status
  const gameStatus =
    externalGameStatus || (isPreview ? 'waiting' : gameState?.status || 'waiting');
  const isPlaying = gameStatus === 'playing';
  const isRoundOver = gameStatus === 'round_over';

  // My side color resolution
  const myColor: StoneColor | null = useMemo(() => {
    if (externalMyColor) return externalMyColor;
    if (isPreview) return 'black';
    if (!gameState?.playerIds || !currentUserId) return null;
    if (gameState.playerIds.black === currentUserId) return 'black';
    if (gameState.playerIds.white === currentUserId) return 'white';
    return null; // Spectator
  }, [externalMyColor, isPreview, gameState?.playerIds, currentUserId]);

  const isSpectator = !isPreview && myColor === null;

  // Empty 15x15 board if external board not supplied
  const emptyBoard = useMemo(
    () => Array.from({ length: BOARD_SIZE }, () => Array<StoneColor | null>(BOARD_SIZE).fill(null)),
    []
  );
  const board = externalBoard || gameState?.board || emptyBoard;

  const currentTurn: StoneColor | undefined =
    externalTurn || (gameState?.currentTurn ? gameState.currentTurn : isPlaying ? 'black' : undefined);

  // Moves & Last move resolution
  const moves: Array<MoveStep | GomokuMove> = externalHistory || gameState?.moves || [];
  const lastMove =
    externalLastMove !== undefined
      ? externalLastMove
      : moves.length > 0
      ? (moves[moves.length - 1] as MoveStep)
      : null;

  // Turn time remaining calculation (synced with server deadline)
  const [clientTimeLeft, setClientTimeLeft] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (isPreview || !gameState || gameState.status !== 'playing') {
      setClientTimeLeft(undefined);
      return;
    }
    const updateCountdown = () => {
      if (gameState.deadline) {
        const remaining = Math.max(0, Math.ceil((gameState.deadline - Date.now()) / 1000));
        setClientTimeLeft(remaining);
      } else {
        setClientTimeLeft(gameState.timeLeft);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [isPreview, gameState?.deadline, gameState?.timeLeft, gameState?.status, gameState?.revision]);

  const turnTimeRemaining =
    externalTurnTimeRemaining !== undefined ? externalTurnTimeRemaining : clientTimeLeft;
  const turnDuration = externalTurnDuration || gameState?.turnDuration || 60;

  // Helper to format milliseconds to mm:ss
  const formatSpentMs = (ms?: number) => {
    if (ms === undefined || ms === null || isNaN(ms)) return '--:--';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Resolve player identifiers & scores
  const blackPlayerId = gameState?.playerIds?.black;
  const whitePlayerId = gameState?.playerIds?.white;

  const blackScore = useMemo(
    () => gameState?.scores?.find((s) => s.playerId === blackPlayerId)?.score ?? 0,
    [gameState?.scores, blackPlayerId]
  );
  const whiteScore = useMemo(
    () => gameState?.scores?.find((s) => s.playerId === whitePlayerId)?.score ?? 0,
    [gameState?.scores, whitePlayerId]
  );

  // Real room opponent resolution (truthful user data without fake rank/winRate)
  const realOpponent = useMemo(() => {
    if (externalOpponent) return externalOpponent;
    if (isPreview) {
      return {
        id: '',
        nickname: t('gomoku.opponentWaiting', '等待对手'),
        avatarUrl: undefined,
      };
    }
    // If user is playing as white, opponent is black
    const oppId = myColor === 'white' ? blackPlayerId : whitePlayerId;
    if (oppId) {
      const oppScore = gameState?.scores?.find((s) => s.playerId === oppId);
      const oppRoomPlayer = room?.players?.find((p) => p.id === oppId);
      return {
        id: oppId,
        nickname: oppScore?.nickname || oppRoomPlayer?.nickname || t('gomoku.opponentWaiting', '等待对手'),
        avatarUrl: oppScore?.avatar || oppRoomPlayer?.avatar,
      };
    }
    if (room?.players && room.players.length > 1) {
      const opp = room.players.find((p) => p.id !== currentUserId);
      if (opp) {
        return {
          id: opp.id,
          nickname: opp.nickname,
          avatarUrl: opp.avatar,
        };
      }
    }
    return {
      id: '',
      nickname: t('gomoku.opponentWaiting', '等待对手'),
      avatarUrl: undefined,
    };
  }, [externalOpponent, isPreview, myColor, blackPlayerId, whitePlayerId, gameState?.scores, room?.players, currentUserId, t]);

  // Live ticker for active turn thinking time
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (isPreview || !isPlaying) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, [isPreview, isPlaying]);

  const getPlayerSpentMs = (pid?: string, color?: StoneColor) => {
    if (!pid || !gameState?.spentMs) return undefined;
    const base = gameState.spentMs[pid] ?? 0;
    if (isPlaying && gameState.currentTurn === color && gameState.turnStartedAt) {
      const effectiveNow = gameState.deadline ? Math.min(now, gameState.deadline) : now;
      let activeElapsed = Math.max(0, effectiveNow - gameState.turnStartedAt);
      if (gameState.turnDuration) {
        activeElapsed = Math.min(activeElapsed, gameState.turnDuration * 1000);
      }
      return base + activeElapsed;
    }
    return base;
  };

  const opponentColor: StoneColor = myColor === 'white' ? 'black' : 'white';
  const opponentTotalTime =
    externalOpponentTotalTime || (realOpponent.id ? formatSpentMs(getPlayerSpentMs(realOpponent.id, opponentColor)) : '--:--');

  const myNickname = externalMyPlayer?.nickname || userNickname || t('common.player', '玩家');
  const myAvatar = externalMyPlayer?.avatarUrl || userAvatar;
  const myTotalTime =
    externalMyTotalTime || (currentUserId ? formatSpentMs(getPlayerSpentMs(currentUserId, myColor ?? undefined)) : '--:--');

  const isMyTurn = isPlaying && myColor !== null && currentTurn === myColor;
  const isOpponentSpeaking = !isPreview && realOpponent?.id ? speakingUserIds.includes(realOpponent.id) : false;
  const isMeSpeaking = !isPreview && currentUserId ? speakingUserIds.includes(currentUserId) : false;

  // Active Tactical Hint
  const activeHint = useMemo(() => {
    if (isPreview) return null;
    if (storeHint && gameState && gameState.revision === storeHint.revision) {
      return storeHint;
    }
    return null;
  }, [isPreview, storeHint, gameState]);

  // Pending Request state
  const isMatchPlayer = Boolean(
    currentUserId &&
      (gameState?.playerIds?.black === currentUserId || gameState?.playerIds?.white === currentUserId)
  );
  const pendingRequest = isPreview ? null : gameState?.pendingRequest || null;
  const isPendingRequester = Boolean(
    pendingRequest && isMatchPlayer && pendingRequest.requesterId === currentUserId
  );
  const isPendingResponder = Boolean(
    pendingRequest && isMatchPlayer && pendingRequest.requesterId !== currentUserId
  );

  const [requestTimeLeft, setRequestTimeLeft] = useState<number>(0);
  useEffect(() => {
    if (!pendingRequest) {
      setRequestTimeLeft(0);
      return;
    }
    const updateReqCountdown = () => {
      const rem = Math.max(0, Math.ceil((pendingRequest.expiresAt - Date.now()) / 1000));
      setRequestTimeLeft(rem);
    };
    updateReqCountdown();
    const interval = setInterval(updateReqCountdown, 500);
    return () => clearInterval(interval);
  }, [pendingRequest]);

  // Round Over 8s transition countdown
  const [roundOverSeconds, setRoundOverSeconds] = useState(8);
  useEffect(() => {
    if (!isRoundOver) return;
    const calcRoundCountdown = () => {
      if (gameState?.deadline) {
        return Math.max(0, Math.ceil((gameState.deadline - Date.now()) / 1000));
      }
      return 8;
    };
    setRoundOverSeconds(calcRoundCountdown());
    const interval = setInterval(() => {
      setRoundOverSeconds(calcRoundCountdown());
    }, 500);
    return () => clearInterval(interval);
  }, [isRoundOver, gameState?.deadline]);

  // Undo limitation calculation
  const undoCountRemaining =
    externalUndoRemaining !== undefined
      ? externalUndoRemaining
      : currentUserId && gameState?.undoRemaining
      ? gameState.undoRemaining[currentUserId] ?? 3
      : 3;

  const hasPlacedStoneThisRound = useMemo(() => {
    if (isPreview) return false;
    if (!myColor || !gameState?.moves) return false;
    return gameState.moves.some((m) => m.color === myColor);
  }, [isPreview, myColor, gameState?.moves]);

  // Handle cell click / stone placement
  const handleCellClick = (x: number, y: number) => {
    if (isPreview) return;
    if (!isConnected) return;
    if (!isPlaying) return;
    if (isSpectator) return;
    if (!isMyTurn) return;
    if (board[y]?.[x] !== null) return;
    if (onPlaceStone) {
      onPlaceStone(x, y);
    } else {
      storePlaceStone(x, y);
    }
  };

  const roomCode = isPreview ? undefined : (room?.roomCode || room?.roomId);

  const handleCopyRoomId = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleQuickChatClick = (text: string) => {
    if (isPreview) return;
    if (onSendQuickChat) {
      onSendQuickChat(text);
    } else if (room) {
      sendMessage(text, true);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (isPreview) return;
    if (onSendEmoji) {
      onSendEmoji(emoji);
    } else if (room) {
      sendMessage(emoji, true);
    }
  };

  const handleExit = () => {
    if (isPreview) {
      setShowExitDialog(false);
      if (typeof window !== 'undefined' && window.history.length > 1 && window.history.state?.idx > 0) {
        navigate(-1);
      } else {
        navigate(currentUserId ? '/games' : '/login');
      }
      return;
    }
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      leaveRoom();
      navigate('/lobby');
    }
  };

  const handleResign = () => {
    setShowResignDialog(false);
    if (!isPreview && isConnected && !isSpectator) {
      if (onResign) {
        onResign();
      } else {
        storeResign();
      }
    }
  };

  const handleRequestUndo = () => {
    if (
      isPreview ||
      !isConnected ||
      !isPlaying ||
      isSpectator ||
      undoCountRemaining <= 0 ||
      !hasPlacedStoneThisRound ||
      Boolean(pendingRequest)
    )
      return;
    if (onRequestUndo) {
      onRequestUndo();
    } else {
      storeRequestUndo();
    }
  };

  const handleRequestDraw = () => {
    if (isPreview || !isConnected || !isPlaying || isSpectator || Boolean(pendingRequest)) return;
    if (onRequestDraw) {
      onRequestDraw();
    } else {
      storeRequestDraw();
    }
  };

  const handleRequestHint = () => {
    if (isPreview || !isConnected || !isPlaying || isSpectator || !isMyTurn) return;
    if (onRequestHint) {
      onRequestHint();
    } else {
      storeRequestHint();
    }
  };

  const handleReplyPendingRequest = (agree: boolean) => {
    if (isPreview || !isConnected || !isPendingResponder) return;
    storeReplyRequest(agree);
  };

  // Convert coordinate to standard Go string (e.g., x=7, y=7 => H8)
  const formatCoord = (x: number, y: number) => {
    const col = COL_LABELS[x] || '?';
    const row = 15 - y;
    return `${col}${row}`;
  };

  // Quick preset chat phrases
  const quickChatItems = useMemo<QuickPhraseItem[]>(
    () => [
      { icon: '🤝', text: t('gomoku.quickChats.respect', '承让了！') },
      { icon: '👍', text: t('gomoku.quickChats.brilliant', '这步走得妙啊 👍') },
      { icon: '🌸', text: t('gomoku.quickChats.hurry', '快点吧，我等得花儿都谢了 🌸') },
      { icon: '🔄', text: t('gomoku.quickChats.rematch', '再来一局！') },
    ],
    [t]
  );

  // Quick emoticons
  const quickEmojis = [
    { label: t('gomoku.emojis.tea', '请茶'), icon: '🍵' },
    { label: t('gomoku.emojis.think', '沉思'), icon: '💡' },
    { label: t('gomoku.emojis.applause', '鼓掌'), icon: '👏' },
    { label: t('gomoku.emojis.killer', '杀气'), icon: '💥' },
  ];

  const [selectedHistoryRound, setSelectedHistoryRound] = useState<number | 'current'>('current');

  const roundHistoryOptions = useMemo(() => {
    const list: Array<{ round: number | 'current'; label: string; moves: Array<MoveStep | GomokuMove> }> = [];
    if (gameState?.roundResults && gameState.roundResults.length > 0) {
      for (const rr of gameState.roundResults) {
        list.push({
          round: rr.round,
          label: t('gomoku.roundNumber', { current: rr.round }),
          moves: rr.moves || [],
        });
      }
    }
    list.push({
      round: 'current',
      label: externalRoundIndex || gameState?.currentRound
        ? t('gomoku.roundNumber', { current: externalRoundIndex || gameState?.currentRound })
        : t('gomoku.title'),
      moves: moves,
    });
    return list;
  }, [gameState?.roundResults, externalRoundIndex, gameState?.currentRound, moves, t]);

  const activeHistoryMoves = useMemo(() => {
    const selected = roundHistoryOptions.find((opt) => opt.round === selectedHistoryRound);
    return selected ? selected.moves : moves;
  }, [roundHistoryOptions, selectedHistoryRound, moves]);

  // Localized Gomoku chat drawer labels
  const gomokuChatLabels = useMemo<InGameChatDrawerLabels>(
    () => ({
      ...chatDrawerLabels,
      roomChatTitle: t('gomoku.voice.chatDrawer', '房间聊天'),
      inputPlaceholderArtist: t('gomoku.chatPlaceholder', '发送聊天消息...'),
      inputPlaceholderGuesser: t('gomoku.chatPlaceholder', '发送聊天消息...'),
      inputAriaArtist: t('gomoku.chatAria', '发送聊天消息'),
      inputAriaGuesser: t('gomoku.chatAria', '发送聊天消息'),
    }),
    [chatDrawerLabels, t]
  );

  const currentRoundIndex = externalRoundIndex || gameState?.currentRound;
  const currentTotalRounds = externalTotalRounds || gameState?.totalRounds;
  const spectatorsCount =
    externalSpectatorCount !== undefined
      ? externalSpectatorCount
      : room?.players
      ? Math.max(0, room.players.length - 2)
      : 0;

  const roundOverBannerText = useMemo(() => {
    if (!isRoundOver) return '';
    const roundNum = currentRoundIndex || 1;
    const reasonText = gameState?.resultReason
      ? t(`gomoku.reasons.${gameState.resultReason}`, { defaultValue: gameState.resultReason })
      : '';
    if (gameState?.winner === 'draw') {
      return t('gomoku.roundOverDrawBanner', {
        round: roundNum,
        reason: reasonText || t('gomoku.reasons.draw_agreed'),
        seconds: roundOverSeconds,
      });
    }
    if (gameState?.winner === 'black' || gameState?.winner === 'white') {
      const winnerId = gameState.winner === 'black' ? blackPlayerId : whitePlayerId;
      const winnerName =
        gameState.scores?.find((s) => s.playerId === winnerId)?.nickname ||
        (gameState.winner === 'black' ? t('gomoku.black') : t('gomoku.white'));
      return t('gomoku.roundOverWinnerBanner', {
        round: roundNum,
        name: winnerName,
        reason: reasonText || t('gomoku.reasons.five'),
        seconds: roundOverSeconds,
      });
    }
    return t('gomoku.roundOverWaiting', {
      round: roundNum,
      seconds: roundOverSeconds,
    });
  }, [
    isRoundOver,
    currentRoundIndex,
    gameState?.winner,
    gameState?.resultReason,
    gameState?.scores,
    blackPlayerId,
    whitePlayerId,
    roundOverSeconds,
    t,
  ]);

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-background text-foreground overflow-hidden select-none">
      {/* 0. PREVIEW BANNER (ISOLATED UI PREVIEW MODE) */}
      {isPreview && (
        <div className="w-full bg-[var(--theme-primary,#5B5BF0)]/10 border-b border-[var(--theme-primary,#5B5BF0)]/20 px-2.5 sm:px-6 py-1 shrink-0 z-30 flex items-center justify-between text-xs font-semibold text-foreground gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--theme-primary,#5B5BF0)] text-white shrink-0">
              {t('gomoku.preview.badge', 'UI 预览')}
            </span>
            <span className="text-[11px] sm:text-xs text-foreground/90 font-medium truncate">
              {t('gomoku.preview.notice', '五子棋界面预览 · 控件已禁用')}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
              aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextLang = i18n.language.startsWith('en') ? 'zh-CN' : 'en';
                i18n.changeLanguage(nextLang);
                setLanguage(nextLang);
              }}
              className="px-1.5 py-0.5 rounded text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title={t('theme.switchLang')}
              aria-label={t('theme.switchLang')}
            >
              {i18n.language.startsWith('en') ? '中' : 'EN'}
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP NAVIGATION BAR */}
      <header className="w-full bg-card/80 backdrop-blur-md border-b border-border px-2.5 sm:px-6 py-1.5 sm:py-2 shrink-0 z-20 flex items-center justify-between gap-1.5 sm:gap-2 shadow-xs">
        {/* Left: Back + Room Code + Mode */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-muted shrink-0 cursor-pointer"
            onClick={() => setShowExitDialog(true)}
            aria-label={isPreview ? t('gomoku.preview.exitBtn', '退出预览') : t('gomoku.exitRoom', '退出对局')}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
          </Button>

          {/* Room # with Copy Chip */}
          {roomCode && (
            <button
              onClick={handleCopyRoomId}
              className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-muted/80 hover:bg-muted text-[11px] sm:text-xs font-bold text-foreground transition-all shrink-0 cursor-pointer"
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

          {/* Spectator Mode Indicator */}
          {isSpectator && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              {t('gomoku.spectatorBadge', '观战模式')}
            </span>
          )}

          {/* Match format badge */}
          {!isPreview && currentTotalRounds !== undefined && (
            <span className="hidden sm:inline-flex text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
              {t('gomoku.matchTotalRounds', { count: currentTotalRounds })}
            </span>
          )}
        </div>

        {/* Center: Round / Match Status Badge */}
        <div className="flex items-center justify-center min-w-0 flex-1 px-1">
          {isPreview ? (
            <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] sm:text-xs tracking-wide shadow-xs flex items-center gap-1 max-w-[170px] xs:max-w-none truncate">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{t('gomoku.preview.unreleasedStatus', '界面预览模式')}</span>
            </div>
          ) : isRoundOver ? (
            <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-[11px] sm:text-xs tracking-wide shadow-xs flex items-center gap-1.5 animate-pulse truncate">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{roundOverBannerText}</span>
            </div>
          ) : currentRoundIndex !== undefined ? (
            <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-extrabold text-[11px] sm:text-sm tracking-wide shadow-xs flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">
                {currentTotalRounds && currentRoundIndex === currentTotalRounds
                  ? t('gomoku.roundBadge', {
                      current: currentRoundIndex,
                      defaultValue: `第 ${currentRoundIndex} 局 · 决胜局`,
                    })
                  : t('gomoku.roundBadgeNormal', {
                      current: currentRoundIndex,
                      defaultValue: `第 ${currentRoundIndex} 局`,
                    })}
              </span>
            </div>
          ) : isPlaying ? (
            <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-muted border border-border text-foreground font-bold text-[11px] sm:text-sm truncate">
              {t('gomoku.title', '五子棋')}
            </div>
          ) : (
            <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px] sm:text-sm truncate">
              {t('gomoku.opponentWaiting', '等待对局开始')}
            </div>
          )}
        </div>

        {/* Right: Spectators + Audio/Voice + Chat Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {!isPreview && spectatorsCount > 0 && (
            <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground font-medium">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>{spectatorsCount}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-muted shrink-0 text-muted-foreground cursor-pointer"
            onClick={() => {
              if (!isPreview) toggleDeafen();
            }}
            aria-label={isDeafened ? voiceDockLabels.undeafenAria : voiceDockLabels.deafenAria}
          >
            {isDeafened ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-muted shrink-0 relative text-muted-foreground cursor-pointer"
            onClick={() => setIsChatDrawerOpen(true)}
            aria-label={t('gomoku.voice.chatDrawer', '房间聊天')}
          >
            <MessageSquare className="w-4 h-4 text-foreground" />
            {messages.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
      </header>

      {/* CONNECTION STATE BANNER */}
      {!isPreview && !isConnected && (
        <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-6 py-1.5 shrink-0 z-25 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            {connectionState === 'connecting' || connectionState === 'reconnecting'
              ? t('common.reconnecting')
              : t('roomWaiting.notConnected')}
          </span>
        </div>
      )}

      {/* ROOM ERROR BANNER */}
      {!isPreview && roomError && (
        <div className="w-full bg-rose-500/15 border-b border-rose-500/30 px-3 sm:px-6 py-1.5 shrink-0 z-25 flex items-center justify-between gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{t(`gomoku.errors.${roomError}`, { defaultValue: roomError })}</span>
          </div>
          <button
            type="button"
            onClick={clearRoomError}
            className="p-1 hover:bg-rose-500/20 rounded-full text-rose-600 dark:text-rose-400 cursor-pointer"
            aria-label={t('common.close')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. PENDING REQUEST NOTIFICATION BANNER (悔棋 / 求和) */}
      <AnimatePresence>
        {pendingRequest && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-amber-500/10 border-b border-amber-500/30 px-3 sm:px-6 py-2 shrink-0 z-20 flex items-center justify-between text-xs font-bold text-foreground"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">
                {isPendingRequester
                  ? pendingRequest.type === 'undo'
                    ? t('gomoku.actions.undoWaiting', { sec: requestTimeLeft, defaultValue: `已申请悔棋，等待对方同意 (${requestTimeLeft}s)...` })
                    : t('gomoku.actions.drawWaiting', { sec: requestTimeLeft, defaultValue: `已发起求和，等待对方回应 (${requestTimeLeft}s)...` })
                  : pendingRequest.type === 'undo'
                  ? t('gomoku.actions.undoIncoming', '对方申请悔棋，是否同意？')
                  : t('gomoku.actions.drawIncoming', '对方请求和棋，是否同意？')}
              </span>
            </div>

            {isPendingResponder && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  disabled={!isConnected}
                  onClick={() => handleReplyPendingRequest(true)}
                  className="h-7 px-3 font-black text-xs gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('gomoku.actions.accept', '同意')}</span>
                </Button>
                <Button
                  size="sm"
                  variant="surface"
                  disabled={!isConnected}
                  onClick={() => handleReplyPendingRequest(false)}
                  className="h-7 px-3 font-black text-xs gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{t('gomoku.actions.decline', '拒绝')}</span>
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. ACTIVE HINT BANNER */}
      <AnimatePresence>
        {activeHint && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full bg-primary/10 border-b border-primary/20 px-3 sm:px-6 py-1 shrink-0 z-10 flex items-center justify-center gap-2 text-xs font-bold text-primary"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {t('gomoku.actions.hintDesc', {
                coord: formatCoord(activeHint.x, activeHint.y),
                defaultValue: `服务端战术算法推荐落子: ${formatCoord(activeHint.x, activeHint.y)}`,
              })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MAIN BATTLE AREA (VERSUS HEADER + GOMOKU BOARD) */}
      <main className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 max-w-5xl mx-auto w-full min-h-0 overflow-y-auto no-scrollbar">
        {/* VERSUS PLAYERS HEADER BAR */}
        <section className="w-full max-w-md sm:max-w-xl bg-card rounded-2xl border border-border p-2.5 sm:p-3 shadow-xs mb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Opponent Card (White Stones by default if user is Black) */}
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
                  title={opponentColor === 'white' ? t('gomoku.whiteShort', '白子') : t('gomoku.blackShort', '黑子')}
                >
                  {opponentColor === 'white' ? '⚪' : '⚫'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                    {realOpponent.nickname}
                  </h4>
                  {gameState && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-black shrink-0">
                      {opponentColor === 'white' ? whiteScore : blackScore} {t('settlement.winShort', '胜')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium mt-0.5">
                  <span className={isPlaying && currentTurn === opponentColor ? 'text-primary font-bold animate-pulse' : ''}>
                    {isPlaying
                      ? currentTurn === opponentColor
                        ? t('gomoku.opponentThinking', '思考中...')
                        : t('gomoku.opponentReady', '等待中')
                      : t('gomoku.opponentWaiting', '等待对手')}
                  </span>
                  <span>·</span>
                  <span>{opponentTotalTime}</span>
                </div>
              </div>
            </div>

            {/* Turn Timer & VS Center Badge */}
            <div className="flex flex-col items-center justify-center px-2 shrink-0">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-muted/80 shadow-inner">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted/40 stroke-current"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {turnTimeRemaining !== undefined && turnDuration > 0 && (
                    <path
                      className={`stroke-current transition-all duration-300 ${
                        turnTimeRemaining <= 5 ? 'text-rose-500' : 'text-primary'
                      }`}
                      strokeDasharray={`${Math.max(0, Math.min(100, (turnTimeRemaining / turnDuration) * 100))}, 100`}
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

            {/* My Card */}
            <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-end gap-1.5">
                  {gameState && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-black shrink-0">
                      {myColor === 'black' ? blackScore : whiteScore} {t('settlement.winShort', '胜')}
                    </span>
                  )}
                  <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                    {myNickname}
                  </h4>
                </div>
                <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground font-medium mt-0.5">
                  <span>{myTotalTime}</span>
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
                  title={myColor === 'white' ? t('gomoku.whiteShort', '白子') : t('gomoku.blackShort', '黑子')}
                >
                  {myColor === 'white' ? '⚪' : '⚫'}
                </span>
              </div>
            </div>
          </div>

          {/* Turn Banner Strip */}
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold text-muted-foreground gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
              {isPreview ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400 text-[11px] sm:text-xs truncate">
                    {t('gomoku.preview.waitingBackend', '当前仅供界面展示，暂不支持落子对弈')}
                  </span>
                </>
              ) : isPlaying ? (
                <>
                  <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'} shrink-0`} />
                  <span className={`${isMyTurn ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''} truncate`}>
                    {currentTurn === 'black'
                      ? t('gomoku.turnBlackAlert', '当前轮到黑方落子')
                      : t('gomoku.turnWhiteAlert', '当前轮到白方落子')}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60 shrink-0" />
                  <span className="truncate">{t('gomoku.opponentWaiting', '等待对局开始')}</span>
                </>
              )}
            </div>
            {lastMove ? (
              <span className="text-[11px] text-muted-foreground/90 shrink-0">
                {t('gomoku.lastMoveInfo', {
                  coord: formatCoord(lastMove.x, lastMove.y),
                  step: lastMove.step,
                  defaultValue: `最新落子: ${formatCoord(lastMove.x, lastMove.y)} (第${lastMove.step}手)`,
                })}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/60 shrink-0">{t('gomoku.noMoveYet', '等待首手落子')}</span>
            )}
          </div>
        </section>

        {/* 5. CENTRAL INTERACTIVE GOMOKU BOARD (15x15) */}
        <section className="relative flex items-center justify-center w-full max-w-[340px] sm:max-w-[440px] md:max-w-[480px] aspect-square my-auto shrink-0">
          {/* Wood Board Outer Surface */}
          <div className="relative w-full h-full rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 dark:from-[#3a2717] dark:via-[#2b1c10] dark:to-[#1e130a] border-4 border-amber-400/90 dark:border-amber-900/80 shadow-2xl overflow-hidden flex flex-col justify-between">
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

            {/* Top Column Labels (A-P) */}
            {showCoordinates && (
              <div
                className="grid grid-cols-15 w-full text-center text-[9px] sm:text-[10px] font-black text-amber-950/70 dark:text-amber-300/60 pb-1 shrink-0"
                style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
              >
                {COL_LABELS.map((col) => (
                  <div key={col} className="w-full text-center leading-none">
                    {col}
                  </div>
                ))}
              </div>
            )}

            {/* 15x15 Grid Core */}
            <div className="relative flex-1 w-full min-h-0 flex items-center justify-center">
              {/* Intersection lines drawing via SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Horizontal & Vertical Grid Lines */}
                {Array.from({ length: BOARD_SIZE }).map((_, i) => {
                  const pct = ((i + 0.5) / BOARD_SIZE) * 100;
                  const startPct = (0.5 / BOARD_SIZE) * 100;
                  const endPct = ((BOARD_SIZE - 0.5) / BOARD_SIZE) * 100;
                  return (
                    <React.Fragment key={i}>
                      <line
                        x1={startPct}
                        y1={pct}
                        x2={endPct}
                        y2={pct}
                        stroke="currentColor"
                        className="text-amber-950/60 dark:text-amber-200/40"
                        strokeWidth="0.75"
                      />
                      <line
                        x1={pct}
                        y1={startPct}
                        x2={pct}
                        y2={endPct}
                        stroke="currentColor"
                        className="text-amber-950/60 dark:text-amber-200/40"
                        strokeWidth="0.75"
                      />
                    </React.Fragment>
                  );
                })}

                {/* Star Points (星位与天元) */}
                {STAR_POINTS.map((pt, idx) => {
                  const cx = ((pt.x + 0.5) / BOARD_SIZE) * 100;
                  const cy = ((pt.y + 0.5) / BOARD_SIZE) * 100;
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
              <div
                className="absolute inset-0 grid grid-cols-15 grid-rows-15 w-full h-full"
                style={{
                  gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
                }}
              >
                {Array.from({ length: BOARD_SIZE }).map((_, y) =>
                  Array.from({ length: BOARD_SIZE }).map((_, x) => {
                    const stone = board[y]?.[x] || null;
                    const isLast = lastMove && lastMove.x === x && lastMove.y === y;
                    const isHovered = hoveredCell && hoveredCell.x === x && hoveredCell.y === y;
                    const isHintCell = Boolean(activeHint && activeHint.x === x && activeHint.y === y);
                    const canClick = !isPreview && isConnected && isPlaying && isMyTurn && !isSpectator && stone === null;

                    return (
                      <button
                        type="button"
                        key={`${x}-${y}`}
                        disabled={!canClick && !stone}
                        tabIndex={canClick ? 0 : -1}
                        onClick={() => handleCellClick(x, y)}
                        onKeyDown={(e) => {
                          if (canClick && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleCellClick(x, y);
                          }
                        }}
                        onMouseEnter={() => setHoveredCell({ x, y })}
                        onMouseLeave={() => setHoveredCell(null)}
                        aria-label={`${formatCoord(x, y)}: ${
                          stone
                            ? stone === 'black'
                              ? t('gomoku.black')
                              : t('gomoku.white')
                            : canClick
                            ? t('gomoku.yourTurn')
                            : ''
                        }`}
                        className={`relative flex items-center justify-center border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-full ${
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
                        ) : isHintCell ? (
                          /* Tactical Algorithm Suggestion Marker */
                          <div className="w-[85%] h-[85%] rounded-full border-2 border-dashed border-amber-500 bg-amber-500/20 flex items-center justify-center animate-pulse z-10">
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                          </div>
                        ) : (
                          /* Hover Preview Stone */
                          isHovered && canClick && (
                            <div
                              className={`w-[80%] h-[80%] rounded-full opacity-40 transition-transform scale-95 pointer-events-none ${
                                myColor === 'white'
                                  ? 'bg-white border border-neutral-400'
                                  : 'bg-neutral-900'
                              }`}
                            />
                          )
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Row Labels (1-15) */}
            {showCoordinates && (
              <div
                className="grid grid-cols-15 w-full text-center text-[9px] sm:text-[10px] font-black text-amber-950/70 dark:text-amber-300/60 pt-1 shrink-0"
                style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
              >
                {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                  <div key={i} className="w-full text-center leading-none">
                    {15 - i}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 6. BATTLE INTERACTION & EMOTES BAR */}
        <section className="w-full max-w-md sm:max-w-xl space-y-2 mt-2 shrink-0">
          {/* Preset Quick Chat Bubbles */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {quickChatItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickChatClick(item.text)}
                className="px-2.5 py-1 rounded-full bg-card hover:bg-muted border border-border/80 text-xs font-semibold text-foreground whitespace-nowrap shadow-2xs hover:shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                {item.text}
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
                if (!isPreview && voiceMode === 'hold') holdToTalk(true);
              }}
              onMouseUp={() => {
                if (!isPreview && voiceMode === 'hold') holdToTalk(false);
              }}
              onTouchStart={() => {
                if (!isPreview && voiceMode === 'hold') holdToTalk(true);
              }}
              onTouchEnd={() => {
                if (!isPreview && voiceMode === 'hold') holdToTalk(false);
              }}
              disabled={isPreview}
              className={`px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
                isPreview ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isMeSpeaking ? 'animate-ping' : ''}`} />
              <span>{t('gomoku.voice.holdToTalk', '按住说话')}</span>
            </button>
          </div>
        </section>

        {/* 7. BOTTOM ACTION CONTROLS BAR (对局操作金刚键) */}
        <section className="w-full max-w-md sm:max-w-xl grid grid-cols-4 gap-2 pt-2 pb-1 shrink-0">
          {/* 悔棋 (Undo) */}
          <Button
            variant="outline"
            disabled={
              isPreview ||
              !isConnected ||
              isSpectator ||
              !isPlaying ||
              undoCountRemaining <= 0 ||
              !hasPlacedStoneThisRound ||
              Boolean(pendingRequest)
            }
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-border hover:bg-muted text-foreground relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleRequestUndo}
          >
            <Undo2 className="w-4 h-4 mb-0.5 text-foreground group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.undo', '悔棋')}</span>
            <span className="hidden sm:inline-block text-[9px] text-muted-foreground font-medium scale-90 whitespace-nowrap truncate max-w-full">
              {undoCountRemaining > 0
                ? `${undoCountRemaining}/3`
                : t('gomoku.actions.undoBadge', '需对方同意')}
            </span>
          </Button>

          {/* 求和 (Draw) */}
          <Button
            variant="outline"
            disabled={isPreview || !isConnected || isSpectator || !isPlaying || Boolean(pendingRequest)}
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-border hover:bg-muted text-foreground relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleRequestDraw}
          >
            <Handshake className="w-4 h-4 mb-0.5 text-foreground group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.draw', '求和')}</span>
            <span className="hidden sm:inline-block text-[9px] text-muted-foreground font-medium scale-90 whitespace-nowrap truncate max-w-full">
              {t('gomoku.actions.drawBadge', '协议和棋')}
            </span>
          </Button>

          {/* 认输 (Resign) */}
          <Button
            variant="surface"
            disabled={isPreview || !isConnected || isSpectator || !isPlaying}
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-border hover:bg-muted text-foreground relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setShowResignDialog(true)}
          >
            <Flag className="w-4 h-4 mb-0.5 text-foreground group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.resign', '认输')}</span>
            <span className="hidden sm:inline-block text-[9px] text-muted-foreground font-medium scale-90 whitespace-nowrap truncate max-w-full">
              {t('gomoku.actions.resign', '放弃对局')}
            </span>
          </Button>

          {/* 战术提示 (Hint) */}
          <Button
            variant="outline"
            disabled={isPreview || !isConnected || isSpectator || !isPlaying || !isMyTurn}
            className="flex flex-col items-center justify-center py-2 h-auto rounded-xl border-border hover:bg-muted text-foreground relative group disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleRequestHint}
          >
            <Lightbulb className="w-4 h-4 mb-0.5 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">{t('gomoku.actions.hint', '战术提示')}</span>
            <span className="hidden sm:inline-block text-[9px] text-amber-500/80 font-medium scale-90 whitespace-nowrap truncate max-w-full">
              {t('gomoku.actions.hintBadge', '算法建议')}
            </span>
          </Button>
        </section>
      </main>

      {/* IN-GAME CHAT DRAWER */}
      <InGameChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        onSendMessage={(text, isDanmaku) => {
          if (!isPreview) sendMessage(text, isDanmaku);
        }}
        players={room?.players || []}
        currentUserId={currentUserId}
        isMuted={isMuted}
        onToggleMute={isPreview ? () => {} : toggleMute}
        isDeafened={isDeafened}
        onToggleDeafen={isPreview ? () => {} : toggleDeafen}
        speakingUserIds={speakingUserIds}
        voiceStatus={voiceStatus}
        voiceError={voiceError}
        voiceMode={voiceMode}
        onSetVoiceMode={isPreview ? () => {} : setVoiceMode}
        labels={gomokuChatLabels}
        quickPhrases={quickChatItems}
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
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {isPreview ? t('gomoku.preview.exitTitle', '退出预览') : t('gomoku.exitConfirmTitle', '退出确认')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPreview
                      ? t('gomoku.preview.exitDesc', '确定要退出五子棋界面预览吗？')
                      : t('gomoku.exitConfirmDesc', '对局正在进行中，提前离开将被判定为认输，确定要退出房间吗？')}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowExitDialog(false)}>
                  {t('common.cancel', '取消')}
                </Button>
                <Button variant="default" className="font-bold cursor-pointer" onClick={handleExit}>
                  {isPreview ? t('gomoku.preview.exitBtn', '退出预览') : t('gomoku.exitRoom', '退出对局')}
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
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {t('gomoku.actions.resignConfirmTitle', '认输确认')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('gomoku.actions.resignConfirmDesc', '确定要认输吗？认输仅结束本局并判定对方本局获胜，双方仍留在房间内，多局赛制将自动进入下一局。')}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowResignDialog(false)}>
                  {t('common.cancel', '取消')}
                </Button>
                <Button variant="default" className="font-bold cursor-pointer" onClick={handleResign}>
                  {t('common.confirm', '确认认输')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOVE HISTORY REVIEW MODAL (Truthful move replay from moves) */}
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
                      total: activeHistoryMoves.length,
                      defaultValue: `对局历史步数 (共 ${activeHistoryMoves.length} 手)`,
                    })}
                  </span>
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-full cursor-pointer"
                  onClick={() => setShowHistoryModal(false)}
                  aria-label={t('common.close', '关闭')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Round Switcher Tabs (if previous rounds exist) */}
              {roundHistoryOptions.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {roundHistoryOptions.map((opt) => (
                    <button
                      key={String(opt.round)}
                      type="button"
                      onClick={() => setSelectedHistoryRound(opt.round)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedHistoryRound === opt.round
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                      }`}
                    >
                      {opt.label} ({opt.moves.length})
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 py-1 text-xs font-semibold">
                {activeHistoryMoves.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">
                    {t('gomoku.noMoveYet', '暂无对局记录')}
                  </p>
                ) : (
                  activeHistoryMoves.map((stepItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-6 text-right">#{stepItem.step}</span>
                        <span>{stepItem.color === 'black' ? `⚫ ${t('gomoku.black')}` : `⚪ ${t('gomoku.white')}`}</span>
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
