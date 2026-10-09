import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Crown,
  RotateCcw,
  AlertTriangle,
  Users,
  X,
  Sparkles,
  Award,
} from 'lucide-react';
import { Button, Badge, Avatar } from '@idavoll/ui';
import { DrawAndGuessState } from '@idavoll/protocol';

export interface GameResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: DrawAndGuessState | null;
  currentUserId: string;
  isHost: boolean;
  onRestartGame?: () => void;
  isRestarting?: boolean;
}

export const GameResultDialog: React.FC<GameResultDialogProps> = ({
  isOpen,
  onClose,
  gameState,
  currentUserId,
  isHost,
  onRestartGame,
  isRestarting = false,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusedElementRef = useRef<HTMLElement | null>(null);

  const isAborted = Boolean(gameState?.aborted);

  // Invalidate user stats / matches queries when result is available
  useEffect(() => {
    if (isOpen) {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['drawings'] });
    }
  }, [isOpen, queryClient]);

  // Safely copy scores before sorting to prevent mutating store in-place
  const sortedScores = useMemo(() => {
    if (!gameState?.scores) return [];
    return [...gameState.scores].sort((a, b) => b.score - a.score);
  }, [gameState?.scores]);

  // Use real server gamePodium or derive standard competition ranking
  const podiumList = useMemo(() => {
    if (isAborted) return [];
    if (gameState?.gamePodium && gameState.gamePodium.length > 0) {
      return [...gameState.gamePodium].sort((a, b) => a.rank - b.rank || b.score - a.score);
    }
    return sortedScores.map((s) => ({
      ...s,
      rank: sortedScores.findIndex((p) => p.score === s.score) + 1,
      isMvp: sortedScores.length > 0 && s.score === sortedScores[0].score,
    }));
  }, [isAborted, gameState?.gamePodium, sortedScores]);

  // Winners: All rank 1 players (or top score). Zero-score ties also win!
  const winners = useMemo(() => {
    if (isAborted) return [];
    const rank1s = podiumList.filter((p) => p.rank === 1 || p.isMvp);
    if (rank1s.length > 0) return rank1s;
    if (sortedScores.length === 0) return [];
    const topScore = sortedScores[0].score;
    return sortedScores.filter((s) => s.score === topScore);
  }, [isAborted, podiumList, sortedScores]);

  const myPodium = useMemo(() => {
    return podiumList.find((p) => p.playerId === currentUserId);
  }, [podiumList, currentUserId]);

  const isMeWinner = useMemo(() => {
    return winners.some((w) => w.playerId === currentUserId);
  }, [winners, currentUserId]);

  const isTied = winners.length > 1;

  // Track tied ranks across podium list
  const tiedRanks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of podiumList) {
      counts.set(p.rank, (counts.get(p.rank) || 0) + 1);
    }
    return counts;
  }, [podiumList]);

  // Fire confetti for normal match completion
  useEffect(() => {
    if (isOpen && !isAborted && winners.length > 0) {
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.55 },
        });
      } catch {}
    }
  }, [isOpen, isAborted, winners.length]);

  // Focus trap helpers
  const getFocusableElements = () => {
    if (!dialogRef.current) return [];
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  };

  // Focus management on open/close
  useEffect(() => {
    if (!isOpen) return;

    prevFocusedElementRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      if (prevFocusedElementRef.current && typeof prevFocusedElementRef.current.focus === 'function') {
        try {
          prevFocusedElementRef.current.focus();
        } catch {}
      }
    };
  }, [isOpen]);

  // Keyboard accessibility: Escape to dismiss, Tab constraint, stopPropagation to prevent background action trigger
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !dialogRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !dialogRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  // Podium candidates: top 3 entries
  const top1 = podiumList[0];
  const top2 = podiumList[1];
  const top3 = podiumList[2];

  const getRankDisplay = (rank: number, isTiedRank: boolean) => {
    if (rank === 1) {
      return {
        badge: '1',
        medal: '🥇',
        label: isTiedRank ? t('settlement.tiedChampion') : t('settlement.mvpChampion'),
        ring: 'ring-amber-400',
        badgeBg: 'bg-amber-400 text-amber-950',
        pedestalClass:
          'bg-gradient-to-t from-amber-500/25 to-amber-400/35 border-t-2 border-x-2 border-amber-400/70 text-amber-600 dark:text-amber-400',
        heightClass: 'h-22 sm:h-26',
        isChampion: true,
      };
    }
    if (rank === 2) {
      return {
        badge: '2',
        medal: '🥈',
        label: isTiedRank ? t('settlement.tiedRunnerUp') : t('settlement.runnerUp'),
        ring: 'ring-slate-300 dark:ring-slate-600',
        badgeBg: 'bg-slate-300 text-slate-800',
        pedestalClass: 'bg-slate-200/80 dark:bg-slate-800/80 text-muted-foreground',
        heightClass: 'h-16 sm:h-20',
        isChampion: false,
      };
    }
    if (rank === 3) {
      return {
        badge: '3',
        medal: '🥉',
        label: isTiedRank ? t('settlement.tiedThird') : t('settlement.thirdPlace'),
        ring: 'ring-amber-700/50',
        badgeBg: 'bg-amber-700 text-amber-100',
        pedestalClass: 'bg-amber-900/15 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
        heightClass: 'h-12 sm:h-16',
        isChampion: false,
      };
    }
    return {
      badge: `${rank}`,
      medal: '🏅',
      label: t('settlement.rankN', { rank }),
      ring: 'ring-border',
      badgeBg: 'bg-muted text-muted-foreground',
      pedestalClass: 'bg-muted/40 text-muted-foreground',
      heightClass: 'h-10 sm:h-12',
      isChampion: false,
    };
  };

  const rankInfo1 = top1 ? getRankDisplay(top1.rank, (tiedRanks.get(top1.rank) ?? 0) > 1) : null;
  const rankInfo2 = top2 ? getRankDisplay(top2.rank, (tiedRanks.get(top2.rank) ?? 0) > 1) : null;
  const rankInfo3 = top3 ? getRankDisplay(top3.rank, (tiedRanks.get(top3.rank) ?? 0) > 1) : null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-result-title"
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-lg sm:max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-card border-2 border-border shadow-2xl overflow-hidden focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Close Button (Dismiss Only - Keeps player in room) */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('settlement.closeAria')}
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/60 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Outcome Header Banner */}
          <div
            className={`p-5 sm:p-6 text-center border-b border-border/80 relative overflow-hidden ${
              isAborted
                ? 'bg-amber-500/10'
                : isMeWinner
                ? 'bg-gradient-to-b from-amber-500/20 to-transparent'
                : 'bg-gradient-to-b from-primary/10 to-transparent'
            }`}
          >
            {isAborted ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 id="game-result-title" className="text-xl sm:text-2xl font-black text-foreground">
                  {t('settlement.abortedTitle', '对局已提前终止')}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                  {t('settlement.abortedDesc', '由于在线玩家人数不足（少于 2 人），比赛已提前结束。无法结算本场排名。')}
                </p>
              </div>
            ) : isMeWinner ? (
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="w-14 h-14 rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-md relative"
                >
                  <Trophy className="w-8 h-8" />
                  <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-amber-400 animate-spin" />
                </motion.div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-amber-500 text-amber-950 font-black text-xs px-2.5 py-0.5">
                    {t('settlement.wonMatch')}
                  </Badge>
                </div>
                <h2 id="game-result-title" className="text-xl sm:text-2xl font-black text-foreground">
                  {isTied ? t('settlement.tiedVictory') : t('settlement.soloVictory')}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
                  {t('settlement.victoryDesc', { score: myPodium?.score ?? 0 })}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                  <Award className="w-7 h-7" />
                </div>
                {myPodium && (
                  <Badge variant="subtle" className="text-muted-foreground font-bold text-xs px-2.5 py-0.5">
                    {t('settlement.lostMatch')}
                  </Badge>
                )}
                <h2 id="game-result-title" className="text-xl sm:text-2xl font-black text-foreground">
                  {myPodium ? t('settlement.settleDefeat') : t('settlement.title')}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
                  {myPodium
                    ? t('settlement.defeatDesc', { rank: myPodium.rank, score: myPodium.score })
                    : t('settlement.gameEndedThanks')}
                </p>
              </div>
            )}
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Podium (Top 3 for normal matches) */}
            {!isAborted && podiumList.length > 0 && (
              <div className="pt-4 pb-2">
                <div className="flex items-end justify-center gap-2 sm:gap-4 px-2">
                  {/* Left Column (top2) */}
                  {top2 && rankInfo2 && (
                    <div className="flex flex-col items-center flex-1 max-w-[110px] sm:max-w-[130px]">
                      <div className="relative mb-1">
                        {rankInfo2.isChampion && (
                          <Crown className="w-5 h-5 text-amber-500 fill-amber-500 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                        )}
                        <Avatar
                          src={top2.avatar}
                          alt={top2.nickname}
                          size="md"
                          className={`ring-2 ${rankInfo2.ring} shadow-md`}
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${rankInfo2.badgeBg} flex items-center justify-center font-black text-[10px] shadow`}
                        >
                          {rankInfo2.badge}
                        </div>
                      </div>
                      <span className="font-black text-xs text-foreground truncate w-full text-center px-1">
                        {top2.nickname}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">
                        {top2.score} 分
                      </span>
                      <div
                        className={`w-full ${rankInfo2.heightClass} ${rankInfo2.pedestalClass} rounded-t-2xl mt-2 flex flex-col items-center justify-center shadow-xs`}
                      >
                        <span className="text-base sm:text-lg">{rankInfo2.medal}</span>
                        <span className="text-[9px] font-bold text-current">{rankInfo2.label}</span>
                      </div>
                    </div>
                  )}

                  {/* Center Column (top1) */}
                  {top1 && rankInfo1 && (
                    <div className="flex flex-col items-center flex-1 max-w-[130px] sm:max-w-[150px]">
                      <div className="relative mb-1">
                        {rankInfo1.isChampion && (
                          <Crown className="w-6 h-6 text-amber-500 fill-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                        )}
                        <Avatar
                          src={top1.avatar}
                          alt={top1.nickname}
                          size="lg"
                          className={`ring-3 ${rankInfo1.ring} shadow-xl`}
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${rankInfo1.badgeBg} flex items-center justify-center font-black text-xs shadow`}
                        >
                          {rankInfo1.badge}
                        </div>
                      </div>
                      <span className="font-black text-sm text-foreground truncate w-full text-center px-1">
                        {top1.nickname}
                      </span>
                      <span className="text-xs font-mono font-black text-amber-500">
                        {top1.score} 分
                      </span>
                      <div
                        className={`w-full ${rankInfo1.heightClass} ${rankInfo1.pedestalClass} rounded-t-2xl mt-2 flex flex-col items-center justify-center shadow-md`}
                      >
                        <span className="text-xl sm:text-2xl">{rankInfo1.medal}</span>
                        <span className="text-[10px] font-black text-current">{rankInfo1.label}</span>
                      </div>
                    </div>
                  )}

                  {/* Right Column (top3) */}
                  {top3 && rankInfo3 && (
                    <div className="flex flex-col items-center flex-1 max-w-[110px] sm:max-w-[130px]">
                      <div className="relative mb-1">
                        {rankInfo3.isChampion && (
                          <Crown className="w-5 h-5 text-amber-500 fill-amber-500 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                        )}
                        <Avatar
                          src={top3.avatar}
                          alt={top3.nickname}
                          size="md"
                          className={`ring-2 ${rankInfo3.ring} shadow-md`}
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${rankInfo3.badgeBg} flex items-center justify-center font-black text-[10px] shadow`}
                        >
                          {rankInfo3.badge}
                        </div>
                      </div>
                      <span className="font-black text-xs text-foreground truncate w-full text-center px-1">
                        {top3.nickname}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">
                        {top3.score} 分
                      </span>
                      <div
                        className={`w-full ${rankInfo3.heightClass} ${rankInfo3.pedestalClass} rounded-t-2xl mt-2 flex flex-col items-center justify-center shadow-xs`}
                      >
                        <span className="text-sm sm:text-base">{rankInfo3.medal}</span>
                        <span className="text-[9px] font-bold text-current">{rankInfo3.label}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complete Scoreboard List */}
            {podiumList.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-black text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{t('settlement.scoreboardTitle', '全场积分排行榜')}</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    {t('settlement.totalPlayers', { count: podiumList.length })}
                  </span>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border/60 overflow-hidden max-h-[220px] overflow-y-auto">
                  {podiumList.map((player) => {
                    const isMe = player.playerId === currentUserId;
                    const isWinner = winners.some((w) => w.playerId === player.playerId);

                    return (
                      <div
                        key={player.playerId}
                        className={`px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                          isMe ? 'bg-primary/10 font-black' : 'hover:bg-muted/40 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 text-center font-black text-[11px] ${
                              player.rank === 1
                                ? 'text-amber-500'
                                : player.rank === 2
                                ? 'text-slate-400'
                                : player.rank === 3
                                ? 'text-amber-700'
                                : 'text-muted-foreground'
                            }`}
                          >
                            #{player.rank}
                          </span>
                          <Avatar src={player.avatar} alt={player.nickname} size="sm" />
                          <span className="truncate text-foreground">
                            {player.nickname}
                            {isMe ? ` (${t('settlement.me')})` : ''}
                          </span>
                          {isWinner && (
                            <Badge
                              variant="default"
                              className="text-[9px] px-1.5 py-0 bg-amber-500 text-amber-950 font-black shrink-0"
                            >
                              🏆 {t('settlement.winShort')}
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono font-black text-sm text-foreground shrink-0 pl-2">
                          {player.score} <span className="text-[11px] font-normal text-muted-foreground">{t('settlement.points')}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 sm:p-5 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="surface"
                size="sm"
                onClick={onClose}
                className="font-bold text-xs h-9 px-4 cursor-pointer"
              >
                <span>{t('settlement.viewRoom')}</span>
              </Button>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {isHost ? t('settlement.hostCanRestart') : t('settlement.stayInRoomWaiting')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isHost ? (
                <Button
                  size="sm"
                  onClick={onRestartGame}
                  disabled={isRestarting}
                  className="font-black text-xs h-9 px-5 gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
                  <span>{t('settlement.playAgain', '再来一局')}</span>
                </Button>
              ) : (
                <Badge variant="subtle" className="text-xs px-3 py-1 font-bold text-muted-foreground">
                  {t('settlement.waitingHostRestart', '等待房主重新开局...')}
                </Badge>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
