import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Crown, Sparkles, RotateCcw, Home, Star, Award, Medal } from 'lucide-react';
import { Card, Button, Badge, Avatar } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useGameStore } from '../store/useGameStore';

export const GameResultPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: userId, nickname, avatar } = useUserStore();
  const { gameState } = useGameStore();

  useEffect(() => {
    // Fire celebratory confetti!
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });
  }, []);

  const podium = gameState?.gamePodium || [
    {
      rank: 1,
      playerId: userId,
      nickname: `${nickname} (你)`,
      avatar,
      score: 360,
      isMvp: true,
    },
    {
      rank: 2,
      playerId: 'usr_bot_1',
      nickname: '画画小能手',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Painter',
      score: 290,
      isMvp: false,
    },
    {
      rank: 3,
      playerId: 'usr_bot_2',
      nickname: '猜词神算子',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Oracle',
      score: 210,
      isMvp: false,
    },
  ];

  const firstPlace = podium.find((p) => p.rank === 1) || podium[0];
  const secondPlace = podium.find((p) => p.rank === 2) || podium[1];
  const thirdPlace = podium.find((p) => p.rank === 3) || podium[2];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
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
          本场比赛已圆满结束，感谢所有玩家的精彩画作与默契抢答！
        </p>
      </div>

      {/* The Podium (Top 3) */}
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

      {/* Awards & Breakdown Card */}
      <Card className="p-6 space-y-4">
        <h4 className="font-extrabold text-base text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-[var(--theme-primary,#5B5BF0)]" />
          <span>全场荣誉称号</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-muted/40 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h6 className="text-xs font-bold text-foreground">神速抢答王</h6>
              <p className="text-[11px] text-muted-foreground">{firstPlace.nickname} (平均用时 4.2s)</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h6 className="text-xs font-bold text-foreground">灵魂神笔奖</h6>
              <p className="text-[11px] text-muted-foreground">画画小能手 (被猜中率 100%)</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h6 className="text-xs font-bold text-foreground">气氛活跃达人</h6>
              <p className="text-[11px] text-muted-foreground">猜词神算子 (发送弹幕 18 条)</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <Button
          size="lg"
          onClick={() => navigate('/room/room_idavoll_demo')}
          className="font-black px-8 gap-2 shadow-xl"
        >
          <RotateCcw className="w-5 h-5" />
          <span>{t('settlement.playAgain')}</span>
        </Button>

        <Button
          size="lg"
          variant="surface"
          onClick={() => navigate('/lobby')}
          className="font-black px-8 gap-2"
        >
          <Home className="w-5 h-5" />
          <span>{t('settlement.backToLobby')}</span>
        </Button>
      </div>
    </div>
  );
};
