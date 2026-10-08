import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Crown, RotateCcw, Home, AlertTriangle, Users } from 'lucide-react';
import { Card, Button, Badge, Avatar } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';
import { leaveRoom } from '../services/room-session';

export const GameResultPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: userId } = useUserStore();
  const { room, restartGame } = useRoomStore();
  const { gameState } = useGameStore();

  const isAborted = gameState?.aborted ?? false;
  const podium = gameState?.gamePodium || [];
  const scores = gameState?.scores || [];
  const isHost = room?.hostId === userId;

  // Invalidate personal queries on match conclusion so user stats are updated
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['drawings'] });
  }, [queryClient]);

  useEffect(() => {
    // Only fire celebratory confetti if game concluded normally with winners
    if (!isAborted && podium.length > 0) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
      });
    }
  }, [isAborted, podium.length]);

  const handlePlayAgain = () => {
    if (isHost) {
      restartGame();
    } else if (room) {
      navigate(`/room/${room.roomId}`);
    }
  };

  const handleBackToLobby = () => {
    leaveRoom();
    navigate('/lobby');
  };

  const firstPlace = podium.find((p) => p.rank === 1);
  const secondPlace = podium.find((p) => p.rank === 2);
  const thirdPlace = podium.find((p) => p.rank === 3);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Aborted Banner (if game aborted due to lack of players) */}
      {isAborted ? (
        <Card className="p-8 text-center space-y-4 border-2 border-amber-500/30 bg-amber-500/5">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-foreground">{t('settlement.abortedTitle')}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('settlement.abortedDesc')}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Title & Celebration */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="inline-flex p-3 rounded-3xl bg-amber-500/15 text-amber-500 mb-2 shadow-sm"
            >
              <Trophy className="w-10 h-10" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground">
              {t('settlement.winnerTitle')}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground">
              本场比赛已圆满结束，感谢各位玩家的精彩画作与敏捷抢答！
            </p>
          </div>

          {/* The Podium (Top 3 from real server data) */}
          {podium.length > 0 && (
            <div className="pt-8 pb-4 flex items-end justify-center gap-3 sm:gap-6">
              {/* 2nd Place */}
              {secondPlace && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="flex flex-col items-center flex-1 max-w-[160px]"
                >
                  <div className="relative mb-2">
                    <Avatar src={secondPlace.avatar} alt={secondPlace.nickname} size="lg" />
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center font-black text-xs shadow">
                      2
                    </div>
                  </div>
                  <h6 className="font-extrabold text-xs text-foreground truncate max-w-[120px] text-center">
                    {secondPlace.nickname}
                  </h6>
                  <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {secondPlace.score} 分
                  </span>
                  <div className="w-full h-28 bg-slate-200 dark:bg-slate-800 rounded-t-3xl mt-3 flex items-center justify-center font-black text-2xl text-slate-400">
                    🥈
                  </div>
                </motion.div>
              )}

              {/* 1st Place (Champion) */}
              {firstPlace && (
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="flex flex-col items-center flex-1 max-w-[190px]"
                >
                  <div className="relative mb-2">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce">
                      <Crown className="w-8 h-8 fill-current" />
                    </div>
                    <Avatar
                      src={firstPlace.avatar}
                      alt={firstPlace.nickname}
                      size="xl"
                      className="ring-4 ring-amber-400 shadow-xl"
                    />
                    <div className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shadow">
                      1
                    </div>
                  </div>
                  <h5 className="font-black text-sm text-foreground truncate max-w-[140px] text-center">
                    {firstPlace.nickname}
                  </h5>
                  <span className="text-sm font-mono font-black text-amber-600 dark:text-amber-400">
                    {firstPlace.score} 分
                  </span>
                  <div className="w-full h-36 bg-gradient-to-t from-amber-500/30 to-amber-400/40 border-2 border-amber-400 rounded-t-3xl mt-3 flex flex-col items-center justify-center font-black text-3xl shadow-xl">
                    🥇
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 mt-1">
                      MVP 冠军
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {thirdPlace && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="flex flex-col items-center flex-1 max-w-[160px]"
                >
                  <div className="relative mb-2">
                    <Avatar src={thirdPlace.avatar} alt={thirdPlace.nickname} size="lg" />
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-black text-xs shadow">
                      3
                    </div>
                  </div>
                  <h6 className="font-extrabold text-xs text-foreground truncate max-w-[120px] text-center">
                    {thirdPlace.nickname}
                  </h6>
                  <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {thirdPlace.score} 分
                  </span>
                  <div className="w-full h-20 bg-amber-900/20 dark:bg-amber-950/40 rounded-t-3xl mt-3 flex items-center justify-center font-black text-2xl text-amber-700">
                    🥉
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Full Scoreboard */}
          {scores.length > 0 && (
            <Card className="p-6 space-y-4">
              <h4 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span>{t('settlement.scoreboardTitle')}</span>
              </h4>

              <div className="divide-y divide-border/60">
                {scores
                  .sort((a, b) => b.score - a.score)
                  .map((player, idx) => (
                    <div
                      key={player.playerId}
                      className="py-3 flex items-center justify-between text-xs font-bold"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-black text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <Avatar src={player.avatar} alt={player.nickname} size="sm" />
                        <span className="text-foreground">
                          {player.nickname}
                          {player.playerId === userId ? ' (我)' : ''}
                        </span>
                      </div>
                      <span className="font-mono font-black text-primary text-sm">
                        {player.score} 分
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        {isHost ? (
          <Button
            size="lg"
            onClick={handlePlayAgain}
            className="font-black px-8 gap-2 shadow-xl cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{t('settlement.playAgain')}</span>
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handlePlayAgain}
            variant="surface"
            className="font-black px-8 gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{t('settlement.playAgain')}</span>
          </Button>
        )}

        <Button
          size="lg"
          variant="surface"
          onClick={handleBackToLobby}
          className="font-black px-8 gap-2 cursor-pointer"
        >
          <Home className="w-5 h-5" />
          <span>{t('settlement.backToLobby')}</span>
        </Button>
      </div>
    </div>
  );
};
