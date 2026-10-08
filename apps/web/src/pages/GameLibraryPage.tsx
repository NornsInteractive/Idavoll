import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, Palette, Sparkles, Users, Play, Clock, Star } from 'lucide-react';
import { Card, Button, Badge, Input } from '@idavoll/ui';

interface GameItem {
  id: string;
  title: string;
  category: 'drawing' | 'party' | 'board';
  desc: string;
  rating: string;
  players: string;
  playTime: string;
  badge?: string;
  active: boolean;
  color: string;
}

const GAMES_LIST: GameItem[] = [
  {
    id: 'draw-and-guess',
    title: '你画我猜 (Draw & Guess)',
    category: 'drawing',
    desc: '一人作画众人狂猜，拼画工更拼脑回路！支持自选词汇与全屏弹幕互动。',
    rating: '4.9',
    players: '2-12 人',
    playTime: '3-8 分钟',
    badge: '热门首选',
    active: true,
    color: '#5B5BF0',
  },
  {
    id: 'who-is-spy',
    title: '谁是卧底 (Who is Spy)',
    category: 'party',
    desc: '聚会必备语言心理战！找出潜藏身边的卧底，用隐晦描述隐瞒身份。',
    rating: '4.8',
    players: '4-10 人',
    playTime: '5-10 分钟',
    badge: '即将上线',
    active: false,
    color: '#FF6B5E',
  },
  {
    id: 'ludo-party',
    title: '飞行棋聚会 (Ludo Party)',
    category: 'board',
    desc: '童年经典四色棋局，全新多人狂掷骰子道具乱斗，绝地翻盘超刺激！',
    rating: '4.7',
    players: '2-4 人',
    playTime: '10-15 分钟',
    badge: '即将上线',
    active: false,
    color: '#2EC4A6',
  },
  {
    id: 'werewolf',
    title: '预言家之夜 (Werewolf Lite)',
    category: 'party',
    desc: '极简版聚会狼人杀，去除繁琐冗长发言，快速盘逻辑揪出黑手。',
    rating: '4.6',
    players: '6-12 人',
    playTime: '8-15 分钟',
    badge: '即将上线',
    active: false,
    color: '#8B5CF6',
  },
];

export const GameLibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'party' | 'drawing' | 'board'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = GAMES_LIST.filter((g) => {
    if (activeTab !== 'all' && g.category !== activeTab) return false;
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">{t('games.title')}</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            精心打造的派对互动游戏库，无缝支持桌面与移动端
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索游戏..."
            className="h-11"
          />
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: t('games.filterAll') },
          { key: 'drawing', label: t('games.filterDrawing') },
          { key: 'party', label: t('games.filterParty') },
          { key: 'board', label: t('games.filterBoard') },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-2.5 rounded-full text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-md shadow-indigo-500/20'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((game) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card
              hoverEffect={game.active}
              onClick={() => {
                if (game.id === 'draw-and-guess') {
                  navigate('/games/draw-and-guess');
                }
              }}
              className="p-6 h-full flex flex-col justify-between space-y-6 border-2 border-border/80"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {game.badge && (
                    <Badge variant={game.active ? 'default' : 'muted'} className="text-xs font-bold">
                      {game.badge}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{game.rating}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-foreground">{game.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-2 leading-relaxed">
                    {game.desc}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground pt-2">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-indigo-500" /> {game.players}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-rose-500" /> {game.playTime}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground">
                  {game.active ? '多端即开即玩' : '研发打磨中'}
                </span>

                {game.active ? (
                  <Button size="sm" className="font-bold gap-1.5 px-5">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t('games.playNow')}</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="surface" disabled className="text-xs">
                    敬请期待
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
