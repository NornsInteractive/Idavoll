import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DrawBoard, InGameChatDrawer } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';

export const InGameDrawerPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { id: userId, nickname, avatar } = useUserStore();
  const { room, messages, addMessage, isMuted, toggleMute, speakingUserIds } = useRoomStore();
  const {
    gameState,
    currentWord,
    addStroke,
    undoStroke,
    clearStrokes,
    selectWord,
    initDemoGame,
  } = useGameStore();

  const [currentColor, setCurrentColor] = useState('#413FD6');
  const [currentSize, setCurrentSize] = useState(8);
  const [isEraser, setIsEraser] = useState(false);
  const [timeLeft, setTimeLeft] = useState(42);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [redoStack, setRedoStack] = useState<any[]>([]);

  useEffect(() => {
    if (!gameState) {
      initDemoGame(userId, true);
    }
  }, [gameState, userId, initDemoGame]);

  // Countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/game/result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const currentStrokes = gameState?.strokes || [];

  const handleSendDanmaku = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!danmakuInput.trim()) return;

    addMessage({
      version: 'v1',
      seq: Date.now(),
      timestamp: Date.now(),
      senderId: userId,
      type: 'chat:message',
      payload: {
        id: `msg_${Date.now()}`,
        type: 'danmaku',
        content: danmakuInput.trim(),
        senderNickname: '小明',
        senderAvatar: avatar,
        isDanmaku: true,
      },
    });
    setDanmakuInput('');
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    try {
      if (!isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  };

  const handleUndo = () => {
    if (currentStrokes.length > 0) {
      const last = currentStrokes[currentStrokes.length - 1];
      setRedoStack((prev) => [...prev, last]);
      undoStroke();
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextStroke = redoStack[redoStack.length - 1];
      setRedoStack((prev) => prev.slice(0, -1));
      addStroke(nextStroke);
    }
  };

  const handleClear = () => {
    setRedoStack([]);
    clearStrokes();
  };

  const colorSwatches = [
    { color: '#413FD6', title: '主色蓝' },
    { color: '#FC695C', title: '珊瑚红' },
    { color: '#2EC4A6', title: '薄荷绿' },
    { color: '#FFD13B', title: '明亮黄' },
    { color: '#38BDF8', title: '天青蓝' },
    { color: '#161A30', title: '炭墨黑' },
    { color: '#FFFFFF', title: '纯白色', border: true },
    { color: '#8D5B4C', title: '暖棕褐' },
  ];

  const wordBank = ['旋转木马', '摩天轮', '过山车', '碰碰车', '海盗船'];

  const handleRerollWord = () => {
    const nextWords = wordBank.filter((w) => w !== currentWord);
    const randomWord = nextWords[Math.floor(Math.random() * nextWords.length)];
    selectWord(randomWord);
  };

  return (
    <div className={`bg-background text-on-surface h-full flex justify-center items-start overflow-hidden select-none font-body-md antialiased ${isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''}`}>
      {/* Mobile Frame Container (Matching Stitch 390px / Full Screen Toggle) */}
      <div className={`w-full ${isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'} flex flex-col justify-between bg-surface relative overflow-hidden shadow-2xl`}>
        {/* ========================================== */}
        {/* 1. COMPACT TOP STATUS BAR (STREAMLINED)   */}
        {/* ========================================== */}
        <header className="pt-2 px-3 pb-1 bg-surface shrink-0 z-20">
          {/* Row 1: Back + Room Info + Timer + Voice Pill + Mode Toggle */}
          <div className="flex items-center justify-between gap-1.5 h-11">
            {/* Left: Exit + Room Round Info */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/room/room_idavoll_demo')}
                className="tactile-btn w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
                title="退出房间"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              </button>
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-[12px] text-on-surface font-extrabold tracking-tight">#84920</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
                </div>
                <span className="font-label-sm text-[10px] text-primary font-bold">第 2/5 轮 · 画手</span>
              </div>
            </div>

            {/* Center: Compact Timer Pill */}
            <div className="flex items-center gap-1.5 bg-secondary-fixed/50 border border-secondary/20 px-2.5 py-1 rounded-full shadow-xs">
              <span className="material-symbols-outlined text-secondary text-[16px] animate-pulse">timer</span>
              <span className="font-headline-sm text-[14px] font-black text-secondary tracking-tight leading-none">{timeLeft}s</span>
            </div>

            {/* Right: Voice + Fullscreen Toggle Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(true)}
                className="tactile-btn flex items-center gap-1 bg-surface-container text-on-surface px-2 py-1 rounded-full cursor-pointer"
                title="语音与房间成员"
              >
                <span className="material-symbols-outlined text-[14px] text-tertiary-container animate-bounce">mic</span>
                <span className="font-label-sm text-[11px] font-bold">4人</span>
              </button>

              {/* Fullscreen / Immersive Canvas Mode Switcher */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="tactile-btn flex items-center gap-1 bg-primary text-on-primary px-2.5 py-1 rounded-full shadow-sm hover:bg-primary-container cursor-pointer"
                title="切换全屏画板"
              >
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
                <span className="font-label-sm text-[11px] font-extrabold">
                  {isFullscreen ? '退出全屏' : '全屏画板'}
                </span>
              </button>
            </div>
          </div>

          {/* Row 2: Streamlined Secret Word Card + Floating Horizontal Player Avatars Strip */}
          <div className="mt-1 flex items-center justify-between gap-2">
            {/* Secret Word Pill (Drawer's Target Word) */}
            <div className="flex-1 bg-surface-container-low border border-surface-container rounded-xl px-2.5 py-1.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-primary text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  visibility
                </span>
                <span className="font-label-sm text-[11px] text-on-surface-variant font-bold shrink-0">词条:</span>
                <span className="font-headline-sm text-[14px] font-black text-primary tracking-wide truncate">
                  【 {currentWord} 】
                </span>
                <span className="hidden xs:inline-block font-label-sm text-[10px] text-outline px-1.5 py-0.2 rounded-full bg-surface-container-highest shrink-0">
                  {currentWord.length}字
                </span>
              </div>
              {/* Reroll button */}
              <button
                type="button"
                onClick={handleRerollWord}
                className="tactile-btn shrink-0 flex items-center gap-0.5 bg-surface-container-highest text-primary hover:bg-primary hover:text-on-primary px-2 py-0.5 rounded-full font-label-sm text-[10px] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[12px]">autorenew</span>
                <span>换词</span>
              </button>
            </div>

            {/* Compact Floating Players Bubbles (Takes minimal vertical space) */}
            <div className="flex items-center gap-1 bg-surface-container-low border border-surface-container rounded-xl px-2 py-1 shrink-0">
              {/* Self (小明) */}
              <div className="relative" title="我 (画手 350分)">
                <img
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-primary"
                  alt="小明"
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=XiaoMing"
                />
                <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center font-bold">
                  画
                </span>
              </div>
              {/* Aya (Leader) */}
              <div className="relative" title="阿雅 (👑榜首 420分)">
                <img
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-amber-400"
                  alt="阿雅"
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=Aya"
                />
                <span className="absolute -top-1 -right-1 text-[9px] leading-none">👑</span>
              </div>
              {/* Leo */}
              <div className="relative opacity-85" title="浩浩 (210分)">
                <img
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-surface-variant"
                  alt="浩浩"
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao"
                />
              </div>
              {/* Sugar */}
              <div className="relative opacity-85" title="糖糖 (180分)">
                <img
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-surface-variant"
                  alt="糖糖"
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=TangTang"
                />
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. MAXIMIZED CANVAS IN ERGONOMIC GOLDEN REACH ZONE + FLOATING DANMAKU     */}
        {/* ========================================================================= */}
        <main className="flex-1 px-3 flex flex-col justify-start min-h-0 relative z-10 pt-1 pb-1 overflow-hidden">
          {/* Expanded High-Impact Drawing Canvas Card (occupies ~65% vertical space) */}
          <div className="w-full flex-1 bg-surface-container-lowest rounded-2xl canvas-border-active relative border border-primary/30 flex flex-col overflow-hidden shadow-lg select-none min-h-0">
            {/* Top Action Floating Controls (Canvas Header Bar) */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto z-30">
              {/* Drawer Status Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm border border-surface-container text-on-surface">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span className="font-label-sm text-[11px] text-on-surface font-extrabold">你的画板 · 黄金触控区</span>
              </div>
              {/* Quick Editing Tools: Undo, Redo, Clear Screen & Fullscreen Expand button */}
              <div className="flex items-center gap-1 bg-surface-container-lowest/95 backdrop-blur-md p-1 rounded-full shadow-md border border-surface-container">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="撤销 (Undo)"
                >
                  <span className="material-symbols-outlined text-[19px]">undo</span>
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="重做 (Redo)"
                >
                  <span className="material-symbols-outlined text-[19px]">redo</span>
                </button>
                <div className="w-px h-4 bg-outline-variant my-auto"></div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-secondary-fixed transition-colors cursor-pointer"
                  title="清屏 (Clear)"
                >
                  <span className="material-symbols-outlined text-[19px]">delete_sweep</span>
                </button>
                <div className="w-px h-4 bg-outline-variant my-auto"></div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="tactile-btn w-8 h-8 rounded-full flex items-center justify-center text-primary bg-primary-fixed hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  title="收起/全屏缩放"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFullscreen ? 'close_fullscreen' : 'open_in_full'}
                  </span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* FLOATING DANMAKU OVERLAY (实时全屏猜词弹幕系统)            */}
            {/* Non-intrusive stream of guesses floating over upper canvas */}
            {/* ======================================================== */}
            <div className="absolute top-12 left-0 right-0 h-28 pointer-events-none z-20 overflow-hidden flex flex-col justify-start gap-2 pt-1 px-3">
              {/* Danmaku Lane 1: Celebratory Correct Guess Floating Pill */}
              <div className="danmaku-badge self-start flex items-center gap-1.5 bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full shadow-lg border border-white/20 transform -translate-x-1">
                <span className="material-symbols-outlined text-[15px] animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
                  celebration
                </span>
                <span className="font-label-sm text-[12px] font-black">阿雅 (Aya) 猜中了！</span>
                <span className="bg-white/25 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">+100分 ⚡</span>
              </div>
              {/* Danmaku Lane 2: Active Guess Bullet (Flowing from right) */}
              <div className="danmaku-1 whitespace-nowrap self-start flex items-center gap-1.5 bg-surface-container-highest/85 backdrop-blur-md text-on-surface px-3 py-1 rounded-full shadow-sm border border-white/40">
                <img
                  className="w-4 h-4 rounded-full object-cover"
                  alt="浩浩"
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao"
                />
                <span className="font-label-sm text-[11px] font-bold text-on-surface-variant">浩浩:</span>
                <span className="font-body-sm text-[12px] font-extrabold text-on-surface">碰碰车？</span>
              </div>
              {/* Danmaku Lane 3: Cheering reaction bullet */}
              <div className="danmaku-2 whitespace-nowrap self-start flex items-center gap-1.5 bg-surface-container-lowest/80 backdrop-blur-md text-on-surface px-2.5 py-0.5 rounded-full shadow-xs border border-surface-container">
                <img
                  className="w-4 h-4 rounded-full object-cover"
                  alt="糖糖"
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=TangTang"
                />
                <span className="font-label-sm text-[11px] font-bold text-on-surface-variant">糖糖:</span>
                <span className="font-body-sm text-[11px]">画得好可爱啊！👏</span>
              </div>
            </div>

            {/* The In-Progress Fun Sketch Visual (Expanded Canvas Playground) */}
            <div className="w-full h-full relative flex items-center justify-center bg-white cursor-crosshair overflow-hidden">
              {/* Grid Dots / Canvas Texture Guidelines */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#413FD6 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              ></div>

              {/* Embedded Interactive Canvas */}
              <DrawBoard
                strokes={currentStrokes}
                onStrokeComplete={(stroke) => addStroke(stroke)}
                currentColor={currentColor}
                currentSize={currentSize}
                isEraser={isEraser}
                isDrawer={true}
                width={1000}
                height={750}
                className="w-full h-full border-0 rounded-none z-10"
              />
            </div>

            {/* Canvas Bottom Info Bar */}
            <div className="bg-surface-container-low/90 backdrop-blur-sm px-3 py-1 flex items-center justify-between border-t border-surface-container text-on-surface-variant z-10 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">touch_app</span>
                <span className="font-label-sm text-[11px] font-bold text-on-surface">大拇指黄金触控区已就绪</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-label-sm text-[11px] text-outline">双指捏合缩放</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* 3. ERGONOMIC LOWER TOOLBAR & COLOR PALETTE (RIGHT UNDER THUMB'S REACH)    */}
        {/* ========================================================================= */}
        <div className="px-3 py-0.5 bg-surface shrink-0 z-20">
          <div className="bg-surface-container-low/90 border border-surface-container rounded-full px-2.5 py-1 shadow-xs flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="material-symbols-outlined text-primary text-[14px] shrink-0">forum</span>
              <div className="flex items-center gap-1 text-[11px] min-w-0 truncate">
                <span className="bg-emerald-500/10 text-tertiary px-1 py-0.2 rounded font-bold text-[9px] shrink-0">
                  🎉 阿雅答对
                </span>
                <span className="font-bold text-primary shrink-0">浩浩:</span>
                <span className="text-on-surface truncate">碰碰车？</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsChatDrawerOpen(true)}
              className="tactile-btn shrink-0 flex items-center gap-0.5 text-[10px] text-outline hover:text-primary px-1.5 py-0.5 rounded-full bg-surface-container font-semibold transition-colors cursor-pointer"
              title="展开完整互动消息"
            >
              <span className="text-[10px]">{messages.length > 0 ? `${messages.length}条` : '12条'}</span>
              <span className="material-symbols-outlined text-[12px]">expand_less</span>
            </button>
          </div>
        </div>

        <section className="px-3 pb-2 pt-1 bg-surface shrink-0 z-30">
          <div className="bg-surface-container-lowest rounded-2xl p-2.5 border border-surface-container canvas-shadow flex flex-col gap-2">
            {/* Palette Swatches: Large, highly clickable finger targets */}
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {colorSwatches.map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => {
                    setCurrentColor(item.color);
                    setIsEraser(false);
                  }}
                  className={`tactile-btn w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-transform shadow-xs cursor-pointer ${
                    item.border ? 'border-2 border-outline-variant' : ''
                  } ${currentColor === item.color && !isEraser ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: item.color }}
                  title={item.title}
                >
                  {currentColor === item.color && !isEraser && (
                    <span className={`w-1.5 h-1.5 rounded-full ${item.color === '#FFFFFF' ? 'bg-primary' : 'bg-white'}`} />
                  )}
                </button>
              ))}

              {/* Color Wheel Picker */}
              <label
                className="tactile-btn w-7 h-7 rounded-full bg-gradient-to-tr from-pink-400 via-indigo-500 to-teal-300 flex items-center justify-center text-white shrink-0 shadow-sm cursor-pointer relative"
                title="更多色彩"
              >
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => {
                    setCurrentColor(e.target.value);
                    setIsEraser(false);
                  }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <span className="material-symbols-outlined text-[14px]">palette</span>
              </label>
            </div>

            {/* Core Tools Row: Pen, Eraser, Fill Bucket, Brush Size */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-container">
              {/* Tools Cluster */}
              <div className="flex items-center gap-1.5">
                {/* Pencil (Active State) */}
                <button
                  type="button"
                  onClick={() => setIsEraser(false)}
                  className={`tactile-btn flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-[12px] shadow-sm cursor-pointer ${
                    !isEraser ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: !isEraser ? "'FILL' 1" : "'FILL' 0" }}>
                    edit
                  </span>
                  <span className="font-black">画笔</span>
                </button>
                {/* Eraser */}
                <button
                  type="button"
                  onClick={() => setIsEraser(true)}
                  className={`tactile-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full font-label-sm text-[12px] transition-colors cursor-pointer ${
                    isEraser ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">ink_eraser</span>
                  <span>橡皮</span>
                </button>
                {/* Paint Bucket */}
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="tactile-btn flex items-center gap-1 bg-surface-container text-on-surface px-2.5 py-1.5 rounded-full font-label-sm text-[12px] hover:bg-surface-variant transition-colors cursor-pointer"
                  title="一键清屏底色"
                >
                  <span className="material-symbols-outlined text-[16px]">format_color_fill</span>
                  <span>油漆桶</span>
                </button>
              </div>

              {/* Stroke Width Multi-toggle */}
              <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full">
                <button
                  type="button"
                  onClick={() => setCurrentSize(4)}
                  className={`tactile-btn w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                    currentSize <= 5 ? 'text-primary ring-2 ring-primary bg-surface-container-lowest' : 'text-outline hover:text-on-surface'
                  }`}
                  title="细笔触"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSize(8)}
                  className={`tactile-btn w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                    currentSize > 5 && currentSize <= 12 ? 'text-primary ring-2 ring-primary bg-surface-container-lowest' : 'text-outline hover:text-on-surface'
                  }`}
                  title="中笔触"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-current"></span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSize(16)}
                  className={`tactile-btn w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                    currentSize > 12 ? 'text-primary ring-2 ring-primary bg-surface-container-lowest' : 'text-outline hover:text-on-surface'
                  }`}
                  title="粗笔触"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-current"></span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. BOTTOM ACTION FOOTER: QUICK HINT, EMOJI & PUSH-TO-TALK (COMPACT)       */}
        {/* ========================================================================= */}
        <footer className="bg-surface-container-lowest px-3 pt-1.5 pb-3 border-t border-surface-container shadow-md z-30 shrink-0">
          <div className="flex flex-col gap-1.5">
            {/* Input row */}
            <form onSubmit={handleSendDanmaku} className="flex items-center gap-1.5 bg-surface-container-low border border-surface-container rounded-full px-2 py-1 shadow-xs">
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(true)}
                className="tactile-btn w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0 cursor-pointer"
                title="常用短语与表情"
              >
                <span className="material-symbols-outlined text-[18px]">sentiment_satisfied</span>
              </button>
              <input
                type="text"
                value={danmakuInput}
                onChange={(e) => setDanmakuInput(e.target.value)}
                placeholder="发弹幕互动...（画手禁发答案）"
                className="flex-1 bg-transparent border-0 text-on-surface placeholder:text-outline font-body-sm text-[12px] p-0 focus:ring-0 focus:outline-none truncate"
              />
              <button
                type="submit"
                className="tactile-btn w-7 h-7 rounded-full bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
                title="发送弹幕"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
              </button>
            </form>

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => {
                  addMessage({
                    version: 'v1',
                    seq: Date.now(),
                    timestamp: Date.now(),
                    senderId: userId,
                    type: 'chat:message',
                    payload: {
                      id: `msg_${Date.now()}`,
                      type: 'system',
                      content: `画手小明 提供了线索提示：答案为 4 个字游乐场设施！`,
                      senderNickname: '系统',
                      senderAvatar: '',
                      isDanmaku: true,
                    },
                  });
                }}
                className="tactile-btn shrink-0 flex items-center gap-1 bg-surface-container-high text-primary hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-full font-label-sm text-[11px] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lightbulb
                </span>
                <span className="font-extrabold">提示</span>
              </button>

              <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-full border border-surface-container">
                {['👏', '😂', '🔥', '💡'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      addMessage({
                        version: 'v1',
                        seq: Date.now(),
                        timestamp: Date.now(),
                        senderId: userId,
                        type: 'chat:message',
                        payload: {
                          id: `msg_${Date.now()}`,
                          type: 'text',
                          content: emoji,
                          senderNickname: nickname,
                          senderAvatar: avatar,
                          isDanmaku: true,
                        },
                      });
                    }}
                    className="tactile-btn w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center text-[13px] cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={toggleMute}
                className="tactile-btn flex-1 flex items-center justify-center gap-1 bg-primary hover:bg-primary-container text-on-primary py-1.5 px-3 rounded-full shadow-sm font-label-md text-[13px] font-black cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">{isMuted ? 'mic_off' : 'mic'}</span>
                <span>{isMuted ? '麦克风已静音' : '按住说话'}</span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Reusable InGameChatDrawer */}
      <InGameChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        currentUserId={userId}
        onSendMessage={(content) => {
          addMessage({
            version: 'v1',
            seq: Date.now(),
            timestamp: Date.now(),
            senderId: userId,
            type: 'chat:message',
            payload: {
              id: `msg_${Date.now()}`,
              type: 'text',
              content,
              senderNickname: nickname,
              senderAvatar: avatar,
              isDanmaku: false,
            },
          });
        }}
        players={room?.players || []}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        speakingUserIds={speakingUserIds}
        roomCode="84920"
        roundInfo="第 2/5 轮"
        currentDrawerNickname="小明"
        isDrawer={true}
      />
    </div>
  );
};
