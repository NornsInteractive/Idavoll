import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Minimize2, Timer, Send, Loader2, Volume2, VolumeX } from 'lucide-react';
import { DrawBoard, DanmakuOverlay, Button, Badge, InGameBottomBar, VoiceDock } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';
import { toggleMute, toggleDeafen, setVoiceMode, holdToTalk } from '../services/voice';
import { useVoiceLabels } from '../hooks/useVoiceLabels';
import { useSpacePushToTalk } from '../hooks/useSpacePushToTalk';

export const InGameFullscreenPage: React.FC = () => {
  const { t } = useTranslation();
  const { voiceDockLabels, bottomBarLabels } = useVoiceLabels();
  const navigate = useNavigate();

  const [isDanmakuOn, setIsDanmakuOn] = useState(true);
  const [inputMode, setInputMode] = useState<'guess' | 'chat'>('guess');

  const { id: userId, nickname } = useUserStore();
  const {
    room,
    danmakus,
    sendMessage,
    isMuted,
    isDeafened,
    voiceMode,
    voiceStatus,
    voiceError,
    speakingUserIds,
  } = useRoomStore();
  const { gameState, currentWord, addStroke, selectWord, submitGuess } = useGameStore();

  const [inputGuess, setInputGuess] = useState('');
  const [currentColor, setCurrentColor] = useState('#413FD6');
  const [currentSize, setCurrentSize] = useState(8);
  const [isEraser, setIsEraser] = useState(false);

  // Global desktop Spacebar push-to-talk handler (called unconditionally before loading guard)
  useSpacePushToTalk(voiceMode === 'hold', holdToTalk);

  if (!room || !gameState) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 space-y-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--theme-primary,#5B5BF0)]" />
        <h2 className="text-lg font-bold">{t('inGame.loadingRoom', '正在同步游戏状态...')}</h2>
        <Button variant="surface" onClick={() => navigate('/lobby')} className="text-xs font-bold text-white">
          {t('inGame.backToLobby', '返回大厅')}
        </Button>
      </div>
    );
  }

  const isDrawer = gameState.drawerId === userId;
  const isDrawing = gameState.status === 'drawing';
  const myScore = gameState.scores?.find((s) => s.playerId === userId);
  const hasGuessedCorrectly = Boolean(myScore?.hasGuessedCorrectly);
  const canGuess = !isDrawer && isDrawing && !hasGuessedCorrectly;
  const effectiveMode = hasGuessedCorrectly || isDrawer ? 'chat' : inputMode;

  const timeLeft = gameState.timeLeft ?? 0;
  const wordHint =
    gameState.wordHint ||
    (isDrawer
      ? currentWord || t('inGame.waitingWordSelection', '等待选词')
      : gameState.currentWordLength
      ? t('inGame.wordLength', { count: gameState.currentWordLength })
      : '');

  const handleSendDanmaku = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputGuess.trim();
    if (!trimmed) return;

    if (effectiveMode === 'guess' && canGuess) {
      submitGuess(trimmed);
    } else {
      sendMessage(trimmed, true);
    }
    setInputGuess('');
  };

  const handleExitFullscreen = () => {
    if (isDrawer) {
      navigate('/game/drawer');
    } else {
      navigate('/game/guesser');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden touch-none overscroll-none select-none">
      {/* Floating Top Controls HUD */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-30 flex items-center justify-between pointer-events-none pt-safe">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge className="bg-white/20 backdrop-blur-md text-white border border-white/30 font-black px-3 py-1 text-xs">
            {isDrawer ? t('inGame.drawerRole') : t('inGame.guesserRole')}
          </Badge>
          <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
            {isDrawer
              ? t('inGame.wordTopic', { word: currentWord || t('inGame.waitingWordSelection') })
              : t('inGame.wordClue', { hint: wordHint })}
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            size="sm"
            variant="surface"
            onClick={toggleDeafen}
            aria-label={isDeafened ? t('voice.undeafenAria', '取消闭音') : t('voice.deafenAria', '闭音')}
            className="h-8 px-2.5 text-xs font-bold bg-white/20 hover:bg-white/30 text-white border-0 shadow backdrop-blur-md cursor-pointer"
          >
            {isDeafened ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>

          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/80 backdrop-blur-md text-white text-xs font-mono font-black shadow">
            <Timer className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>

          <Button
            size="sm"
            variant="surface"
            onClick={handleExitFullscreen}
            className="h-8 px-3 text-xs gap-1 font-bold bg-white/20 hover:bg-white/30 text-white border-0 shadow backdrop-blur-md cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{t('inGame.exitFullscreen')}</span>
          </Button>
        </div>
      </div>

      {/* Main Drawing Canvas with 800x600 4:3 Aspect Ratio and Danmaku Barrage */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-4">
        <DanmakuOverlay items={danmakus} enabled={isDanmakuOn} />

        <div className="w-full h-full max-w-[800px] max-h-[600px] aspect-[4/3] flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden">
          <DrawBoard
            strokes={gameState.strokes || []}
            onStrokeUpdate={isDrawer ? (s) => addStroke(s) : undefined}
            onStrokeComplete={isDrawer ? (s) => addStroke(s) : undefined}
            currentColor={currentColor}
            currentSize={currentSize}
            isEraser={isEraser}
            isDrawer={isDrawer}
            disabled={gameState.status !== 'drawing'}
            width={800}
            height={600}
            className="w-full h-full aspect-[4/3] rounded-2xl border-0"
          />
        </div>
      </div>

      {/* Floating Bottom Guess / Danmaku Bar & Shared VoiceDock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30 flex flex-col gap-2">
        <VoiceDock
          players={room?.players || []}
          currentUserId={userId}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          isDeafened={isDeafened}
          onToggleDeafen={toggleDeafen}
          speakingUserIds={speakingUserIds}
          voiceStatus={voiceStatus}
          voiceError={voiceError}
          voiceMode={voiceMode}
          onSetVoiceMode={setVoiceMode}
          onHoldToTalk={holdToTalk}
          labels={voiceDockLabels}
          className="bg-card/90 backdrop-blur-xl border-white/20 shadow-xl"
        />

        <InGameBottomBar
          value={inputGuess}
          onChange={setInputGuess}
          onSubmit={handleSendDanmaku}
          placeholder={
            isDrawer
              ? t('inGame.drawerDanmakuPlaceholder')
              : hasGuessedCorrectly
              ? t('inGame.guessedDanmakuPlaceholder')
              : effectiveMode === 'guess'
              ? t('inGame.guessInputPlaceholder')
              : t('inGame.chatInputPlaceholder')
          }
          sendLabel={
            effectiveMode === 'guess' && canGuess
              ? t('inGame.submitGuessBtn', '抢答提交')
              : t('inGame.sendDanmaku', '发弹幕')
          }
          showDanmakuToggle={true}
          isDanmakuOn={isDanmakuOn}
          onToggleDanmaku={() => setIsDanmakuOn((prev) => !prev)}
          showModeToggle={!isDrawer && isDrawing}
          mode={effectiveMode}
          onToggleMode={() => setInputMode((m) => (m === 'guess' ? 'chat' : 'guess'))}
          hasGuessedCorrect={hasGuessedCorrectly}
          showVoiceButton={false}
          className="backdrop-blur-xl bg-card/90 rounded-2xl p-1 shadow-2xl border border-white/20"
          labels={{
            ...bottomBarLabels,
            sendAria:
              effectiveMode === 'guess' && canGuess
                ? t('inGame.submitGuessBtn', '抢答提交')
                : t('inGame.sendDanmaku', '发弹幕'),
            clearAria: t('chat.clear', '清空'),
          }}
        />
      </div>

      {/* Word Selection Dialog (When status is selecting_word) */}
      {gameState.status === 'selecting_word' && isDrawer && gameState.wordChoices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-md bg-surface p-6 rounded-3xl border-2 border-primary/40 shadow-2xl space-y-5 text-center">
            <div className="space-y-1">
              <span className="text-xs font-black text-primary uppercase tracking-wider">
                {t('inGame.pickWordTitle')}
              </span>
              <h3 className="text-2xl font-black text-on-surface">{t('inGame.selectWordTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('inGame.pickWordDesc')}</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {gameState.wordChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => selectWord(choice)}
                  className="py-3 px-4 rounded-2xl bg-primary/10 hover:bg-primary hover:text-white border border-primary/30 text-primary font-black text-base transition-all hover:scale-102 cursor-pointer"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Turn End Summary Overlay */}
      {gameState.status === 'turn_ended' && gameState.turnSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-sm bg-surface p-6 rounded-3xl border-2 border-border shadow-2xl space-y-4 text-center">
            <span className="text-2xl">⏳</span>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-on-surface">{t('inGame.turnEndedTitle')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('inGame.correctAnswerIs')}
                <span className="text-primary font-black text-sm ml-1">
                  【{gameState.turnSummary.secretWord}】
                </span>
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground animate-pulse">
              {t('inGame.preparingNextRound')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
