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
  const [desktopChatTab, setDesktopChatTab] = useState<'guess' | 'chat'>('guess');
  const [isDanmakuOn, setIsDanmakuOn] = useState(true);
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
        senderNickname: '小明 (画手)',
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

  const mobileColorSwatches = [
    { color: '#413FD6', title: '主色蓝' },
    { color: '#FC695C', title: '珊瑚红' },
    { color: '#2EC4A6', title: '薄荷绿' },
    { color: '#FFD13B', title: '明亮黄' },
    { color: '#38BDF8', title: '天青蓝' },
    { color: '#161A30', title: '炭墨黑' },
    { color: '#FFFFFF', title: '纯白色', border: true },
    { color: '#8D5B4C', title: '暖棕褐' },
  ];

  const desktopColorSwatches = [
    '#161A30', '#475569', '#94A3B8', '#FFFFFF',
    '#413FD6', '#5B5BF0', '#818CF8', '#C7D2FE',
    '#AE3029', '#FC695C', '#F97316', '#FBBF24',
    '#10B981', '#2EC4A6', '#06B6D4', '#38BDF8',
    '#8B5CF6', '#EC4899', '#8D5B4C', '#FDE047'
  ];

  const wordBank = ['旋转木马', '摩天轮', '过山车', '碰碰车', '海盗船'];

  const handleRerollWord = () => {
    const nextWords = wordBank.filter((w) => w !== currentWord);
    const randomWord = nextWords[Math.floor(Math.random() * nextWords.length)];
    selectWord(randomWord);
  };

  return (
    <div className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background select-none font-body-md antialiased ${isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''}`}>
      {/* =========================================================================
          1. MOBILE VIEW (< lg: 1024px) - 100% Exact match to temp/stitch_idavoll
         ========================================================================= */}
      <div className={`lg:hidden w-full h-full flex justify-center items-start overflow-hidden`}>
        <div className={`w-full ${isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'} flex flex-col justify-between bg-surface relative overflow-hidden shadow-2xl`}>
          {/* Top Status Bar */}
          <header className="pt-2 px-3 pb-1 bg-surface shrink-0 z-20">
            <div className="flex items-center justify-between gap-1.5 h-11">
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

              <div className="flex items-center gap-1.5 bg-secondary-fixed/50 border border-secondary/20 px-2.5 py-1 rounded-full shadow-xs">
                <span className="material-symbols-outlined text-secondary text-[16px] animate-pulse">timer</span>
                <span className="font-headline-sm text-[14px] font-black text-secondary tracking-tight leading-none">{timeLeft}s</span>
              </div>

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

            <div className="mt-1 flex items-center justify-between gap-2">
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
                <button
                  type="button"
                  onClick={handleRerollWord}
                  className="tactile-btn shrink-0 flex items-center gap-0.5 bg-surface-container-highest text-primary hover:bg-primary hover:text-on-primary px-2 py-0.5 rounded-full font-label-sm text-[10px] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">autorenew</span>
                  <span>换词</span>
                </button>
              </div>

              <div className="flex items-center gap-1 bg-surface-container-low border border-surface-container rounded-xl px-2 py-1 shrink-0">
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
                <div className="relative" title="阿雅 (👑榜首 420分)">
                  <img
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-amber-400"
                    alt="阿雅"
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=Aya"
                  />
                  <span className="absolute -top-1 -right-1 text-[9px] leading-none">👑</span>
                </div>
                <div className="relative opacity-85" title="浩浩 (210分)">
                  <img
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-surface-variant"
                    alt="浩浩"
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao"
                  />
                </div>
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

          {/* Main Drawing Canvas Card */}
          <main className="flex-1 px-3 flex flex-col justify-start min-h-0 relative z-10 pt-1 pb-1 overflow-hidden">
            <div className="w-full flex-1 bg-surface-container-lowest rounded-2xl canvas-border-active relative border border-primary/30 flex flex-col overflow-hidden shadow-lg select-none min-h-0">
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto z-30">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm border border-surface-container text-on-surface">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span className="font-label-sm text-[11px] text-on-surface font-extrabold">你的画板 · 黄金触控区</span>
                </div>
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

              {/* Danmaku Overlay */}
              <div className="absolute top-12 left-0 right-0 h-28 pointer-events-none z-20 overflow-hidden flex flex-col justify-start gap-2 pt-1 px-3">
                <div className="danmaku-badge self-start flex items-center gap-1.5 bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full shadow-lg border border-white/20 transform -translate-x-1">
                  <span className="material-symbols-outlined text-[15px] animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
                    celebration
                  </span>
                  <span className="font-label-sm text-[12px] font-black">阿雅 (Aya) 猜中了！</span>
                  <span className="bg-white/25 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">+100分 ⚡</span>
                </div>
                <div className="danmaku-1 whitespace-nowrap self-start flex items-center gap-1.5 bg-surface-container-highest/85 backdrop-blur-md text-on-surface px-3 py-1 rounded-full shadow-sm border border-white/40">
                  <img
                    className="w-4 h-4 rounded-full object-cover"
                    alt="浩浩"
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao"
                  />
                  <span className="font-label-sm text-[11px] font-bold text-on-surface-variant">浩浩:</span>
                  <span className="font-body-sm text-[12px] font-extrabold text-on-surface">碰碰车？</span>
                </div>
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

              {/* Canvas Board */}
              <div className="w-full h-full relative flex items-center justify-center bg-white cursor-crosshair overflow-hidden">
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413FD6 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                ></div>

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

          {/* Middle Expandable Chat Strip */}
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

          {/* Lower Palette Section */}
          <section className="px-3 pb-2 pt-1 bg-surface shrink-0 z-30">
            <div className="bg-surface-container-lowest rounded-2xl p-2.5 border border-surface-container canvas-shadow flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {mobileColorSwatches.map((item) => (
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

              <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                <div className="flex items-center gap-1.5">
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

          {/* Bottom Footer */}
          <footer className="bg-surface-container-lowest px-3 pt-1.5 pb-3 border-t border-surface-container shadow-md z-30 shrink-0">
            <div className="flex flex-col gap-1.5">
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
      </div>

      {/* =========================================================================
          2. DESKTOP VIEW (>= lg: 1024px) - 100% Exact match to Stitch Desktop Screen
             (Screen 9dcdf4f76b614690b2a3ee74c2acc596)
         ========================================================================= */}
      <div className="hidden lg:flex flex-col w-full h-full bg-background overflow-hidden">
        {/* Top Desktop Navigation Bar */}
        <header className="h-14 px-6 bg-surface-container-lowest border-b border-surface-container flex items-center justify-between shrink-0 z-30 shadow-xs">
          {/* Left Brand & Room Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/lobby')}>
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md font-black text-lg">
                🎮
              </div>
              <span className="font-display-hero text-xl font-extrabold text-primary tracking-tight">PlayHub</span>
            </div>

            <div className="h-5 w-px bg-outline-variant"></div>

            <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full text-xs font-bold text-on-surface">
              <span className="material-symbols-outlined text-[15px] text-primary">tag</span>
              <span>Room #84920</span>
              <span className="text-on-surface-variant font-normal">· 房间: 画神集结开黑群</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText('84920')}
                className="hover:text-primary transition-colors cursor-pointer"
                title="复制房号"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
            </div>

            <nav className="flex items-center gap-3 text-xs font-bold text-on-surface-variant ml-2">
              <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate('/lobby')}>Lobby</span>
              <span className="hover:text-on-surface cursor-pointer">Leaderboard</span>
              <span className="hover:text-on-surface cursor-pointer">How to Play</span>
            </nav>
          </div>

          {/* Center Round & Urgency Timer */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-surface-container-high text-primary font-bold text-xs">
              第 2/5 轮 · 画手回合
            </div>
            <div className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-error-container text-secondary font-black text-sm shadow-xs border border-secondary/20">
              <span className="material-symbols-outlined text-[16px] animate-pulse">timer</span>
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* Right Voice Status & Controls */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-surface-container text-on-surface px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>4人在连麦</span>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title={isMuted ? '开麦' : '静音'}
            >
              <span className="material-symbols-outlined text-[18px]">{isMuted ? 'mic_off' : 'mic'}</span>
            </button>

            <button
              type="button"
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title="设置"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-primary transition-colors cursor-pointer"
              title="全屏模式"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/room/room_idavoll_demo')}
              className="px-3 py-1.5 rounded-full border border-error/30 text-error hover:bg-error-container text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ml-1"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              <span>Exit Room</span>
            </button>
          </div>
        </header>

        {/* Sub-Header Prompt Banner */}
        <div className="h-12 px-6 bg-surface-container-low border-b border-surface-container flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-primary text-on-primary font-black text-xs shadow-xs">
              🎨 你是画手·正在作画
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-on-surface-variant">当前题目:</span>
              <span className="text-base font-black text-primary px-3 py-0.5 rounded-lg bg-surface-container-lowest border border-primary/20 tracking-wider">
                【 {currentWord} 】
              </span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-xs">
              分类: 游乐场设施 · 4个字
            </span>

            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-tertiary">lightbulb</span>
              提示技巧: 描绘帐篷顶部与上下起伏的木马立柱
            </span>
          </div>

          <button
            type="button"
            onClick={handleRerollWord}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-highest hover:bg-primary hover:text-white text-primary text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[14px]">autorenew</span>
            <span>换词 (剩余1次)</span>
          </button>
        </div>

        {/* 3-Column Desktop Body Stage */}
        <div className="flex-1 min-h-0 flex overflow-hidden p-3 gap-3">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Player Roster & Leaderboard                   */}
          {/* ========================================================= */}
          <aside className="w-64 xl:w-72 shrink-0 bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between p-3 overflow-hidden">
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 border-b border-surface-container">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">leaderboard</span>
                  <h4 className="font-label-md text-sm font-black text-on-surface">玩家榜单</h4>
                </div>
                <span className="text-[11px] font-bold text-outline">4 / 8 人已加入</span>
              </div>

              {/* Roster Cards Stream */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scroll">
                {/* 1. Aya (Winner) */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-tertiary-fixed-dim/60 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <img className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-400" alt="阿雅" src="https://api.dicebear.com/7.x/bottts/svg?seed=Aya" />
                      <span className="absolute -top-1 -right-1 text-xs">👑</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-on-surface truncate">阿雅 (Aya)</span>
                        <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-700 font-bold">第1名</span>
                      </div>
                      <span className="text-[10px] text-tertiary font-bold">已猜中答案 (+100分)</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-primary">100</div>
                    <span className="text-[9px] text-outline">总积分</span>
                  </div>
                </div>

                {/* 2. Self (Drawer) */}
                <div className="p-2 rounded-xl bg-primary-fixed/30 border-2 border-primary flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <img className="w-8 h-8 rounded-full object-cover ring-2 ring-primary" alt="小明" src="https://api.dicebear.com/7.x/bottts/svg?seed=XiaoMing" />
                      <span className="absolute -bottom-1 -right-1 bg-primary text-white text-[8px] px-1 rounded-full font-bold">画</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-primary truncate">小明 (我)</span>
                        <span className="text-[9px] px-1 rounded bg-primary text-white font-bold">当前画手</span>
                      </div>
                      <span className="text-[10px] text-primary font-bold">正在创作中...</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-primary">65</div>
                    <span className="text-[9px] text-outline">本局得分</span>
                  </div>
                </div>

                {/* 3. HaoHao */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-variant" alt="浩浩" src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-on-surface truncate">浩浩</span>
                        <span className="text-[9px] text-outline font-bold">#3</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant">疯狂猜测中...</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-on-surface">40</div>
                    <span className="text-[9px] text-outline">分</span>
                  </div>
                </div>

                {/* 4. TangTang */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-variant" alt="糖糖" src="https://api.dicebear.com/7.x/bottts/svg?seed=TangTang" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-on-surface truncate">糖糖</span>
                        <span className="text-[9px] text-outline font-bold">#4</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant">即将猜中...</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-on-surface">20</div>
                    <span className="text-[9px] text-outline">分</span>
                  </div>
                </div>

                {/* Empty slots */}
                <div className="p-2.5 rounded-xl border border-dashed border-outline-variant/80 text-center text-xs font-bold text-outline flex items-center justify-center gap-1 hover:border-primary transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>空闲席位 · 邀请好友</span>
                </div>
              </div>
            </div>

            {/* Bottom Invite & Voice Footer */}
            <div className="pt-2 border-t border-surface-container flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + '/room/room_idavoll_demo');
                  alert('房间邀请链接已复制到剪贴板！');
                }}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>Invite Friend (邀请好友)</span>
              </button>
              <div className="flex items-center justify-between text-[10px] text-outline px-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  麦克风状态: 正常
                </span>
                <span className="text-primary cursor-pointer hover:underline" onClick={toggleMute}>
                  {isMuted ? '点击取消静音' : '连线静音'}
                </span>
              </div>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* CENTER COLUMN: Large Expansive Canvas Stage & Dock Toolbar */}
          {/* ========================================================= */}
          <main className="flex-1 min-w-0 flex flex-col justify-between gap-3 overflow-hidden">
            {/* The Canvas Card */}
            <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-2xl border border-surface-container shadow-md relative overflow-hidden flex flex-col justify-between">
              {/* Floating Top Notification Pill */}
              <div className="absolute top-3 left-4 z-20 flex items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 text-white font-bold text-xs shadow-md backdrop-blur-md">
                  <span className="material-symbols-outlined text-[15px]">celebration</span>
                  <span>阿雅 (Aya) 猜中了答案！获得 +100分</span>
                  <span className="bg-white/25 text-[10px] px-1.5 rounded-full font-black">首中</span>
                </div>
              </div>

              {/* Canvas Action Bar Top Right */}
              <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 bg-surface-container-lowest/90 backdrop-blur-md p-1 rounded-full border border-surface-container shadow-sm">
                <button type="button" className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface">
                  <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                </button>
                <span className="text-[11px] font-bold text-outline px-1">100%</span>
                <button type="button" className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface">
                  <span className="material-symbols-outlined text-[16px]">zoom_out</span>
                </button>
                <div className="w-px h-3.5 bg-outline-variant"></div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-primary hover:bg-surface-container"
                  title="全屏画布"
                >
                  <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                </button>
              </div>

              {/* Real Interactive Canvas 2D */}
              <div className="w-full h-full relative flex items-center justify-center bg-white cursor-crosshair overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413FD6 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                ></div>

                <DrawBoard
                  strokes={currentStrokes}
                  onStrokeComplete={(stroke) => addStroke(stroke)}
                  currentColor={currentColor}
                  currentSize={currentSize}
                  isEraser={isEraser}
                  isDrawer={true}
                  width={1400}
                  height={900}
                  className="w-full h-full border-0 rounded-none z-10"
                />
              </div>

              {/* Canvas Bottom Latency Indicator */}
              <div className="px-4 py-1 bg-surface-container-low/80 backdrop-blur-xs border-t border-surface-container flex items-center justify-between text-[11px] text-outline">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">draw</span>
                  <span className="text-on-surface-variant font-bold">作画同步中 · 延迟 18ms</span>
                </div>
                <span>双击清屏 · 快捷键 Ctrl+Z 撤销</span>
              </div>
            </div>

            {/* Desktop Full Tool & Color Palette Dock */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-md p-3 flex flex-col gap-2 shrink-0">
              {/* Upper Tools Row */}
              <div className="flex items-center justify-between gap-3">
                {/* Drawing Tool Toggles */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEraser(false)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      !isEraser ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">brush</span>
                    <span>画笔</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEraser(false)}
                    className="px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>毛笔</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleClear()}
                    className="px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="油漆桶清屏"
                  >
                    <span className="material-symbols-outlined text-[16px]">format_color_fill</span>
                    <span>油漆桶</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEraser(true)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      isEraser ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">ink_eraser</span>
                    <span>橡皮</span>
                  </button>
                </div>

                {/* Stroke Size Selector */}
                <div className="flex items-center gap-2 bg-surface-container px-3 py-1 rounded-full">
                  <span className="text-[11px] font-bold text-outline">笔触:</span>
                  <button
                    type="button"
                    onClick={() => setCurrentSize(3)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                      currentSize <= 4 ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
                    }`}
                    title="细笔触"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSize(7)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                      currentSize > 4 && currentSize <= 10 ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
                    }`}
                    title="中笔触"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-current"></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSize(14)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                      currentSize > 10 && currentSize <= 18 ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
                    }`}
                    title="粗笔触"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-current"></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSize(24)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                      currentSize > 18 ? 'bg-primary text-white' : 'text-outline hover:text-on-surface'
                    }`}
                    title="特粗笔触"
                  >
                    <span className="w-4 h-4 rounded-full bg-current"></span>
                  </button>
                </div>

                {/* Undo / Redo / Clear Tools */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface flex items-center justify-center cursor-pointer transition-colors"
                    title="撤销"
                  >
                    <span className="material-symbols-outlined text-[18px]">undo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRedo}
                    className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface flex items-center justify-center cursor-pointer transition-colors"
                    title="重做"
                  >
                    <span className="material-symbols-outlined text-[18px]">redo</span>
                  </button>

                  <div className="w-px h-4 bg-outline-variant my-auto"></div>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1.5 rounded-full bg-error-container hover:bg-error/20 text-error text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="清空画布"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    <span>清空画布</span>
                  </button>
                </div>
              </div>

              {/* Lower Color Swatches Palette Grid */}
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-surface-container">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-bold text-outline mr-1">调色板:</span>
                  {desktopColorSwatches.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setCurrentColor(color);
                        setIsEraser(false);
                      }}
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                        color === '#FFFFFF' ? 'border border-outline-variant' : ''
                      } ${currentColor === color && !isEraser ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-xs' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    >
                      {currentColor === color && !isEraser && (
                        <span className={`w-1.5 h-1.5 rounded-full ${color === '#FFFFFF' ? 'bg-primary' : 'bg-white'}`} />
                      )}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface hover:bg-surface-variant text-xs font-bold cursor-pointer transition-colors shrink-0">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                      setCurrentColor(e.target.value);
                      setIsEraser(false);
                    }}
                    className="opacity-0 absolute w-0 h-0"
                  />
                  <span className="material-symbols-outlined text-[15px]">palette</span>
                  <span>更多色彩</span>
                </label>
              </div>
            </div>
          </main>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Real-time Live Guessing Feed & Chat         */}
          {/* ========================================================= */}
          <aside className="w-80 xl:w-88 shrink-0 bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between p-3 overflow-hidden">
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
              {/* Header Tabs */}
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-full">
                  <button
                    type="button"
                    onClick={() => setDesktopChatTab('guess')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      desktopChatTab === 'guess' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    猜词动态
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopChatTab('chat')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      desktopChatTab === 'chat' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    房间闲聊
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-outline font-bold">弹幕</span>
                  <button
                    type="button"
                    onClick={() => setIsDanmakuOn(!isDanmakuOn)}
                    className={`w-8 h-4.5 rounded-full transition-colors cursor-pointer relative ${
                      isDanmakuOn ? 'bg-primary' : 'bg-surface-container'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      isDanmakuOn ? 'left-4' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Pinned Info */}
              <div className="px-2.5 py-1.5 rounded-xl bg-surface-container-low text-[11px] font-bold text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">timer</span>
                <span>笔画倒计时！由 小明 (我) 作画，其他玩家进行猜词</span>
              </div>

              {/* Chat / Guesses Feed */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scroll text-xs">
                {/* 1. Wrong Guess */}
                <div className="flex items-start gap-2">
                  <img className="w-6 h-6 rounded-full object-cover shrink-0" alt="浩浩" src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] text-outline">
                      <span className="font-bold text-on-surface-variant">浩浩</span>
                      <span>32秒前</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-xl mt-0.5 text-on-surface font-semibold">
                      <span>碰碰车</span>
                      <span className="text-error font-bold text-[10px]">❌ 不对哦</span>
                    </div>
                  </div>
                </div>

                {/* 2. Close Guess */}
                <div className="flex items-start gap-2">
                  <img className="w-6 h-6 rounded-full object-cover shrink-0" alt="糖糖" src="https://api.dicebear.com/7.x/bottts/svg?seed=TangTang" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] text-outline">
                      <span className="font-bold text-on-surface-variant">糖糖</span>
                      <span>30秒前</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-secondary-fixed/30 border border-secondary/20 px-2.5 py-1 rounded-xl mt-0.5 text-secondary font-semibold">
                      <span>游乐园</span>
                      <span className="font-bold text-[10px]">⚠️ 十分接近了！</span>
                    </div>
                  </div>
                </div>

                {/* 3. Another wrong guess */}
                <div className="flex items-start gap-2">
                  <img className="w-6 h-6 rounded-full object-cover shrink-0" alt="浩浩" src="https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] text-outline">
                      <span className="font-bold text-on-surface-variant">浩浩</span>
                      <span>28秒前</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-xl mt-0.5 text-on-surface font-semibold">
                      <span>摩天轮</span>
                      <span className="text-error font-bold text-[10px]">❌ 不对哦</span>
                    </div>
                  </div>
                </div>

                {/* 4. Correct Guess Celebratory Card */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎉</span>
                    <div>
                      <div className="font-black text-on-surface">阿雅 (Aya) 回答正确！</div>
                      <div className="text-[10px] text-tertiary font-bold">用时 38秒 · 获得本轮首中奖励</div>
                    </div>
                  </div>
                  <span className="text-sm font-black text-tertiary font-mono">+100分</span>
                </div>

                {/* 5. Painter hint bubble */}
                <div className="p-2 rounded-xl bg-primary text-white ml-4 flex flex-col gap-0.5 shadow-xs">
                  <div className="flex items-center justify-between text-[9px] text-white/80">
                    <span className="font-black">小明 (画手)</span>
                    <span>12秒前</span>
                  </div>
                  <div className="text-xs font-semibold">
                    注意看中间那几根立柱和顶棚哦！马上就有人猜中~ 🎠
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Quick Reaction & Danmaku Input */}
            <div className="pt-2 border-t border-surface-container flex flex-col gap-1.5 shrink-0">
              {/* Quick Tags */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['👏 画得太准了！', '👀 快看看我的眼神', '🔥 破案了'].map((phrase) => (
                  <button
                    key={phrase}
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
                          content: phrase,
                          senderNickname: nickname,
                          senderAvatar: avatar,
                          isDanmaku: true,
                        },
                      });
                    }}
                    className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface-variant whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* Chat Form */}
              <form onSubmit={handleSendDanmaku} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={danmakuInput}
                  onChange={(e) => setDanmakuInput(e.target.value)}
                  placeholder="作为画手发弹幕提示线索..."
                  className="flex-1 bg-surface-container-low border border-outline-variant/60 rounded-full px-3 py-2 text-xs font-semibold text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!danmakuInput.trim()}
                  className="w-8 h-8 rounded-full bg-primary hover:bg-primary-container text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer disabled:opacity-40 transition-colors"
                  title="发送"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>

      {/* Reusable InGameChatDrawer for Mobile */}
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
