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
        <span>返回游戏库</span>
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
        <Card className="p-6 sm:p-10 bg-gradient-to-br from-[var(--theme-primary,#5B5BF0)] to-indigo-800 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border border-white/30 font-black">
                🎨 招牌力作
              </Badge>
              <span className="text-xs font-bold text-white/80">
                支持 2-12 位玩家同屏竞技
              </span>
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
                disabled={isMatching}
                onClick={handleStartMatch}
                className="bg-white text-[var(--theme-primary,#5B5BF0)] hover:bg-white/90 font-black gap-2 shadow-xl"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>匹配房间中...</span>
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
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-black">
            1
          </div>
          <h4 className="text-lg font-black text-foreground">抽取画手 · 选词作画</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            每回合随机轮换画手，画手从精选题库选项中选定词语并在画布上作画。
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black">
            2
          </div>
          <h4 className="text-lg font-black text-foreground">实时观察 · 弹幕抢答</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            猜题者实时同步笔迹与字数提示，随时在输入框或弹幕输入答案争分夺秒抢答。
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-black">
            3
          </div>
          <h4 className="text-lg font-black text-foreground">积分结算 · 荣登榜首</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            抢答越快得分越高，画手根据被猜中人数也获奖励，多轮累计角逐全场 MVP。
          </p>
        </Card>
      </div>

      {/* Word Banks and Difficulty Info based on real WordBank */}
      <Card className="p-6 space-y-4">
        <h4 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--theme-primary,#5B5BF0)]" />
          <span>真实题库涵盖主题</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/40 rounded-2xl space-y-1.5 border border-border/60">
            <Badge variant="mint" className="text-[10px]">
              简单入门
            </Badge>
            <h5 className="text-sm font-extrabold text-foreground">水果食物 (Fruits & Food)</h5>
            <p className="text-xs text-muted-foreground">
              包含西瓜、苹果、香蕉、草莓、冰淇淋、汉堡包、珍珠奶茶等贴近生活的常见美味。
            </p>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl space-y-1.5 border border-border/60">
            <Badge variant="default" className="text-[10px]">
              标准进阶
            </Badge>
            <h5 className="text-sm font-extrabold text-foreground">可爱动物 (Animals)</h5>
            <p className="text-xs text-muted-foreground">
              包含小猫、大熊猫、企鹅、长颈鹿、袋鼠、海豚、霸王龙等形态各异的自然生灵。
            </p>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl space-y-1.5 border border-border/60">
            <Badge variant="subtle" className="text-[10px]">
              趣味挑战
            </Badge>
            <h5 className="text-sm font-extrabold text-foreground">生活日常与科技 (Daily Items)</h5>
            <p className="text-xs text-muted-foreground">
              包含雨伞、眼镜、吉他、自行车、智能手表、无人机、火箭等现代日用品与科技事物。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
