import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Palette,
  Users,
  Timer,
  Zap,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, Button, Badge } from '@idavoll/ui';
import { quickMatch } from '../services/api';
import { connectRoom } from '../services/room-session';

export const GameDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartMatch = async () => {
    setIsMatching(true);
    setError(null);
    try {
      const match = await quickMatch();
      const canonicalRoomId = await connectRoom(match.roomId, undefined, match.ticket);
      navigate(`/room/${canonicalRoomId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '快速匹配失败，请重试';
      setError(msg);
    } finally {
      setIsMatching(false);
    }
  };

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/games')}
        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{t('gameDetail.backToGames')}</span>
      </button>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Showcase Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Card className="p-6 sm:p-10 bg-gradient-to-br from-[var(--theme-primary,#5B5BF0)] to-slate-900 dark:to-card text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border border-white/30 font-black">
                {t('gameDetail.flagship')}
              </Badge>
              <span className="text-xs font-bold text-white/80">
                {t('gameDetail.playersBadge')}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {t('gameDetail.title')}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                t('gameDetail.tagCasual'),
                t('gameDetail.tagBoard'),
                t('gameDetail.tagDanmaku'),
                t('gameDetail.tagVocab'),
                t('gameDetail.tagCrossPlatform'),
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-white/95"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                disabled={isMatching}
                onClick={handleStartMatch}
                className="bg-white text-[var(--theme-primary,#5B5BF0)] hover:bg-white/90 font-black gap-2 shadow-xl"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('lobby.quickMatchSearching')}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>{t('gameDetail.matchNowBtn')}</span>
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
                <span>{t('gameDetail.createRoomBtn')}</span>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Rules & Gameplay Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--theme-primary,#5B5BF0)]/15 text-[var(--theme-primary,#5B5BF0)] flex items-center justify-center font-black">
            1
          </div>
          <h4 className="text-lg font-black text-foreground">{t('gameDetail.step1Title')}</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {t('gameDetail.step1Desc')}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black">
            2
          </div>
          <h4 className="text-lg font-black text-foreground">{t('gameDetail.step2Title')}</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {t('gameDetail.step2Desc')}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-black">
            3
          </div>
          <h4 className="text-lg font-black text-foreground">{t('gameDetail.step3Title')}</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {t('gameDetail.step3Desc')}
          </p>
        </Card>
      </div>

      {/* Word Banks and Difficulty Info based on real WordBank */}
      <Card className="p-6 space-y-4">
        <h4 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--theme-primary,#5B5BF0)]" />
          <span>{t('gameDetail.wordbankTitle')}</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/40 rounded-2xl space-y-1.5 border border-border/60">
            <Badge variant="mint" className="text-[10px]">
              {t('gameDetail.easyBadge')}
            </Badge>
            <h5 className="text-sm font-extrabold text-foreground">{t('gameDetail.easyTitle')}</h5>
            <p className="text-xs text-muted-foreground">
              {t('gameDetail.easyDesc')}
            </p>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl space-y-1.5 border border-border/60">
            <Badge variant="default" className="text-[10px]">
              {t('gameDetail.mediumBadge')}
            </Badge>
            <h5 className="text-sm font-extrabold text-foreground">{t('gameDetail.mediumTitle')}</h5>
            <p className="text-xs text-muted-foreground">
              {t('gameDetail.mediumDesc')}
            </p>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl space-y-1.5 border border-border/60">
            <Badge variant="subtle" className="text-[10px]">
              {t('gameDetail.hardBadge')}
            </Badge>
            <h5 className="text-sm font-extrabold text-foreground">{t('gameDetail.hardTitle')}</h5>
            <p className="text-xs text-muted-foreground">
              {t('gameDetail.hardDesc')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
