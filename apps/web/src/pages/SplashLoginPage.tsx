import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Gamepad2, Dices, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Input, Card, Avatar } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { guestLogin } from '../services/api';

import { generateRandomNickname } from '../lib/random-nickname';

const AVATAR_SEEDS = [
  'LuckyFox',
  'StarCat',
  'CosmicBear',
  'SunnyRabbit',
  'CyberPanda',
  'MintDragon',
];

export const SplashLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token, id, nickname: currentNick, avatar: currentAvatar, setUser } = useUserStore();

  const [nickname, setNickname] = useState(() => currentNick || generateRandomNickname());
  const [selectedSeed, setSelectedSeed] = useState(AVATAR_SEEDS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to target or lobby
  useEffect(() => {
    if (token && id) {
      const from = (location.state as any)?.from?.pathname || '/lobby';
      navigate(from, { replace: true });
    }
  }, [token, id, location, navigate]);

  const handleRandomize = () => {
    const randomNick = generateRandomNickname(nickname);
    const randomSeed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
    setNickname(randomNick);
    setSelectedSeed(randomSeed);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError(t('login.nicknamePlaceholder', '请输入玩家昵称'));
      return;
    }

    setLoading(true);
    setError(null);

    const finalAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedSeed}`;

    try {
      const res = await guestLogin(nickname.trim(), finalAvatar);
      setUser({
        id: res.user.id,
        nickname: res.user.nickname,
        avatar: res.user.avatar,
        token: res.token,
      });
      // Invalidate existing caches so new user stats are fresh
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['drawings'] });

      const from = (location.state as any)?.from?.pathname || '/lobby';
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请稍后重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background via-accent/30 to-background min-h-[90dvh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 sm:p-8 border-2 border-border/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Decorative Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-[var(--theme-primary,#5B5BF0)]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#FF6B5E]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Headline */}
          <div className="text-center space-y-2 mb-8">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-20 h-20 mx-auto rounded-3xl bg-[var(--theme-primary,#5B5BF0)] text-white flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <Gamepad2 className="w-11 h-11" />
            </motion.div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">PlayHub</h1>
            <p className="text-sm font-semibold text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Avatar Selection Carousel */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 text-center">
                {t('login.selectAvatar')}
              </label>
              <div className="flex items-center justify-center gap-3">
                {AVATAR_SEEDS.map((seed) => {
                  const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                  const isSelected = selectedSeed === seed;
                  return (
                    <motion.button
                      key={seed}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedSeed(seed)}
                      className={`relative rounded-full p-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-4 ring-[var(--theme-primary,#5B5BF0)] scale-110 shadow-md'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <Avatar src={url} alt={seed} size="md" />
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Nickname Input & Randomize Dice */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground">{t('login.nickname', '玩家昵称')}</span>
                <button
                  type="button"
                  onClick={handleRandomize}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs font-bold text-[var(--theme-primary,#5B5BF0)] hover:underline cursor-pointer disabled:opacity-50"
                >
                  <Dices className="w-3.5 h-3.5" />
                  {t('login.randomize', '随机换一个')}
                </button>
              </div>

              <Input
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError(null);
                }}
                placeholder={t('login.nicknamePlaceholder')}
                required
                maxLength={24}
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full text-base gap-2 font-black shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('login.loggingIn', '正在登录...')}</span>
                </>
              ) : (
                <>
                  <span>{t('login.enterLobby')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{t('login.features', '免密即玩 · 跨平台多端同步 · 即开即连')}</span>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
