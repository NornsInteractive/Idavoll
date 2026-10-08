import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Palette,
  Star,
  Users,
  Timer,
  Zap,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { Card, Button, Badge } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';

export const GameDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: userId, nickname, avatar } = useUserStore();
  const { initDemoRoom } = useRoomStore();

  const handleStartMatch = () => {
    initDemoRoom(userId, nickname, avatar);
    navigate('/room/room_idavoll_demo');
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
        <span>返回游戏库</span>
      </button>

      {/* Hero Showcase Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Card className="p-6 sm:p-10 bg-gradient-to-br from-[var(--theme-primary,#5B5BF0)] to-indigo-800 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border border-white/30 font-black">
                🎨 招牌力作
              </Badge>
              <div className="flex items-center gap-1 text-xs font-extrabold text-amber-300">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{t('gameDetail.rating')}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {t('gameDetail.title')}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {['休闲派对', '实时画板', '弹幕抢答', '词库丰富', '多端互通'].map((tag) => (
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
                onClick={handleStartMatch}
                className="bg-white text-[var(--theme-primary,#5B5BF0)] hover:bg-white/90 font-black gap-2 shadow-xl"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>{t('gameDetail.matchNowBtn')}</span>
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
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-black">
            1
          </div>
          <h4 className="text-lg font-black text-foreground">抽取画手 · 选词作画</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {t('gameDetail.rule1')}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black">
            2
          </div>
          <h4 className="text-lg font-black text-foreground">实时观察 · 弹幕抢答</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {t('gameDetail.rule2')}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-black">
            3
          </div>
          <h4 className="text-lg font-black text-foreground">极速登顶 · 荣誉加冕</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {t('gameDetail.rule3')}
          </p>
        </Card>
      </div>

      {/* Word Banks and Difficulty Info */}
      <Card className="p-6 space-y-4">
        <h4 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--theme-primary,#5B5BF0)]" />
          <span>词库涵盖领域</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: '日常生鲜与果蔬', count: '150+ 词条', tag: '简单日常' },
            { name: '萌宠与自然生灵', count: '120+ 词条', tag: '趣味进阶' },
            { name: '科技数码与生活品', count: '200+ 词条', tag: '老少咸宜' },
            { name: '奇思妙想脑洞成语', count: '80+ 词条', tag: '高手对决' },
          ].map((item) => (
            <div key={item.name} className="p-3 bg-muted/50 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-[var(--theme-primary,#5B5BF0)]">
                {item.tag}
              </span>
              <h5 className="text-sm font-extrabold text-foreground">{item.name}</h5>
              <p className="text-xs text-muted-foreground">{item.count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
