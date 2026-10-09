import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ChevronLeft, Lock, Users, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Card, Button, Input, Badge } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { createRoom } from '../services/api';
import { connectRoom } from '../services/room-session';
import { RoomSettings } from '@idavoll/protocol';

const createRoomSchema = z
  .object({
    title: z.string().trim().min(1, '房间名称至少1个字符').max(30, '房间名称最多30个字符'),
    maxPlayers: z.number().int().min(2).max(12),
    drawDuration: z.number().int().min(30).max(120),
    totalRounds: z.number().int().min(1).max(10),
    wordDifficulty: z.enum(['easy', 'medium', 'hard']),
    isPrivate: z.boolean(),
    password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isPrivate) {
        return !!data.password && data.password.trim().length >= 4 && data.password.trim().length <= 64;
      }
      return true;
    },
    {
      message: '私密房间密码须为 4-64 位字符',
      path: ['password'],
    }
  );

type CreateRoomFormValues = z.infer<typeof createRoomSchema>;

export const CreateRoomPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { nickname } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateRoomFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      title: t('createRoom.defaultRoomName', { name: nickname || t('common.player') }),
      maxPlayers: 8,
      drawDuration: 60,
      totalRounds: 3,
      wordDifficulty: 'medium',
      isPrivate: false,
      password: '',
    },
  });

  const isPrivate = watch('isPrivate');
  const selectedPlayers = watch('maxPlayers');
  const selectedDuration = watch('drawDuration');
  const selectedRounds = watch('totalRounds');
  const selectedDifficulty = watch('wordDifficulty');

  const onSubmit = async (data: CreateRoomFormValues) => {
    setLoading(true);
    setSubmitError(null);

    const payload: RoomSettings = {
      title: data.title.trim(),
      gameId: 'draw-and-guess',
      maxPlayers: data.maxPlayers,
      drawDuration: data.drawDuration,
      totalRounds: data.totalRounds,
      wordDifficulty: data.wordDifficulty,
      isPrivate: data.isPrivate,
      password: data.isPrivate && data.password ? data.password.trim() : undefined,
    };

    try {
      const res = await createRoom(payload);
      const canonicalRoomId = await connectRoom(res.roomId, payload.password);
      navigate(`/room/${canonicalRoomId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('createRoom.createFailed');
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/lobby')}
        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{t('common.backToLobby')}</span>
      </button>

      {submitError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Card className="p-6 sm:p-8 space-y-6 border-2 border-border/80 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              {t('createRoom.title')}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              {t('createRoom.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Room Name */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('createRoom.roomName')}
              </label>
              <Input
                {...register('title')}
                placeholder={t('createRoom.roomNamePlaceholder')}
                className="font-bold"
                maxLength={30}
                disabled={loading}
              />
              {errors.title && (
                <p className="text-xs font-bold text-rose-500">{errors.title.message}</p>
              )}
            </div>

            {/* Max Players */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('createRoom.maxPlayersLabel', { count: selectedPlayers })}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[4, 6, 8, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={loading}
                    onClick={() => setValue('maxPlayers', num)}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                      selectedPlayers === num
                        ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-md'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t('createRoom.playerCount', { count: num })}
                  </button>
                ))}
              </div>
            </div>

            {/* Draw Duration */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('createRoom.drawDuration')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sec: 45, label: t('createRoom.durationFast') },
                  { sec: 60, label: t('createRoom.durationStandard') },
                  { sec: 90, label: t('createRoom.durationRelaxed') },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    disabled={loading}
                    onClick={() => setValue('drawDuration', item.sec)}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                      selectedDuration === item.sec
                        ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-md'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Rounds */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('createRoom.totalRoundsLabel', { count: selectedRounds })}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 5, 8].map((round) => (
                  <button
                    key={round}
                    type="button"
                    disabled={loading}
                    onClick={() => setValue('totalRounds', round)}
                    className={`py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                      selectedRounds === round
                        ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-md'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t('createRoom.roundsCount', { count: round })}
                  </button>
                ))}
              </div>
            </div>

            {/* Word Difficulty */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('createRoom.wordDifficulty')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'easy', label: t('createRoom.diffEasy') },
                  { key: 'medium', label: t('createRoom.diffMedium') },
                  { key: 'hard', label: t('createRoom.diffHard') },
                ].map((diff) => (
                  <button
                    key={diff.key}
                    type="button"
                    disabled={loading}
                    onClick={() => setValue('wordDifficulty', diff.key as any)}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                      selectedDifficulty === diff.key
                        ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-md'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Private Room Toggle & Password */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">
                    {t('createRoom.isPrivate')}
                  </span>
                </div>
                <input
                  type="checkbox"
                  {...register('isPrivate')}
                  disabled={loading}
                  className="w-5 h-5 accent-[var(--theme-primary,#5B5BF0)] cursor-pointer"
                />
              </div>

              {isPrivate && (
                <div className="pt-2 space-y-1">
                  <Input
                    {...register('password')}
                    type="password"
                    maxLength={64}
                    placeholder={t('createRoom.passwordPlaceholder')}
                    disabled={loading}
                    className="font-mono tracking-wider text-center"
                  />
                  {errors.password && (
                    <p className="text-xs font-bold text-rose-500">{errors.password.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full text-base font-black shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('createRoom.creatingRoom')}</span>
                </>
              ) : (
                <span>{t('createRoom.submit')}</span>
              )}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
