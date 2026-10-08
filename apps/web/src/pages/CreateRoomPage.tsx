import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ChevronLeft, PlusCircle, Lock, Users, Clock, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, Button, Input, Badge } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';

const createRoomSchema = z.object({
  title: z.string().min(2, '房间名称至少2个字符').max(20, '房间名称最多20个字符'),
  maxPlayers: z.number().min(2).max(12),
  drawDuration: z.number().min(30).max(120),
  totalRounds: z.number().min(1).max(5),
  wordDifficulty: z.enum(['easy', 'medium', 'hard']),
  isPrivate: z.boolean(),
  password: z.string().optional(),
});

type CreateRoomFormValues = z.infer<typeof createRoomSchema>;

export const CreateRoomPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: userId, nickname, avatar } = useUserStore();
  const { setRoom, initDemoRoom } = useRoomStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateRoomFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      title: `${nickname} 的开心涂鸦局`,
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
  const selectedDifficulty = watch('wordDifficulty');

  const onSubmit = (data: CreateRoomFormValues) => {
    initDemoRoom(userId, nickname, avatar);
    navigate('/room/room_idavoll_demo');
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
        <span>返回大厅</span>
      </button>

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
              自定义你的派对规则，随后即可邀请好友直接通过房间号加入！
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
              />
              {errors.title && (
                <p className="text-xs font-bold text-rose-500">{errors.title.message}</p>
              )}
            </div>

            {/* Max Players */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  最大容纳玩家数: {selectedPlayers} 人
                </label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[4, 6, 8, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setValue('maxPlayers', num)}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                      selectedPlayers === num
                        ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-md'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {num} 人
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
                  { sec: 45, label: '45秒 (紧张)' },
                  { sec: 60, label: '60秒 (推荐)' },
                  { sec: 90, label: '90秒 (充裕)' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
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

            {/* Private Room Toggle */}
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
                  className="w-5 h-5 accent-[var(--theme-primary,#5B5BF0)] cursor-pointer"
                />
              </div>

              {isPrivate && (
                <div className="pt-2">
                  <Input
                    {...register('password')}
                    type="password"
                    maxLength={4}
                    placeholder={t('createRoom.passwordPlaceholder')}
                    className="font-mono tracking-widest text-center"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" size="lg" className="w-full text-base font-black shadow-xl">
              <span>{t('createRoom.submit')}</span>
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
