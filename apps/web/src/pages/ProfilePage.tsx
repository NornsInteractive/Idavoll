import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Sun,
  Moon,
  Edit2,
  Check,
  LogOut,
  Image as ImageIcon,
  History,
  Trophy,
  Loader2,
  X,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, Button, Badge, Avatar, Input, DrawBoard } from '@idavoll/ui';
import { AccentPresets } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import {
  fetchProfile,
  saveProfile,
  fetchMatches,
  fetchDrawings,
  fetchDrawing,
} from '../services/api';
import { leaveRoom } from '../services/room-session';
import { DrawStroke } from '@idavoll/protocol';

const AVATAR_SEEDS = [
  'LuckyFox',
  'StarCat',
  'CosmicBear',
  'SunnyRabbit',
  'CyberPanda',
  'MintDragon',
];

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    id: userId,
    nickname,
    avatar,
    isDark,
    toggleTheme,
    accentColor,
    setAccentColor,
    language,
    setLanguage,
    setUser,
    logout,
  } = useUserStore();

  const [isEditingNick, setIsEditingNick] = useState(false);
  const [newNick, setNewNick] = useState(nickname);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Drawing preview modal
  const [previewDrawing, setPreviewDrawing] = useState<{
    word: string;
    strokes: DrawStroke[];
    width: number;
    height: number;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [failedDrawingId, setFailedDrawingId] = useState<string | null>(null);

  // Queries for real profile stats, matches, and drawings scoped by userId
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: fetchProfile,
    enabled: !!userId,
  });

  const {
    data: matchesData,
    isLoading: isMatchesLoading,
    isError: isMatchesError,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ['matches', userId],
    queryFn: fetchMatches,
    enabled: !!userId,
  });

  const {
    data: drawingsData,
    isLoading: isDrawingsLoading,
    isError: isDrawingsError,
    refetch: refetchDrawings,
  } = useQuery({
    queryKey: ['drawings', userId],
    queryFn: fetchDrawings,
    enabled: !!userId,
  });

  const stats = profileData?.stats;
  const matches = matchesData?.matches || [];
  const drawings = drawingsData?.drawings || [];

  const handleSaveProfile = async () => {
    if (!newNick.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await saveProfile(newNick.trim(), selectedAvatar);
      setUser({ id: userId, nickname: res.user.nickname, avatar: res.user.avatar });
      setIsEditingNick(false);
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('profile.saveError', '保存个人资料失败，请重试');
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectLang = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    queryClient.clear();
    leaveRoom();
    logout();
    navigate('/login');
  };

  const handleOpenDrawing = async (drawingId: string) => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    setFailedDrawingId(null);
    try {
      const data = await fetchDrawing(drawingId);
      setPreviewDrawing(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('profile.drawingError', '加载画作失败，请重试');
      setPreviewError(msg);
      setFailedDrawingId(drawingId);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Save Error Alert */}
      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="surface" onClick={handleSaveProfile} className="h-7 text-xs font-bold cursor-pointer">
              {t('profile.retry', '重试')}
            </Button>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="p-1 hover:bg-rose-500/20 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* User Info Card */}
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 border-2 border-border/80">
        <div className="relative group">
          <Avatar src={selectedAvatar} alt={nickname} size="xl" className="ring-4 ring-[var(--theme-primary,#5B5BF0)]/20" />
        </div>

        <div className="space-y-3 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {isEditingNick ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newNick}
                  onChange={(e) => setNewNick(e.target.value)}
                  className="h-9 w-40 text-sm font-bold"
                  maxLength={24}
                  disabled={isSaving}
                />
                <Button
                  size="icon"
                  onClick={handleSaveProfile}
                  disabled={isSaving || !newNick.trim()}
                  className="h-9 w-9 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-foreground">{nickname}</h2>
                <button
                  type="button"
                  onClick={() => setIsEditingNick(true)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  title={t('profile.editNick')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground font-mono">ID: {userId}</p>

          {/* Quick Avatar Change Swatches */}
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <span className="text-xs font-bold text-muted-foreground mr-1">{t('profile.changeAvatar')}</span>
            {AVATAR_SEEDS.map((seed) => {
              const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
              const isCur = selectedAvatar === url;
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={async () => {
                    setSelectedAvatar(url);
                    setSaveError(null);
                    try {
                      const res = await saveProfile(nickname, url);
                      setUser({ id: userId, nickname: res.user.nickname, avatar: res.user.avatar });
                      refetchProfile();
                      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : t('profile.saveError', '保存个人资料失败，请重试');
                      setSaveError(msg);
                    }
                  }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer overflow-hidden ${
                    isCur ? 'ring-2 ring-primary scale-110 shadow-sm' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={seed} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('profile.logout')}</span>
        </Button>
      </Card>

      {/* Cumulative Stats Row (Only real stats, empty state if 0) */}
      <div className="space-y-3">
        <h3 className="text-lg font-black text-foreground">{t('profile.cumulativeStats')}</h3>
        {isProfileLoading ? (
          <Card className="p-8 text-center space-y-2 border-2 border-border/80">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">{t('profile.loadingStats')}</p>
          </Card>
        ) : isProfileError ? (
          <Card className="p-8 text-center space-y-3 border-2 border-rose-500/30 bg-rose-500/5">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h4 className="text-sm font-bold text-foreground">{t('profile.statsLoadFailed')}</h4>
            <Button
              size="sm"
              variant="surface"
              onClick={() => refetchProfile()}
              className="gap-1 text-xs font-bold mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('profile.retry', '重试')}</span>
            </Button>
          </Card>
        ) : !stats || stats.totalGames === 0 ? (
          <Card className="p-8 text-center space-y-2 border-2 border-dashed border-border/80">
            <Trophy className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <h4 className="text-sm font-bold text-foreground">{t('profile.noStats')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('profile.noStatsDesc')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-5 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground">{t('profile.statsTotal')}</span>
              <h4 className="text-2xl font-black font-mono text-[var(--theme-primary,#5B5BF0)]">
                {stats.totalGames} 局
              </h4>
              <span className="text-[11px] text-muted-foreground">{t('profile.winsCount', { count: stats.wins })}</span>
            </Card>

            <Card className="p-5 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground">{t('profile.statsWins')}</span>
              <h4 className="text-2xl font-black font-mono text-emerald-500">
                {Number(stats.winRate ?? 0).toFixed(1)}%
              </h4>
              <span className="text-[11px] text-muted-foreground">{t('profile.winRateLabel')}</span>
            </Card>

            <Card className="p-5 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground">{t('profile.accuracy', '猜题命中率')}</span>
              <h4 className="text-2xl font-black font-mono text-amber-500">
                {Number(stats.accuracy ?? 0).toFixed(1)}%
              </h4>
              <span className="text-[11px] text-muted-foreground">
                {t('profile.guessesRatio', { correct: stats.correctGuesses, total: stats.guesses })}
              </span>
            </Card>

            <Card className="p-5 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground">{t('profile.statsDrawings')}</span>
              <h4 className="text-2xl font-black font-mono text-[var(--theme-primary,#5B5BF0)]">
                {stats.drawings} 幅
              </h4>
              <span className="text-[11px] text-muted-foreground">{t('profile.drawingsLabel')}</span>
            </Card>
          </div>
        )}
      </div>

      {/* Drawings Showcase */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black text-foreground">
              {t('profile.savedDrawings')} ({drawings.length})
            </h3>
          </div>
          {isPreviewLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>{t('profile.loadingDrawing')}</span>
            </div>
          )}
        </div>

        {previewError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{previewError}</span>
            </div>
            {failedDrawingId && (
              <Button
                size="sm"
                variant="surface"
                onClick={() => handleOpenDrawing(failedDrawingId)}
                className="h-7 text-xs font-bold gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('profile.retry', '重试')}</span>
              </Button>
            )}
          </div>
        )}

        {isDrawingsLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>{t('profile.loadingDrawings')}</span>
          </div>
        ) : isDrawingsError ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('profile.drawingsLoadFailed')}</span>
            </div>
            <Button
              size="sm"
              variant="surface"
              onClick={() => refetchDrawings()}
              className="h-7 text-xs font-bold gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('profile.retry', '重试')}</span>
            </Button>
          </div>
        ) : drawings.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-medium">
            {t('profile.noDrawings')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {drawings.map((draw) => (
              <div
                key={draw.id}
                onClick={() => handleOpenDrawing(draw.id)}
                className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border flex flex-col justify-between space-y-2 cursor-pointer transition-colors group"
              >
                <div>
                  <h5 className="font-black text-sm text-foreground truncate group-hover:text-primary">
                    【{draw.word}】
                  </h5>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(draw.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[11px] font-bold text-primary">{t('profile.viewPlayback')}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Matches */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black text-foreground">{t('profile.recentMatches')} ({matches.length})</h3>
          </div>
        </div>

        {isMatchesLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>{t('profile.loadingMatches')}</span>
          </div>
        ) : isMatchesError ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('profile.matchesLoadFailed')}</span>
            </div>
            <Button
              size="sm"
              variant="surface"
              onClick={() => refetchMatches()}
              className="h-7 text-xs font-bold gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('profile.retry', '重试')}</span>
            </Button>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-medium">
            {t('profile.noMatches')}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {matches.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-foreground">
                      {t('profile.winnerLabel', { name: m.winner_nickname })}
                    </span>
                    <Badge variant="subtle" className="text-[10px]">
                      {t('profile.roundsCount', { count: m.total_rounds })}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(m.played_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {m.scores.map((sc) => (
                    <div
                      key={sc.playerId}
                      className="flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-lg"
                      title={sc.nickname}
                    >
                      <Avatar src={sc.avatar} alt={sc.nickname} size="sm" />
                      <span className="font-mono font-bold text-[11px]">{t('profile.pointsCount', { count: sc.score })}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Visual Settings: Dark Mode & Accent Colors & Language */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Palette className="w-5 h-5 text-[var(--theme-primary,#5B5BF0)]" />
          <h3 className="text-lg font-black text-foreground">{t('profile.themeSetting')}</h3>
        </div>

        {/* Theme mode toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-extrabold text-foreground">{t('profile.appearanceMode', '外观明暗模式')}</h5>
            <p className="text-xs text-muted-foreground">{t('profile.appearanceDesc', '根据环境光线自由切换亮色与暗色模式')}</p>
          </div>

          <Button
            size="sm"
            variant="surface"
            onClick={toggleTheme}
            className="gap-2 font-bold px-4 h-10 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[var(--theme-primary,#5B5BF0)]" />}
            <span>{isDark ? t('profile.darkMode') : t('profile.lightMode')}</span>
          </Button>
        </div>

        {/* Accent Color Palette Switcher */}
        <div className="space-y-3">
          <div>
            <h5 className="text-sm font-extrabold text-foreground">{t('profile.colorPresets')}</h5>
            <p className="text-xs text-muted-foreground">{t('profile.accentDesc', '定制全站主交互色，保存在当前浏览器并实时生效')}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {AccentPresets.map((preset) => {
              const isSelected = accentColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAccentColor(preset.hex)}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--theme-primary,#5B5BF0)] bg-muted/60 shadow-sm scale-105'
                      : 'border-border/80 hover:bg-muted/40'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full shadow-sm"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="text-xs font-bold text-foreground truncate">
                    {preset.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <h5 className="text-sm font-extrabold text-foreground">{t('profile.language')}</h5>
            <p className="text-xs text-muted-foreground">{t('profile.languageDesc', '选择界面显示语言，保存在当前浏览器')}</p>
          </div>

          <div className="flex items-center gap-2">
            {[
              { code: 'zh-CN', label: '简体中文' },
              { code: 'en', label: 'English' },
            ].map((l) => (
              <Button
                key={l.code}
                size="sm"
                variant={language === l.code ? 'default' : 'surface'}
                onClick={() => handleSelectLang(l.code)}
                className="h-9 px-4 text-xs font-bold cursor-pointer"
              >
                {l.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Drawing Preview Modal */}
      <AnimatePresence>
        {previewDrawing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-2xl bg-surface rounded-3xl border-2 border-border shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-black text-foreground">
                    {t('profile.playbackTitle', { word: previewDrawing.word })}
                  </h4>
                  <p className="text-xs text-muted-foreground">{t('profile.playbackSubtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDrawing(null)}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                <DrawBoard
                  strokes={previewDrawing.strokes}
                  width={800}
                  height={600}
                  isDrawer={false}
                  className="w-full h-full aspect-[4/3] border-0"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setPreviewDrawing(null)}
                  className="font-bold px-6 cursor-pointer"
                >
                  {t('profile.close')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
