import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';
import { AppIcon } from '../components/common/AppIcon';
import { DrawBoard, InGameChatDrawer, DanmakuOverlay, InGameBottomBar, QuickPhraseItem } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';
import { toggleMute, toggleDeafen, setVoiceMode, holdToTalk } from '../services/voice';
import { leaveRoom } from '../services/room-session';
import { useVoiceLabels } from '../hooks/useVoiceLabels';
import { useSpacePushToTalk } from '../hooks/useSpacePushToTalk';

export const InGameGuesserPage: React.FC = () => {
  const { t } = useTranslation();
  const { chatDrawerLabels, bottomBarLabels } = useVoiceLabels();
  const navigate = useNavigate();

  const { id: userId, nickname, avatar } = useUserStore();
  const {
    room,
    messages,
    danmakus,
    sendMessage,
    isMuted,
    isDeafened,
    voiceMode,
    voiceStatus,
    voiceError,
    speakingUserIds,
  } = useRoomStore();

  const {
    gameState,
    submitGuess,
    guessResult,
  } = useGameStore();

  const [guessInput, setGuessInput] = useState('');
  const [inputMode, setInputMode] = useState<'guess' | 'chat'>('guess');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isDanmakuOn, setIsDanmakuOn] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; delay: number }[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Global Spacebar push-to-talk handler on desktop
  useSpacePushToTalk(voiceMode === 'hold', holdToTalk);

  // Localized quick phrases for chat drawer
  const guesserQuickPhrases = useMemo<QuickPhraseItem[]>(
    () => [
      { icon: '👍', text: t('inGame.quickPillAwesome', '太神了') },
      { icon: '💡', text: t('inGame.quickPillHint', '求提示') },
      { icon: '🤔', text: t('inGame.quickPillHard', '有点难') },
      { icon: '🎨', text: t('inGame.quickPillArtist', '灵魂画手') },
      { icon: '🔥', text: t('inGame.quickPillGo', '冲冲冲') },
    ],
    [t]
  );

  // Trigger celebration on correct guess
  useEffect(() => {
    if (guessResult?.correct) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [guessResult?.correct, guessResult?.timestamp]);

  // Loading state
  if (!room || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4 select-none">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <h2 className="text-xl font-bold text-on-surface">{t('inGame.loadingRoom', '正在同步游戏状态...')}</h2>
        <p className="text-xs text-outline">{t('inGame.loadingHint', '如果长时间未加载，请尝试返回大厅')}</p>
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            navigate('/lobby');
          }}
          className="px-4 py-2 rounded-full bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
        >
          {t('inGame.backToLobby', '返回大厅')}
        </button>
      </div>
    );
  }

  const strokes = gameState.strokes || [];
  const roomCode = room.roomCode;
  const currentRound = gameState.currentRound || room.currentRound || 1;
  const totalRounds = gameState.totalRounds || room.settings?.totalRounds || 3;
  const timeLeft = gameState.timeLeft ?? 0;
  const drawerNickname = gameState.drawerNickname || '';
  const wordCategory = gameState.wordCategory || '';
  const wordLength = gameState.currentWordLength || 0;
  const wordHint = gameState.wordHint || '';
  const isSelectingWord = gameState.status === 'selecting_word';
  const players = room.players || [];

  // Determine if current user has guessed correctly
  const myScoreItem = gameState.scores?.find((s) => s.playerId === userId);
  const hasGuessedCorrect =
    (myScoreItem?.hasGuessedCorrectly ?? false) || (guessResult?.correct ?? false);

  const scoresMap = new Map(gameState.scores?.map((s) => [s.playerId, s]) || []);

  const effectiveMode = hasGuessedCorrect ? 'chat' : inputMode;

  const handleInputSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = guessInput.trim();
    if (!text) return;

    if (effectiveMode === 'guess' && !hasGuessedCorrect) {
      submitGuess(text);
    } else {
      sendMessage(text, true);
    }
    setGuessInput('');
  };

  const handleSendReaction = (emoji: string) => {
    sendMessage(emoji, true);
    const newEmoji = { id: `${Date.now()}-${Math.random()}`, emoji, delay: 0 };
    setFloatingEmojis((prev) => [...prev.slice(-8), newEmoji]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newEmoji.id));
    }, 2800);
  };

  const handleCopyCode = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      });
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/lobby');
  };

  // Determine character slots (revealing hint character if available)
  const firstChar = wordHint ? wordHint.replace(/^[^\w\u4e00-\u9fa5]*/, '').slice(0, 1) : '';
  const slots = wordLength > 0
    ? Array.from({ length: wordLength }).map((_, idx) => (idx === 0 && firstChar ? firstChar : '_'))
    : [];

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-on-surface select-none font-body-md antialiased flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : ''
      }`}
    >
      {/* =========================================================================
          1. MOBILE VIEWPORT CONTAINER (< lg: 1024px) - 100% Match to playhub/code.html
         ========================================================================= */}
      <div className="lg:hidden w-full h-full flex justify-center items-center overflow-hidden">
        <main
          className={`w-full ${
            isFullscreen ? 'max-w-none h-full' : 'max-w-[390px] h-full max-h-[844px]'
          } flex flex-col justify-between bg-surface shadow-2xl relative overflow-hidden select-none`}
        >
          {/* TOP BAR / GAME HUD */}
          <header className="w-full bg-surface-container-lowest px-3 pt-2 pb-1.5 shadow-xs flex flex-col gap-1 shrink-0 z-20">
            {/* Upper Status Row */}
            <div className="flex items-center justify-between">
              {/* Room & Round Chips & Identity Badge */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="tactile-btn flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant cursor-pointer"
                  title={t('inGame.copyRoomCode', '点击复制房号')}
                >
                  <AppIcon name="tag" className="w-3.5 h-3.5 text-primary" />
                  <span className="font-label-sm text-[12px] font-bold tracking-tight">
                    {roomCode} {copiedCode ? '✓' : ''}
                  </span>
                </button>
                <span className="text-[11px] font-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
                  {t('inGame.turnNumGuesser', { current: currentRound, total: totalRounds, defaultValue: `第 ${currentRound}/${totalRounds} 轮` })}
                </span>
                {/* Identity Badge: Guesser */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-bold">
                  <AppIcon name="visibility" className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-label-sm">{t('inGame.guesserRole', '猜题者')}</span>
                </div>
              </div>

              {/* Timer & Top Controls */}
              <div className="flex items-center gap-1.5">
                {/* Circular Countdown Timer */}
                <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-error-container text-secondary font-extrabold text-[12px] shadow-xs">
                  <div className="absolute inset-0 rounded-full border-2 border-secondary-container timer-ring"></div>
                  <span>{timeLeft}s</span>
                </div>
                {/* Utility Icons */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setIsRulesOpen(true)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                    title={t('gameDetail.overviewTitle', '房间规则')}
                    aria-label={t('gameDetail.overviewTitle', '房间规则')}
                  >
                    <AppIcon name="help" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChatDrawerOpen(true)}
                    className="relative w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                    title={t('inGame.chatAndVoice', '聊天抽屉')}
                    aria-label={t('inGame.chatAndVoice', '聊天抽屉')}
                  >
                    <AppIcon name="chat" className="w-4 h-4" />
                    {messages.length > 0 && (
                      <span className="absolute 0 0 w-2 h-2 rounded-full bg-secondary"></span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 text-on-surface-variant cursor-pointer"
                    title={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenDanmaku', '全屏')}
                    aria-label={isFullscreen ? t('inGame.exitFullscreen', '退出全屏') : t('inGame.fullscreenDanmaku', '全屏')}
                  >
                    <AppIcon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLeave}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-error-container active:scale-95 text-error cursor-pointer"
                    title={t('inGame.exitRoom', '退出房间')}
                    aria-label={t('inGame.exitRoom', '退出房间')}
                  >
                    <AppIcon name="logout" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Player Seats Row (Horizontal Mini Seats) */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/60 px-0.5 overflow-x-auto no-scrollbar gap-1">
              {players.map((p) => {
                const isSpeaking = speakingUserIds.includes(p.id);
                const scoreItem = scoresMap.get(p.id);
                const scoreVal = scoreItem?.score ?? p.score;
                const isMe = p.id === userId;
                const isDrawer = p.id === gameState.drawerId;
                const hasCorrect = scoreItem?.hasGuessedCorrectly;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full shrink-0 border shadow-xs ${
                      isDrawer
                        ? 'bg-primary-fixed border-primary/20'
                        : hasCorrect
                        ? 'bg-surface-container-low border-tertiary-fixed-dim/40'
                        : isMe
                        ? 'bg-surface-container border-primary-container'
                        : 'bg-surface-container-low border-surface-container'
                    }`}
                  >
                    <div className="relative w-5 h-5 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-[10px] font-bold overflow-hidden">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.nickname} className="w-full h-full object-cover" />
                      ) : (
                        p.nickname.slice(0, 1)
                      )}
                      {isDrawer && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-secondary-container text-on-primary flex items-center justify-center shadow-xs">
                          <AppIcon name="edit" className="w-2 h-2 pencil-anim" />
                        </span>
                      )}
                      {hasCorrect && !isDrawer && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-xs">
                          <AppIcon name="check" className="w-2 h-2" />
                        </span>
                      )}
                      {isSpeaking && (
                        <span className="absolute inset-0 rounded-full ring-2 ring-emerald-500 animate-pulse"></span>
                      )}
                    </div>
                    <div className="flex flex-col leading-none">
                      <div className="flex items-center gap-1">
                        <span className="font-label-sm text-[11px] font-bold text-on-surface truncate max-w-[36px]">
                          {isMe ? `${p.nickname} (你)` : p.nickname}
                        </span>
                        <span
                          className={`text-[8px] px-1 rounded-full font-bold ${
                            isDrawer
                              ? 'bg-primary-container text-on-primary-container'
                              : hasCorrect
                              ? 'text-tertiary'
                              : 'bg-surface-variant text-primary'
                          }`}
                        >
                          {isDrawer ? '作画' : hasCorrect ? '已猜对' : '待猜'}
                        </span>
                      </div>
                      <span className="text-[9px] font-body-sm font-bold text-on-surface-variant">
                        {scoreVal}分
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </header>

          {/* SECRET WORD HINT CARD (Guesser Perspective Banner) */}
          <section className="mx-3 mt-1.5 bg-gradient-to-r from-primary/10 via-surface-container-high to-surface-variant rounded-xl px-2.5 py-1.5 flex items-center justify-between border border-primary/15 shadow-xs shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] font-bold">
                  <AppIcon name="lightbulb" className="w-3.5 h-3.5" />
                  {t('inGame.hintCategory', '提示分类')}
                </span>
                <span className="font-label-md text-label-md font-extrabold text-primary tracking-tight">
                  {isSelectingWord
                    ? t('inGame.drawerSelectingWord', '画手正在挑选词语...')
                    : `${wordCategory ? `${wordCategory} · ` : ''}${wordLength > 0 ? t('inGame.wordCharsDesktop', { length: wordLength, defaultValue: `${wordLength}个字` }) : ''}`}
                </span>
              </div>
              {/* Word Blanks & Partial Clue */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-body-sm font-label-sm text-on-surface-variant font-bold">{t('inGame.wordSlots', '字数卡槽：')}</span>
                <div className="flex items-center gap-1">
                  {isSelectingWord || slots.length === 0 ? (
                    <span className="text-xs font-bold text-secondary animate-pulse">
                      {t('inGame.drawerSelectingWord', '画手正在挑选词语...')}
                    </span>
                  ) : (
                    slots.map((char, idx) => (
                      <div
                        key={idx}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black shadow-xs ${
                          char !== '_'
                            ? 'bg-primary-container text-on-primary-container text-[16px] ring-2 ring-primary/30'
                            : 'bg-surface-container-lowest border-2 border-dashed border-outline-variant text-outline text-sm'
                        }`}
                      >
                        {char}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* Action: Hint Help */}
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  sendMessage('申请提示 💡', false);
                }}
                className="tactile-btn px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container shadow-xs border border-primary/20 flex items-center gap-1 cursor-pointer"
              >
                <AppIcon name="tips_and_updates" className="w-3.5 h-3.5 text-secondary-container" />
                <span className="text-[11px] font-label-sm font-bold">{t('inGame.requestHint', '申请提示')}</span>
              </button>
              <span className="text-[10px] text-on-surface-variant">
                {wordHint ? t('inGame.revealedClue', { clue: wordHint }) : t('inGame.hintLocked', '提示未解锁')}
              </span>
            </div>
          </section>

          {/* LIVE DRAWING CANVAS (Spectator View with Live Art) */}
          <section className="mx-3 mt-1.5 flex flex-col relative shrink-0">
            <div className="w-full h-[190px] bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden relative flex flex-col justify-between">
              {/* Canvas Status & Floating Controls Overlay */}
              <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
                {/* Live Painter Indicator */}
                <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-inverse-surface/80 backdrop-blur-xs text-inverse-on-surface shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-ping"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-container -ml-3"></span>
                  <span className="text-[11px] font-label-sm">
                    {drawerNickname || '画手'} 正在实时作画中...
                  </span>
                </div>
                {/* Canvas Action Tools */}
                <div className="pointer-events-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="w-6 h-6 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs shadow-xs flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 cursor-pointer"
                    title={t('inGame.fullscreenDanmaku', '全屏查看')}
                    aria-label={t('inGame.fullscreenDanmaku', '全屏查看')}
                  >
                    <AppIcon name="fullscreen" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* The Live Canvas Drawing Area */}
              <div className="w-full h-full relative flex items-center justify-center bg-white overflow-hidden">
                {/* Subtle Grid Texture for Drawing Paper Feel */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413fd6 0.8px, transparent 0.8px)',
                    backgroundSize: '14px 14px',
                  }}
                />

                {/* Danmaku Overlay */}
                <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

                {/* Real Live Canvas */}
                <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none">
                  <DrawBoard
                    strokes={strokes}
                    isDrawer={false}
                    width={800}
                    height={600}
                    className="w-full h-full aspect-[4/3] max-w-[800px] max-h-[600px] rounded-lg border-0 shadow-none pointer-events-none"
                  />
                </div>

                {/* Floating Cheers / Reaction Emojis */}
                {floatingEmojis.map((item) => (
                  <div
                    key={item.id}
                    className="absolute bottom-5 right-6 pointer-events-none flex flex-col items-center"
                  >
                    <span className="emoji-float text-2xl select-none">{item.emoji}</span>
                  </div>
                ))}

                {hasGuessedCorrect && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 animate-bounce pointer-events-none">
                    <span>🎉 恭喜！你已猜中正确答案</span>
                  </div>
                )}
              </div>

              {/* Canvas Footer: Quick Reactions Bar Overlay */}
              <div className="w-full bg-surface-container-low/95 px-2.5 py-1 flex items-center justify-between border-t border-surface-container shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-label-sm text-outline font-bold">画板反应:</span>
                  <button
                    type="button"
                    onClick={() => handleSendReaction('👏 棒')}
                    className="tactile-btn px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-[11px] shadow-xs cursor-pointer"
                  >
                    👏 棒
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendReaction('😂 抽象')}
                    className="tactile-btn px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-[11px] shadow-xs cursor-pointer"
                  >
                    😂 抽象
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendReaction('❤️ 懂了')}
                    className="tactile-btn px-2 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-[11px] shadow-xs cursor-pointer"
                  >
                    ❤️ 懂了
                  </button>
                </div>
                <span className="text-[10px] font-label-sm font-bold text-primary">实时笔画同步中</span>
              </div>
            </div>
          </section>

          {/* LIVE CHAT & GUESS FEED (中间历史记录区域) */}
          <section className="mx-3 my-1.5 flex-1 min-h-0 bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-surface-container flex flex-col justify-between overflow-hidden">
            {/* Feed Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-high/60 shrink-0">
              <div className="flex items-center gap-1.5">
                <AppIcon name="forum" className="w-4 h-4 text-primary" />
                <span className="font-label-sm text-[12px] font-bold text-on-surface">实时竞猜与动态</span>
              </div>
              <span className="text-[10px] font-label-sm text-outline">答案保护已开启（防剧透）</span>
            </div>

            {/* Scrollable Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-2 py-1.5 pr-1 custom-scroll text-[13px]">
              {/* System Clue Alert */}
              {wordHint && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container-low text-on-surface-variant text-[11px] border-l-2 border-primary">
                  <AppIcon name="auto_awesome" className="w-3.5 h-3.5 text-primary" />
                  <span>
                    系统：画手 <strong className="text-primary">{drawerNickname || '画手'}</strong> 公布了线索「
                    <strong className="text-primary">{wordHint}</strong>」
                  </span>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-outline font-medium">
                  暂无猜词记录，大家的猜测将显示于此
                </div>
              ) : (
                messages.map((m) => {
                  const isCorrect = m.payload.type === 'correct_guess';
                  const isMe = m.senderId === userId;
                  const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  if (isCorrect) {
                    return (
                      <div
                        key={m.payload.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim text-on-tertiary-fixed"
                      >
                        <span className="text-[14px]">🎉</span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="font-bold font-label-sm">
                            {t('inGame.systemPrefix', '系统：')}{m.payload.senderNickname} {isMe ? t('voice.me', '(我)') : ''}
                          </span>
                          <span className="text-[12px]">{t('inGame.guessedCorrectlyShort', '猜中了！')}</span>
                        </div>
                        <span className="font-extrabold text-[11px] text-tertiary px-1.5 py-0.5 rounded-md bg-tertiary-fixed/40">
                          ✓
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={m.payload.id} className="flex items-start gap-1.5">
                      <span
                        className={`font-bold text-label-sm shrink-0 ${
                          isMe ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {m.payload.senderNickname} {isMe ? '(你)' : ''}:
                      </span>
                      <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full text-on-surface font-body-sm text-[12px]">
                        <span>{m.payload.content}</span>
                        {m.payload.type === 'guess' ? (
                          <span className="text-error font-bold text-[11px] flex items-center gap-0.5">
                            <AppIcon name="close" className="w-3 h-3" /> 不对
                          </span>
                        ) : m.payload.isDanmaku ? (
                          <span className="text-secondary font-bold text-[10px] flex items-center">
                            <AppIcon name="chat" className="w-3 h-3" />
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] text-outline ml-auto self-center">{timeStr}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Interaction / Feedback Phrase Pills */}
            <div className="pt-1.5 border-t border-surface-container-high/60 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              {[
                { key: 'awesome', text: t('inGame.quickPillAwesome', '👍 太神了') },
                { key: 'hint', text: t('inGame.quickPillHint', '💡 求提示') },
                { key: 'hard', text: t('inGame.quickPillHard', '🤔 有点难') },
                { key: 'artist', text: t('inGame.quickPillArtist', '🎨 灵魂画手') },
                { key: 'go', text: t('inGame.quickPillGo', '🔥 冲冲冲') },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => sendMessage(pill.text, true)}
                  className="tactile-btn px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-[11px] font-bold shrink-0 hover:bg-surface-variant cursor-pointer"
                >
                  {pill.text}
                </button>
              ))}
            </div>
          </section>

          {/* GUESS INPUT & INTERACTION CORE BAR (底部黄金触控交互区) */}
          <footer className="w-full bg-surface-container-lowest px-3 pt-2 pb-3 shadow-lg border-t border-surface-container shrink-0 z-30">
            <InGameBottomBar
              value={guessInput}
              onChange={setGuessInput}
              onSubmit={handleInputSubmit}
              showModeToggle={true}
              mode={effectiveMode}
              onToggleMode={() => setInputMode((m) => (m === 'guess' ? 'chat' : 'guess'))}
              hasGuessedCorrect={hasGuessedCorrect}
              showDanmakuToggle={true}
              isDanmakuOn={isDanmakuOn}
              onToggleDanmaku={() => setIsDanmakuOn((p) => !p)}
              placeholder={
                hasGuessedCorrect
                  ? guessResult?.earned
                    ? t('inGame.guessedChatPlaceholderWithScore', { score: guessResult.earned, defaultValue: `已猜中 (+${guessResult.earned}分)！发条消息互动...` })
                    : t('inGame.guessedChatPlaceholder', '已猜中！发条消息互动...')
                  : effectiveMode === 'guess'
                  ? t('inGame.guessInputPlaceholder', '输入你猜测的词语（按 Enter 立即抢答）...')
                  : t('inGame.chatInputPlaceholder', '输入聊天消息（按 Enter 发送）...')
              }
              sendLabel={
                effectiveMode === 'guess' && !hasGuessedCorrect
                  ? t('inGame.submitGuessBtn', '抢答提交')
                  : t('inGame.sendChat', '发消息')
              }
              showVoiceButton={true}
              voiceMode={voiceMode}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onHoldToTalk={(pressed) => holdToTalk(pressed)}
              isSpeaking={!isMuted}
              leftSlot={
                <div className="flex items-center gap-1">
                  {/* Rank & Scoreboard Modal Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="tactile-btn flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container shadow-2xs cursor-pointer text-xs font-bold"
                  >
                    <AppIcon name="leaderboard" className="w-3.5 h-3.5 text-secondary-container" />
                    <span className="hidden xs:inline">{t('inGame.leaderboard', '积分榜')}</span>
                  </button>
                  {/* Quick Reaction Trigger */}
                  <button
                    type="button"
                    onClick={() => handleSendReaction('🔥')}
                    className="tactile-btn px-2 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container flex items-center justify-center shadow-2xs cursor-pointer text-xs"
                    title={t('inGame.quickReaction', '快速喝彩')}
                    aria-label={t('inGame.quickReaction', '快速喝彩')}
                  >
                    <span>🔥</span>
                  </button>
                </div>
              }
              labels={{
                ...bottomBarLabels,
                sendAria:
                  effectiveMode === 'guess' && !hasGuessedCorrect
                    ? t('inGame.submitGuessBtn', '抢答提交')
                    : t('inGame.sendChat', '发消息'),
                clearAria: t('chat.clear', '清空'),
              }}
            />
          </footer>
        </main>
      </div>

      {/* =========================================================================
          2. DESKTOP VIEWPORT CONTAINER (>= lg: 1024px) - PlayHub Responsive Grid
         ========================================================================= */}
      <div className="hidden lg:flex flex-col w-full h-full bg-surface overflow-hidden">
        {/* DESKTOP TOP BAR / GAME HUD */}
        <header className="w-full bg-surface-container-lowest px-6 py-2.5 border-b border-surface-container shadow-xs flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black">
                🔍
              </div>
              <span className="font-headline-sm text-lg font-black text-on-surface">PlayHub</span>
            </div>
            <div className="h-4 w-[1px] bg-outline-variant/60"></div>

            {/* Room Tag Chip */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="tactile-btn flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant cursor-pointer"
              title="点击复制房号"
            >
              <AppIcon name="tag" className="w-4 h-4 text-primary" />
              <span className="font-label-sm text-xs font-bold tracking-tight">
                #{roomCode} {copiedCode ? '✓' : ''}
              </span>
            </button>

            <span className="text-xs font-label-sm px-3 py-1 rounded-full bg-surface-container-high text-primary font-bold">
              {t('inGame.turnNumGuesser', { current: currentRound, total: totalRounds, defaultValue: `第 ${currentRound}/${totalRounds} 轮 · 竞猜进行中` })}
            </span>

            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-highest text-primary font-bold text-xs">
              <AppIcon name="visibility" className="w-4 h-4" />
              <span>猜题者</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Circular Countdown Timer */}
            <div className="flex items-center gap-2 bg-error-container text-secondary font-black px-3 py-1 rounded-full shadow-xs">
              <AppIcon name="timer" className="w-4 h-4 animate-pulse" />
              <span className="font-headline-sm text-sm">{timeLeft}s 倒计时</span>
            </div>

            {/* Push to talk voice */}
            <button
              type="button"
              aria-label={
                voiceMode === 'hold'
                  ? !isMuted
                    ? t('voice.releaseToMuteAria', '松开静音')
                    : t('voice.holdToTalkAria', '按住说话')
                  : isMuted
                  ? t('voice.unmuteAria', '开麦')
                  : t('voice.muteAria', '静音')
              }
              {...(voiceMode === 'hold'
                ? {
                    onPointerDown: (e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      holdToTalk(true);
                    },
                    onPointerUp: (e) => {
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch {}
                      holdToTalk(false);
                    },
                    onPointerCancel: () => holdToTalk(false),
                    onLostPointerCapture: () => holdToTalk(false),
                    onKeyDown: (e) => {
                      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                        e.preventDefault();
                        holdToTalk(true);
                      }
                    },
                    onKeyUp: (e) => {
                      if (e.code === 'Space' || e.code === 'Enter') {
                        e.preventDefault();
                        holdToTalk(false);
                      }
                    },
                    onBlur: () => holdToTalk(false),
                  }
                : {
                    onClick: toggleMute,
                  })}
              className={`tactile-btn px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors select-none touch-none cursor-pointer ${
                !isMuted
                  ? 'bg-emerald-600 text-white shadow-sm animate-pulse'
                  : 'bg-surface-container text-on-surface hover:bg-surface-variant'
              }`}
            >
              <AppIcon name={!isMuted ? 'mic' : 'mic_off'} className="w-4 h-4" />
              <span>
                {voiceMode === 'hold'
                  ? !isMuted
                    ? t('voice.speakingNow', '发言中...')
                    : t('voice.holdToTalk', '按住说话 (Space)')
                  : isMuted
                  ? t('voice.unmute', '开麦')
                  : t('voice.mute', '静音')}
              </span>
            </button>

            {/* Direct Voice Mode Switcher (Hold to Talk vs Open Mic) */}
            <button
              type="button"
              onClick={() => setVoiceMode(voiceMode === 'hold' ? 'open' : 'hold')}
              aria-label={voiceMode === 'hold' ? t('voice.modeOpenAria', '切换到自由麦模式') : t('voice.modeHoldAria', '切换到按住说话模式')}
              title={voiceMode === 'hold' ? t('voice.modeOpenAria', '切换到自由麦模式') : t('voice.modeHoldAria', '切换到按住说话模式')}
              className="tactile-btn px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-xs font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
            >
              <AppIcon name={voiceMode === 'hold' ? 'touch_app' : 'campaign'} className="w-4 h-4 text-primary" />
              <span>{voiceMode === 'hold' ? t('voice.modeHold', '按住说话') : t('voice.modeOpen', '自由麦')}</span>
            </button>

            {/* Room Chat & Voice Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsChatDrawerOpen(true)}
              aria-label={t('voice.roomChatTitle', '房间交流')}
              title={t('voice.roomChatTitle', '房间交流')}
              className="tactile-btn relative p-2 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center cursor-pointer transition-colors"
            >
              <AppIcon name="forum" className="w-4 h-4" />
              {messages.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-secondary"></span>
              )}
            </button>

            {/* Deafen toggle */}
            <button
              type="button"
              onClick={toggleDeafen}
              aria-label={isDeafened ? t('voice.undeafen', '取消闭音') : t('voice.deafen', '闭音')}
              className={`tactile-btn p-2 rounded-full border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                isDeafened
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                  : 'bg-surface-container text-muted-foreground border-outline-variant/50'
              }`}
              title={isDeafened ? t('voice.undeafen', '取消闭音') : t('voice.deafen', '闭音')}
            >
              <AppIcon name={isDeafened ? 'volume_off' : 'volume_up'} className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsDanmakuOn((prev) => !prev)}
              className={`tactile-btn px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                isDanmakuOn ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-outline'
              }`}
            >
              {isDanmakuOn ? t('inGame.danmakuOn', '弹幕: 开') : t('inGame.danmakuOff', '弹幕: 关')}
            </button>

            <button
              type="button"
              onClick={handleLeave}
              className="tactile-btn px-3 py-1.5 rounded-full bg-error-container text-error text-xs font-bold hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              {t('inGame.exitRoom', '退出房间')}
            </button>
          </div>
        </header>

        {/* DESKTOP BODY 12-COLUMN FLUID CONTAINER (max 1440px) */}
        <div className="flex-1 max-w-[1440px] w-full mx-auto flex gap-4 p-4 min-h-0 overflow-hidden">
          {/* LEFT / CENTER COLUMN (Game Board + Clues + Input) */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden">
            {/* Secret Word Hint Card */}
            <section className="bg-gradient-to-r from-primary/10 via-surface-container-high to-surface-variant rounded-2xl px-4 py-2.5 flex items-center justify-between border border-primary/15 shadow-xs shrink-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-xs font-bold shadow-xs">
                  <AppIcon name="lightbulb" className="w-3.5 h-3.5" />
                  {t('inGame.hintCategory', '提示分类')}
                </span>
                <span className="font-headline-sm text-base font-extrabold text-primary">
                  {isSelectingWord
                    ? t('inGame.drawerSelectingWord', '画手正在挑选词语...')
                    : `${wordCategory ? `${wordCategory} · ` : ''}${wordLength > 0 ? t('inGame.wordCharsDesktop', { length: wordLength, defaultValue: `${wordLength}个字` }) : ''}`}
                </span>
                <div className="h-4 w-[1px] bg-primary/20"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-on-surface-variant">{t('inGame.wordSlots', '字数卡槽：')}</span>
                  {isSelectingWord || slots.length === 0 ? (
                    <span className="text-xs font-bold text-secondary animate-pulse">
                      {t('inGame.drawerSelectingWord', '画手正在挑选词语...')}
                    </span>
                  ) : (
                    slots.map((char, idx) => (
                      <div
                        key={idx}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shadow-xs ${
                          char !== '_'
                            ? 'bg-primary-container text-on-primary-container text-lg ring-2 ring-primary/30'
                            : 'bg-surface-container-lowest border-2 border-dashed border-outline-variant text-outline text-base'
                        }`}
                      >
                        {char}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant">
                  {wordHint ? t('inGame.revealedClue', { clue: wordHint }) : t('inGame.hintLocked', '提示未解锁')}
                </span>
                <button
                  type="button"
                  onClick={() => sendMessage('申请提示 💡', false)}
                  className="tactile-btn px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container shadow-xs border border-primary/20 flex items-center gap-1 cursor-pointer font-bold text-xs"
                >
                  <AppIcon name="tips_and_updates" className="w-4 h-4 text-secondary-container" />
                  <span>{t('inGame.requestHint', '申请提示')}</span>
                </button>
              </div>
            </section>

            {/* Live Drawing Canvas Card */}
            <section className="flex-1 bg-surface-container-lowest rounded-2xl border border-surface-container canvas-shadow flex flex-col justify-between overflow-hidden relative min-h-[360px]">
              {/* Canvas Header Floating Controls */}
              <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-inverse-surface/85 backdrop-blur-md text-inverse-on-surface shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
                  <span className="w-2 h-2 rounded-full bg-secondary-container -ml-4"></span>
                  <span className="text-xs font-label-sm font-bold">
                    {drawerNickname || '画手'} 正在实时挥毫作画中...
                  </span>
                </div>
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="tactile-btn px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-xs flex items-center gap-1 text-on-surface-variant hover:bg-surface-container text-xs font-bold cursor-pointer"
                  >
                    <AppIcon name="fullscreen" className="w-4 h-4" />
                    <span>全屏模式</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChatDrawerOpen(true)}
                    className="tactile-btn p-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-xs text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    title={t('voice.roomChatTitle', '房间交流')}
                    aria-label={t('voice.roomChatTitle', '房间交流')}
                  >
                    <AppIcon name="forum" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Real Drawing Canvas Area */}
              <div className="w-full flex-1 relative flex items-center justify-center bg-white overflow-hidden min-h-[300px]">
                {/* Subtle Grid Texture for Paper Feel */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#413fd6 0.8px, transparent 0.8px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Danmaku Overlay */}
                <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

                {/* Real Canvas */}
                <div className="w-full h-full flex items-center justify-center p-3 pointer-events-none">
                  <DrawBoard
                    strokes={strokes}
                    isDrawer={false}
                    width={800}
                    height={600}
                    className="w-full h-full aspect-[4/3] max-w-[800px] max-h-[600px] rounded-xl border-0 shadow-none pointer-events-none"
                  />
                </div>

                {/* Floating Reaction Emojis */}
                {floatingEmojis.map((item) => (
                  <div
                    key={item.id}
                    className="absolute bottom-8 right-12 pointer-events-none flex flex-col items-center"
                  >
                    <span className="emoji-float text-3xl select-none">{item.emoji}</span>
                  </div>
                ))}

                {hasGuessedCorrect && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-black shadow-xl flex items-center gap-2 animate-bounce pointer-events-none">
                    <span>🎉 恭喜！你已猜中正确答案</span>
                  </div>
                )}
              </div>

              {/* Canvas Footer */}
              <div className="w-full bg-surface-container-low px-4 py-1.5 flex items-center justify-between border-t border-surface-container shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-label-sm text-outline font-bold">{t('inGame.boardReactions', '画板实时反应:')}</span>
                  {['👏 棒', '😂 抽象', '❤️ 懂了', '🎨 灵魂', '🔥 热烈'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      className="tactile-btn px-2.5 py-0.5 rounded-full bg-surface-container-lowest hover:bg-surface-variant text-xs shadow-xs font-medium cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-label-sm font-bold text-primary">{t('inGame.strokesSyncing', '实时笔画高精同步中')}</span>
              </div>
            </section>

            {/* Bottom Guess / Chat Input & Interaction Bar */}
            <footer className="bg-surface-container-lowest p-2 rounded-2xl border border-surface-container shadow-xs shrink-0">
              <InGameBottomBar
                value={guessInput}
                onChange={setGuessInput}
                onSubmit={handleInputSubmit}
                showModeToggle={true}
                mode={effectiveMode}
                onToggleMode={() => setInputMode((m) => (m === 'guess' ? 'chat' : 'guess'))}
                hasGuessedCorrect={hasGuessedCorrect}
                showDanmakuToggle={true}
                isDanmakuOn={isDanmakuOn}
                onToggleDanmaku={() => setIsDanmakuOn((p) => !p)}
                placeholder={
                  hasGuessedCorrect
                    ? guessResult?.earned
                      ? t('inGame.guessedChatPlaceholderWithScore', { score: guessResult.earned, defaultValue: `你已猜中 (+${guessResult.earned}分)！发条消息互动...` })
                      : t('inGame.guessedChatPlaceholder', '你已猜中！发条消息互动...')
                    : effectiveMode === 'guess'
                    ? t('inGame.guessInputPlaceholderDesktop', '输入你的猜测词，按回车提交...')
                    : t('inGame.chatInputPlaceholder', '输入聊天消息（按 Enter 发送）...')
                }
                sendLabel={
                  effectiveMode === 'guess' && !hasGuessedCorrect
                    ? t('inGame.submitGuessBtn', '抢答提交')
                    : t('inGame.sendChat', '发消息')
                }
                rightSlot={
                  <button
                    type="button"
                    onClick={() => handleSendReaction('🔥')}
                    className="tactile-btn px-2 py-1 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant shadow-2xs cursor-pointer text-xs"
                    title={t('inGame.quickReaction', '热烈反应')}
                    aria-label={t('inGame.quickReaction', '热烈反应')}
                  >
                    <span>🔥</span>
                  </button>
                }
                labels={{
                  ...bottomBarLabels,
                  sendAria:
                    effectiveMode === 'guess' && !hasGuessedCorrect
                      ? t('inGame.submitGuessBtn', '抢答提交')
                      : t('inGame.sendChat', '发消息'),
                  clearAria: t('chat.clear', '清空'),
                }}
              />
            </footer>
          </div>

          {/* RIGHT COLUMN (Player Seats & Scoreboard + Live Chat & Guess Stream) */}
          <div className="w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Player Seats & Leaderboard Card */}
            <section className="bg-surface-container-lowest rounded-2xl p-3 border border-surface-container shadow-xs flex flex-col shrink-0">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
                <div className="flex items-center gap-1.5">
                  <AppIcon name="leaderboard" className="w-4 h-4 text-secondary-container" />
                  <span className="font-label-sm text-sm font-bold text-on-surface">{t('inGame.leaderboard', '实时积分榜')}</span>
                </div>
                <span className="text-xs text-outline font-bold">
                  {players.filter((p) => p.isOnline).length}/{room.settings?.maxPlayers || 8} {t('inGame.playersOnline', '人在线')}
                </span>
              </div>

              <div className="max-h-[180px] overflow-y-auto space-y-1.5 pt-2 custom-scroll">
                {players.map((p, idx) => {
                  const isSpeaking = speakingUserIds.includes(p.id);
                  const scoreItem = scoresMap.get(p.id);
                  const scoreVal = scoreItem?.score ?? p.score;
                  const isMe = p.id === userId;
                  const isDrawer = p.id === gameState.drawerId;
                  const hasCorrect = scoreItem?.hasGuessedCorrectly;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all ${
                        isDrawer
                          ? 'bg-primary-fixed/50 border-primary/30'
                          : hasCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : isMe
                          ? 'bg-surface-container border-primary-container'
                          : 'bg-surface-container-low border-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold overflow-hidden shrink-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.nickname} className="w-full h-full object-cover" />
                          ) : (
                            p.nickname.slice(0, 1)
                          )}
                          {isDrawer && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-secondary-container text-on-primary flex items-center justify-center text-[8px]">
                              🎨
                            </span>
                          )}
                          {hasCorrect && !isDrawer && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center text-[8px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-label-sm text-xs font-bold text-on-surface truncate max-w-[100px]">
                              {p.nickname}
                            </span>
                            {isMe && <span className="text-[10px] text-primary font-bold">(你)</span>}
                            {idx === 0 && <span className="text-[10px]">👑</span>}
                          </div>
                          <span className="text-[10px] text-on-surface-variant font-medium">
                            {isDrawer ? '作画中' : hasCorrect ? '✓ 已猜对' : '猜词中'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-sm text-primary font-mono block">{scoreVal}</span>
                        <span className="text-[9px] text-outline font-medium">积分</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Live Chat & Guess Feed Card */}
            <section className="flex-1 bg-surface-container-lowest rounded-2xl p-3 border border-surface-container shadow-xs flex flex-col justify-between overflow-hidden min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60 shrink-0">
                <div className="flex items-center gap-1.5">
                  <AppIcon name="forum" className="w-4 h-4 text-primary" />
                  <span className="font-label-sm text-sm font-bold text-on-surface">实时竞猜与动态</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-outline">答案保护已开启</span>
                  <button
                    type="button"
                    onClick={() => setIsChatDrawerOpen(true)}
                    className="tactile-btn p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    title={t('voice.roomChatTitle', '房间交流')}
                    aria-label={t('voice.roomChatTitle', '房间交流')}
                  >
                    <AppIcon name="open_in_new" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 custom-scroll text-xs">
                {wordHint && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs border-l-2 border-primary">
                    <AppIcon name="auto_awesome" className="w-4 h-4 text-primary" />
                    <span>
                      系统：画手 <strong className="text-primary">{drawerNickname || '画手'}</strong> 公布了线索「
                      <strong className="text-primary">{wordHint}</strong>」
                    </span>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-outline font-medium">
                    暂无猜词记录，作画后玩家抢答将显示于此
                  </div>
                ) : (
                  messages.map((m) => {
                    const isCorrect = m.payload.type === 'correct_guess';
                    const isMe = m.senderId === userId;
                    const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    if (isCorrect) {
                      return (
                        <div
                          key={m.payload.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim text-on-tertiary-fixed font-medium"
                        >
                          <span className="text-base">🎉</span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="font-bold">{m.payload.senderNickname} {isMe ? t('voice.me', '(我)') : ''}</span>
                            <span>{t('inGame.guessedCorrectly', '猜中了正确答案！')}</span>
                          </div>
                          <span className="font-black text-tertiary px-1.5 py-0.5 rounded-md bg-tertiary-fixed/40">
                            ✓
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={m.payload.id} className="flex items-start gap-1.5">
                        <span
                          className={`font-bold shrink-0 ${isMe ? 'text-primary' : 'text-on-surface-variant'}`}
                        >
                          {m.payload.senderNickname} {isMe ? '(你)' : ''}:
                        </span>
                        <div className="flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface font-body-sm text-xs">
                          <span>{m.payload.content}</span>
                          {m.payload.type === 'guess' ? (
                            <span className="text-error font-bold text-[10px] flex items-center gap-0.5">
                              <AppIcon name="close" className="w-3 h-3" /> 不对
                            </span>
                          ) : m.payload.isDanmaku ? (
                            <span className="text-secondary font-bold text-[10px] flex items-center">
                              <AppIcon name="chat" className="w-3 h-3" />
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-outline ml-auto self-center">{timeStr}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Reaction Phrase Pills */}
              <div className="pt-2 border-t border-surface-container-high/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { key: 'awesome', text: t('inGame.quickPillAwesome', '👍 太神了') },
                  { key: 'hint', text: t('inGame.quickPillHint', '💡 求提示') },
                  { key: 'hard', text: t('inGame.quickPillHard', '🤔 有点难') },
                  { key: 'artist', text: t('inGame.quickPillArtist', '🎨 灵魂画手') },
                  { key: 'go', text: t('inGame.quickPillGo', '🔥 冲冲冲') },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => sendMessage(pill.text, true)}
                    className="tactile-btn px-2.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-xs font-bold shrink-0 hover:bg-surface-variant cursor-pointer"
                  >
                    {pill.text}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal for Mobile */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface p-5 rounded-3xl border border-surface-container shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-1.5">
                <AppIcon name="leaderboard" className="w-4 h-4 text-secondary-container" />
                <h3 className="font-headline-sm text-base font-extrabold text-on-surface">房间积分榜</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
                aria-label="关闭"
              >
                <AppIcon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 custom-scroll">
              {players.map((p, idx) => {
                const scoreItem = scoresMap.get(p.id);
                const scoreVal = scoreItem?.score ?? p.score;
                const isMe = p.id === userId;
                const isDrawer = p.id === gameState.drawerId;
                const hasCorrect = scoreItem?.hasGuessedCorrectly;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low border border-surface-container"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black w-4 text-center text-outline">
                        {idx === 0 ? '👑' : `${idx + 1}`}
                      </span>
                      <img src={p.avatar} alt={p.nickname} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-on-surface">{p.nickname}</span>
                          {isMe && <span className="text-[10px] text-primary font-bold">(你)</span>}
                        </div>
                        <span className="text-[10px] text-outline">
                          {isDrawer ? '🎨 画手' : hasCorrect ? '✓ 已猜中' : '待猜'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-primary font-mono">{scoreVal}</span>
                      <span className="text-[10px] text-outline block">分</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface p-5 rounded-3xl border border-surface-container shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-sm text-base font-extrabold text-on-surface">游戏规则</h3>
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
                aria-label="关闭"
              >
                <AppIcon name="close" className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
              <p>1. 每轮随机一名玩家担当画手，根据题目作画。</p>
              <p>2. 其他玩家在竞猜栏输入答案，越快猜对积分越高。</p>
              <p>3. 答案具有防剧透保护，猜错不扣分，鼓励多试！</p>
            </div>
          </div>
        </div>
      )}

      {/* Turn End Summary Overlay */}
      {gameState.status === 'turn_ended' && gameState.turnSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface p-6 rounded-3xl border-2 border-border shadow-2xl space-y-4 text-center">
            <span className="text-3xl">🎉</span>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-on-surface">{t('inGame.turnEndedTitle', '本轮作画已结束')}</h4>
              <p className="text-xs text-outline">
                {t('inGame.correctAnswerIs', '正确答案是：')}
                <span className="text-primary font-black text-base ml-1">
                  【{gameState.turnSummary.secretWord}】
                </span>
              </p>
            </div>
            {gameState.turnSummary.guesserEarned?.[userId] ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                {t('inGame.guesserEarnedReward', { score: gameState.turnSummary.guesserEarned[userId] })}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-surface-container text-outline text-xs font-bold">
                {t('inGame.guesserMissedReward', '本轮未猜中，下一轮继续加油！')}
              </div>
            )}
            <p className="text-[11px] text-outline animate-pulse">{t('inGame.preparingNextRound', '正在准备下一轮...')}</p>
          </div>
        </div>
      )}

      {/* Mobile Chat Drawer */}
      <InGameChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        currentUserId={userId}
        onSendMessage={(content) => sendMessage(content, true)}
        players={players}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isDeafened={isDeafened}
        onToggleDeafen={toggleDeafen}
        voiceMode={voiceMode}
        onSetVoiceMode={setVoiceMode}
        onHoldToTalk={holdToTalk}
        voiceStatus={voiceStatus}
        voiceError={voiceError}
        speakingUserIds={speakingUserIds}
        roomCode={roomCode}
        currentDrawerNickname={drawerNickname}
        isDrawer={false}
        labels={chatDrawerLabels}
        quickPhrases={guesserQuickPhrases}
      />
    </div>
  );
};
