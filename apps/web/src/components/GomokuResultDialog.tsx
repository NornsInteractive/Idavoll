import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  RotateCcw,
  Handshake,
  X,
  Sparkles,
  Award,
  Loader2,
  Check,
} from 'lucide-react';
import { Button, Badge, Avatar } from '@idavoll/ui';
import { GomokuState, GomokuResultReason } from '@idavoll/protocol';

export interface GomokuResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GomokuState | null;
  currentUserId: string;
  isHost: boolean;
  onRestartGame?: () => void;
  isRestarting?: boolean;
}

export const GomokuResultDialog: React.FC<GomokuResultDialogProps> = ({
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

  // Invalidate match stats when settlement is shown
  useEffect(() => {
    if (isOpen) {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    }
  }, [isOpen, queryClient]);

  const isDraw = Boolean(
    gameState?.status === 'game_over' && gameState.matchWinnerId === null
  );
  const isMeWinner = Boolean(
    !isDraw && gameState?.matchWinnerId && gameState.matchWinnerId === currentUserId
  );

  // Trigger celebration confetti if player won (reusing standard confetti without hardcoded colors)
  useEffect(() => {
    if (isOpen && isMeWinner) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback if canvas-confetti unsupported
      }
    }
  }, [isOpen, isMeWinner]);

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

  // Keyboard accessibility: Escape to dismiss, Tab trapping
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

  // Resolve player entities
  const blackPlayerId = gameState?.playerIds?.black;
  const whitePlayerId = gameState?.playerIds?.white;

  const blackScoreItem = useMemo(
    () => gameState?.scores?.find((s) => s.playerId === blackPlayerId),
    [gameState?.scores, blackPlayerId]
  );
  const whiteScoreItem = useMemo(
    () => gameState?.scores?.find((s) => s.playerId === whitePlayerId),
    [gameState?.scores, whitePlayerId]
  );

  const winnerPlayer = useMemo(() => {
    if (isDraw || !gameState?.matchWinnerId) return null;
    return gameState.scores?.find((s) => s.playerId === gameState.matchWinnerId);
  }, [isDraw, gameState?.matchWinnerId, gameState?.scores]);

  const formatReason = (reason: GomokuResultReason | null | undefined) => {
    if (!reason) return '';
    return t(`gomoku.reasons.${reason}`, { defaultValue: reason });
  };

  if (!isOpen || !gameState) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gomoku-settlement-title"
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-card w-full max-w-lg rounded-3xl border border-border p-5 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar relative focus:outline-none"
        >
          {/* Top Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label={t('common.close', '关闭')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Title & Trophy */}
          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--theme-primary,#5B5BF0)]/10 text-[var(--theme-primary,#5B5BF0)] mb-1 shadow-inner">
              {isDraw ? (
                <Handshake className="w-8 h-8 text-amber-500" />
              ) : (
                <Trophy className="w-8 h-8 text-[var(--theme-primary,#5B5BF0)]" />
              )}
            </div>

            <h2
              id="gomoku-settlement-title"
              className="text-2xl sm:text-3xl font-black text-foreground tracking-tight"
            >
              {isDraw
                ? t('gomoku.settlement.draw', '势均力敌 · 和局 🤝')
                : isMeWinner
                ? t('gomoku.settlement.victory', '恭喜获胜！🎉')
                : t('gomoku.settlement.defeat', '惜败！💪')}
            </h2>

            {winnerPlayer && (
              <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                {t('gomoku.settlement.winnerIs', {
                  name: winnerPlayer.nickname,
                  defaultValue: `获胜者: ${winnerPlayer.nickname}`,
                })}
                {gameState.resultReason && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                    {formatReason(gameState.resultReason)}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Versus Big Score Display */}
          <div className="grid grid-cols-5 items-center gap-2 bg-muted/40 rounded-2xl p-4 border border-border/80">
            {/* Black Player */}
            <div className="col-span-2 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div className="relative">
                <Avatar
                  src={blackScoreItem?.avatar}
                  alt={blackScoreItem?.nickname || t('gomoku.blackShort')}
                  size="lg"
                  className="w-12 h-12 rounded-full border-2 border-neutral-800"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 border border-neutral-700 text-[10px] flex items-center justify-center">
                  ⚫
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground truncate max-w-full">
                {blackScoreItem?.nickname || t('gomoku.blackShort')}
              </h4>
              <Badge variant="subtle" className="text-[10px] px-2 py-0.5">
                {t('gomoku.blackStone', '黑子·先手')}
              </Badge>
            </div>

            {/* Score Center */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 font-mono font-black text-2xl sm:text-3xl text-foreground">
                <span className={blackScoreItem && whiteScoreItem && blackScoreItem.score > whiteScoreItem.score ? 'text-primary' : ''}>
                  {blackScoreItem?.score ?? 0}
                </span>
                <span className="text-muted-foreground text-lg">:</span>
                <span className={blackScoreItem && whiteScoreItem && whiteScoreItem.score > blackScoreItem.score ? 'text-primary' : ''}>
                  {whiteScoreItem?.score ?? 0}
                </span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground mt-1">
                {t('createRoom.gomokuRoundsLabel', {
                  count: gameState.totalRounds,
                  defaultValue: `共 ${gameState.totalRounds} 局`,
                })}
              </span>
            </div>

            {/* White Player */}
            <div className="col-span-2 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div className="relative">
                <Avatar
                  src={whiteScoreItem?.avatar}
                  alt={whiteScoreItem?.nickname || t('gomoku.whiteShort')}
                  size="lg"
                  className="w-12 h-12 rounded-full border-2 border-neutral-300"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-neutral-300 text-[10px] flex items-center justify-center">
                  ⚪
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground truncate max-w-full">
                {whiteScoreItem?.nickname || t('gomoku.whiteShort')}
              </h4>
              <Badge variant="subtle" className="text-[10px] px-2 py-0.5">
                {t('gomoku.whiteStone', '白子·后手')}
              </Badge>
            </div>
          </div>

          {/* Rounds Summary Breakdown */}
          {gameState.roundResults && gameState.roundResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>{t('gomoku.settlement.roundsSummary', '各局赛况明细')}</span>
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {gameState.roundResults.map((r) => {
                  const roundWinnerScore = gameState.scores?.find((s) => s.playerId === r.winnerId);
                  const isRoundDraw = r.winner === 'draw';
                  return (
                    <div
                      key={r.round}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold text-foreground"
                    >
                      <span className="text-muted-foreground font-mono">
                        {t('gomoku.roundBadgeNormal', { current: r.round, defaultValue: `第 ${r.round} 局` })}
                      </span>
                      <div className="flex items-center gap-2">
                        {isRoundDraw ? (
                          <span className="text-amber-500 font-bold">{t('profile.drawLabel', '平局')}</span>
                        ) : (
                          <span className="font-bold text-primary flex items-center gap-1">
                            <span>{r.winner === 'black' ? '⚫' : '⚪'}</span>
                            <span>{roundWinnerScore?.nickname || (r.winner === 'black' ? t('gomoku.blackShort') : t('gomoku.whiteShort'))}</span>
                            <span>{t('settlement.winShort', '胜')}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          ({formatReason(r.reason)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto font-bold cursor-pointer"
            >
              {t('common.close', '关闭')}
            </Button>

            {isHost ? (
              <Button
                onClick={onRestartGame}
                disabled={isRestarting}
                className="w-full sm:w-auto font-black bg-[var(--theme-primary,#5B5BF0)] text-white hover:opacity-90 gap-1.5 cursor-pointer shadow-md"
              >
                {isRestarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('roomWaiting.waitingHostStart', '正在开启...')}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('gomoku.settlement.playAgain', '再来一局')}</span>
                  </>
                )}
              </Button>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground text-center sm:text-left">
                {t('gomoku.settlement.waitingHost', '等待房主开启新对局...')}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
