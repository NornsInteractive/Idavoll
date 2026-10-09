import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Play, Clock, LayoutGrid, List, RotateCcw } from 'lucide-react';
import { Card, Button, Badge, Input } from '@idavoll/ui';

interface GameItem {
  id: string;
  title: string;
  category: 'drawing' | 'party' | 'board';
  desc: string;
  players: string;
  playTime: string;
  badge?: string;
  active: boolean;
}

export const GameLibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'party' | 'drawing' | 'board'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const gamesList: GameItem[] = [
    {
      id: 'draw-and-guess',
      title: t('gameDetail.title', '你画我猜 (Draw & Guess)'),
      category: 'drawing',
      desc: t('games.drawAndGuessDesc', '一人作画众人狂猜，拼画工更拼脑回路！支持自选词库、全屏弹幕互动与实时语音。'),
      players: t('games.playersRange', '2-12 人'),
      playTime: t('games.roundTime', '30-120 秒/轮'),
      badge: t('games.drawAndGuessBadge', '火热开放'),
      active: true,
    },
    {
      id: 'who-is-spy',
      title: t('games.whoIsSpy', '谁是卧底 (Who is Spy)'),
      category: 'party',
      desc: t('games.whoIsSpyDesc', '聚会必备语言心理战！找出潜藏身边的卧底，用隐晦描述隐瞒身份。'),
      players: t('games.filterAll') === 'All Games' ? '4-10 Players' : '4-10 人',
      playTime: t('games.minutesRange', { min: 5, max: 10, defaultValue: '5-10 分钟' }),
      badge: t('games.whoIsSpyBadge', '未开放'),
      active: false,
    },
    {
      id: 'ludo-party',
      title: t('games.ludoParty', '飞行棋聚会 (Ludo Party)'),
      category: 'board',
      desc: t('games.ludoPartyDesc', '童年经典四色棋局，多人狂掷骰子道具乱斗，绝地翻盘超刺激！'),
      players: t('games.filterAll') === 'All Games' ? '2-4 Players' : '2-4 人',
      playTime: t('games.minutesRange', { min: 10, max: 15, defaultValue: '10-15 分钟' }),
      badge: t('games.ludoPartyBadge', '未开放'),
      active: false,
    },
    {
      id: 'werewolf',
      title: t('games.werewolf', '预言家之夜 (Werewolf Lite)'),
      category: 'party',
      desc: t('games.werewolfDesc', '极简版聚会狼人杀，去除繁琐冗长发言，快速盘逻辑揪出黑手。'),
      players: t('games.filterAll') === 'All Games' ? '6-12 Players' : '6-12 人',
      playTime: t('games.minutesRange', { min: 8, max: 15, defaultValue: '8-15 分钟' }),
      badge: t('games.werewolfBadge', '未开放'),
      active: false,
    },
  ];

  const filtered = gamesList.filter((g) => {
    if (activeTab !== 'all' && g.category !== activeTab) return false;
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const isEnglish = t('games.filterAll') === 'All Games';

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveTab('all');
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-8 py-5 sm:py-6 space-y-5 sm:space-y-8">
      {/* Header, Search and View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {t('games.title')}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5 sm:mt-1">
            {t('games.subtitle', '精心打造的派对互动游戏库，无缝支持桌面与移动端')}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-72">
            <Input
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('games.searchPlaceholder', '搜索游戏...')}
              className="h-10 sm:h-11 text-xs sm:text-sm"
            />
          </div>

          {/* View Toggle: Grid vs List */}
          <div
            className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/80 shrink-0"
            role="group"
            aria-label={t('games.viewMode', '视图切换')}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
              title={t('games.viewGrid', '网格视图')}
              aria-label={t('games.viewGrid', '网格视图')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
              title={t('games.viewList', '列表视图')}
              aria-label={t('games.viewList', '列表视图')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
            className={`px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === tab.key
                ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-md shadow-[var(--theme-primary,#5B5BF0)]/20'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <Card className="p-8 sm:p-12 text-center space-y-4 border-2 border-dashed border-border/80">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-muted/70 flex items-center justify-center text-muted-foreground">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-foreground">
              {t('games.noGamesFound', '未找到相关游戏')}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t('games.noGamesDesc', '换个关键词或分类筛选试试看吧')}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetFilters}
            className="gap-1.5 font-bold mx-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('games.resetFilters', '重置筛选')}</span>
          </Button>
        </Card>
      )}

      {/* Games View - Grid Mode (compact on mobile) */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
          {filtered.map((game) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              <Card
                hoverEffect={game.active}
                onClick={() => {
                  if (game.active) {
                    navigate(`/games/${game.id}`);
                  }
                }}
                className={`p-4 sm:p-6 h-full flex flex-col justify-between space-y-3.5 sm:space-y-5 border-2 rounded-2xl sm:rounded-3xl ${
                  game.active
                    ? 'border-[var(--theme-primary,#5B5BF0)]/30 cursor-pointer shadow-sm hover:shadow-md'
                    : 'border-border/60 opacity-60 cursor-not-allowed bg-muted/20'
                }`}
              >
                <div className="space-y-2.5 sm:space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={game.active ? 'default' : 'muted'} className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5">
                      {game.badge}
                    </Badge>
                    <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground shrink-0">
                      {game.active ? (isEnglish ? 'Official Release' : '正式版本') : (isEnglish ? 'In Development' : '研发阶段')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-xl font-black text-foreground tracking-tight">
                      {game.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 sm:mt-1.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {game.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold text-muted-foreground pt-0.5 sm:pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[var(--theme-primary,#5B5BF0)] shrink-0" />
                      <span>{game.players}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{game.playTime}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border/80 gap-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
                    {game.active ? (isEnglish ? 'Cross-Platform Ready' : '多端即开即玩') : (isEnglish ? 'Coming Soon · Not Open' : '敬请期待 · 暂未开放')}
                  </span>

                  {game.active ? (
                    <Button size="sm" className="font-extrabold gap-1.5 px-4 sm:px-5 py-1.5 text-xs sm:text-sm shrink-0">
                      <Play className="w-3 h-3 fill-current" />
                      <span>{t('games.playNow')}</span>
                    </Button>
                  ) : (
                    <Button size="sm" variant="surface" disabled className="text-xs cursor-not-allowed opacity-50 px-3 py-1.5 shrink-0">
                      {t('games.unreleased', '未开放')}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Games View - List Mode (compact and streamlined) */}
      {viewMode === 'list' && filtered.length > 0 && (
        <div className="flex flex-col gap-2.5 sm:gap-3.5">
          {filtered.map((game) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              <Card
                hoverEffect={game.active}
                onClick={() => {
                  if (game.active) {
                    navigate(`/games/${game.id}`);
                  }
                }}
                className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all ${
                  game.active
                    ? 'border-[var(--theme-primary,#5B5BF0)]/30 cursor-pointer shadow-xs hover:shadow-md'
                    : 'border-border/60 opacity-60 cursor-not-allowed bg-muted/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Info */}
                  <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={game.active ? 'default' : 'muted'} className="text-[10px] sm:text-xs font-bold px-2 py-0.5">
                        {game.badge}
                      </Badge>
                      <h3 className="text-sm sm:text-base font-black text-foreground truncate">
                        {game.title}
                      </h3>
                      <span className="text-[11px] font-semibold text-muted-foreground hidden md:inline">
                        · {game.active ? (isEnglish ? 'Official Release' : '正式版本') : (isEnglish ? 'In Development' : '研发阶段')}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium line-clamp-1 sm:line-clamp-2 leading-relaxed">
                      {game.desc}
                    </p>

                    <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[var(--theme-primary,#5B5BF0)] shrink-0" />
                        <span>{game.players}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{game.playTime}</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground/80 hidden sm:inline">
                        · {game.active ? (isEnglish ? 'Cross-Platform Ready' : '多端即开即玩') : (isEnglish ? 'Coming Soon' : '敬请期待')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="flex items-center justify-end sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    {game.active ? (
                      <Button size="sm" className="font-extrabold gap-1.5 px-4 sm:px-5 py-1.5 text-xs sm:text-sm">
                        <Play className="w-3 h-3 fill-current" />
                        <span>{t('games.playNow')}</span>
                      </Button>
                    ) : (
                      <Button size="sm" variant="surface" disabled className="text-xs cursor-not-allowed opacity-50 px-3 py-1.5">
                        {t('games.unreleased', '未开放')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
