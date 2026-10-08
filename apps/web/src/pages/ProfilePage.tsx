import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Trophy,
  Palette,
  Sun,
  Moon,
  Globe,
  Award,
  CheckCircle,
  Clock,
  Sparkles,
  Edit2,
  Check,
} from 'lucide-react';
import { Card, Button, Badge, Avatar, Input } from '@idavoll/ui';
import { AccentPresets } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
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
  } = useUserStore();

  const [isEditingNick, setIsEditingNick] = useState(false);
  const [newNick, setNewNick] = useState(nickname);

  const handleSaveNick = () => {
    if (newNick.trim()) {
      setUser({ id: userId, nickname: newNick.trim(), avatar });
      setIsEditingNick(false);
    }
  };

  const handleSelectLang = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* User Info Card */}
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 border-2 border-border/80">
        <Avatar src={avatar} alt={nickname} size="xl" className="ring-4 ring-indigo-500/20" />

        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {isEditingNick ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newNick}
                  onChange={(e) => setNewNick(e.target.value)}
                  className="h-9 w-40 text-sm font-bold"
                  maxLength={16}
                />
                <Button size="icon" onClick={handleSaveNick} className="h-9 w-9">
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-foreground">{nickname}</h2>
                <button
                  type="button"
                  onClick={() => setIsEditingNick(true)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  title="修改昵称"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <Badge variant="subtle" className="font-extrabold text-xs">
              Lv.8 黄金画匠
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground font-mono">ID: {userId}</p>
          <p className="text-xs text-muted-foreground font-medium">
            热爱色彩与天马行空的想象力，画画从不打草稿！
          </p>
        </div>
      </Card>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('profile.statsTotal'), value: '48 局', sub: '近30天' },
          { label: t('profile.statsWins'), value: '68.5%', sub: '胜场 33 次' },
          { label: '抢答命中率', value: '82%', sub: '秒速猜中 64 次' },
          { label: t('profile.statsDrawings'), value: '29 幅', sub: '精选画廊' },
        ].map((stat) => (
          <Card key={stat.label} className="p-5 text-center space-y-1">
            <span className="text-xs font-bold text-muted-foreground">{stat.label}</span>
            <h4 className="text-2xl font-black font-mono text-[var(--theme-primary,#5B5BF0)]">
              {stat.value}
            </h4>
            <span className="text-[11px] text-muted-foreground">{stat.sub}</span>
          </Card>
        ))}
      </div>

      {/* Visual Settings: Dark Mode & Accent Colors */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Palette className="w-5 h-5 text-[var(--theme-primary,#5B5BF0)]" />
          <h3 className="text-lg font-black text-foreground">{t('profile.themeSetting')}</h3>
        </div>

        {/* Theme mode toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-extrabold text-foreground">外观明暗模式</h5>
            <p className="text-xs text-muted-foreground">根据环境光线自由切换亮色与暗色模式</p>
          </div>

          <Button
            size="sm"
            variant="surface"
            onClick={toggleTheme}
            className="gap-2 font-bold px-4 h-10"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span>{isDark ? t('profile.darkMode') : t('profile.lightMode')}</span>
          </Button>
        </div>

        {/* Accent Color Palette Switcher */}
        <div className="space-y-3">
          <div>
            <h5 className="text-sm font-extrabold text-foreground">{t('profile.colorPresets')}</h5>
            <p className="text-xs text-muted-foreground">定制全站主交互色，实时生效并同步多端</p>
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
            <p className="text-xs text-muted-foreground">选择界面显示语言 (i18next)</p>
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
                className="h-9 px-4 text-xs font-bold"
              >
                {l.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Achievements Badges */}
      <Card className="p-6 space-y-4">
        <h4 className="font-extrabold text-base text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>成就勋章</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: '神笔初现', desc: '累计作画达到 10 次', unlocked: true, icon: '🎨' },
            { name: '心有灵犀', desc: '一秒识图猜中答案', unlocked: true, icon: '⚡' },
            { name: '排位大师', desc: '总积分突破 1000 分', unlocked: true, icon: '🏆' },
            { name: '百折不挠', desc: '逆风翻盘赢得第一名', unlocked: false, icon: '👑' },
          ].map((item) => (
            <div
              key={item.name}
              className={`p-4 rounded-2xl border text-center space-y-1 ${
                item.unlocked ? 'bg-muted/40 border-border' : 'opacity-50 bg-muted/20 border-dashed border-border'
              }`}
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <h5 className="text-xs font-black text-foreground">{item.name}</h5>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
