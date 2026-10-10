import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Smile,
  Mic,
  MicOff,
  Radio,
  Sparkles,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, UserProfile } from '@idavoll/protocol';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { InGameBottomBar } from './InGameBottomBar';

export interface QuickPhraseItem {
  icon?: string;
  text: string;
}

export interface InGameChatDrawerLabels {
  // Header
  roomChatTitle?: string;
  artistLabel?: string;
  closeDrawerAria?: string;
  // Tabs
  chatTab?: string;
  chatTabAria?: string;
  phrasesTab?: string;
  phrasesTabAria?: string;
  // Status Strip
  holdReadyMuted?: string;
  micMuted?: string;
  micOpenSpeaking?: string;
  connecting?: string;
  errorFallback?: string;
  off?: string;
  deafenedBadge?: string;
  retryUnmute?: string;
  retryUnmuteAria?: string;
  joinVoice?: string;
  joinVoiceAria?: string;
  toggleMicAria?: string;
  deafen?: string;
  undeafen?: string;
  deafenAria?: string;
  undeafenAria?: string;
  // Players
  me?: string;
  speaking?: string;
  ready?: string;
  muted?: string;
  // Chat Body
  emptyMessages?: string;
  quickChatPrefix?: string;
  quickPhraseAria?: string;
  // Input
  holdToTalk?: string;
  releaseToMute?: string;
  holdToTalkShort?: string;
  releaseToMuteShort?: string;
  holdToTalkAria?: string;
  releaseToMuteAria?: string;
  mute?: string;
  unmute?: string;
  muteAria?: string;
  unmuteAria?: string;
  inputPlaceholderArtist?: string;
  inputPlaceholderGuesser?: string;
  inputAriaArtist?: string;
  inputAriaGuesser?: string;
  insertEmojiAria?: string;
  send?: string;
  sendAria?: string;
  clearAria?: string;
  danmakuOn?: string;
  danmakuOff?: string;
  danmakuOnBadge?: string;
  danmakuOffBadge?: string;
  danmakuToggleAria?: string;
  // Footer
  voiceModeLabel?: string;
  modeHold?: string;
  modeHoldAria?: string;
  modeOpen?: string;
  modeOpenAria?: string;
  statusConnected?: string;
  statusConnecting?: string;
  statusError?: string;
  statusErrorAria?: string;
  statusOff?: string;
}

export interface InGameChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string, isDanmaku?: boolean) => void;
  players: UserProfile[];
  isMuted: boolean;
  onToggleMute: () => void;
  isDeafened?: boolean;
  onToggleDeafen?: () => void;
  voiceMode?: 'hold' | 'open';
  onSetVoiceMode?: (mode: 'hold' | 'open') => void;
  onHoldToTalk?: (pressed: boolean) => void;
  voiceStatus?: 'off' | 'connecting' | 'connected' | 'error';
  voiceError?: string | null;
  speakingUserIds?: string[];
  roomCode?: string;
  roundInfo?: string;
  currentDrawerNickname?: string;
  isDrawer?: boolean;
  labels?: InGameChatDrawerLabels;
  quickPhrases?: QuickPhraseItem[];
}

const DEFAULT_QUICK_PHRASES_ZH: QuickPhraseItem[] = [
  { icon: '👍', text: '太神了' },
  { icon: '💡', text: '求提示' },
  { icon: '🤔', text: '有点难' },
  { icon: '🎨', text: '灵魂画手' },
  { icon: '🔥', text: '冲冲冲' },
];

const DEFAULT_QUICK_PHRASES_EN: QuickPhraseItem[] = [
  { icon: '👍', text: 'Awesome' },
  { icon: '💡', text: 'Clue please' },
  { icon: '🤔', text: 'Tricky' },
  { icon: '🎨', text: 'Great artist' },
  { icon: '🔥', text: 'Keep going' },
];

export const InGameChatDrawer: React.FC<InGameChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage,
  players,
  isMuted,
  onToggleMute,
  isDeafened = false,
  onToggleDeafen,
  voiceMode = 'open',
  onSetVoiceMode,
  onHoldToTalk,
  voiceStatus = 'off',
  voiceError = null,
  speakingUserIds = [],
  roomCode = '',
  roundInfo = '',
  currentDrawerNickname = '',
  isDrawer = false,
  labels,
  quickPhrases,
}) => {
  const isEnglish = Boolean(
    labels?.send === 'Send' ||
    labels?.roomChatTitle?.toLowerCase().includes('room') ||
    labels?.closeDrawerAria?.toLowerCase().includes('close')
  );
  const activeQuickPhrases =
    quickPhrases && quickPhrases.length > 0
      ? quickPhrases
      : isEnglish
      ? DEFAULT_QUICK_PHRASES_EN
      : DEFAULT_QUICK_PHRASES_ZH;
  const [activeTab, setActiveTab] = useState<'chat' | 'phrases'>('chat');
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Release push-to-talk on unmount, when drawer closes, or when isOpen becomes false
  useEffect(() => {
    if (!isOpen) {
      onHoldToTalk?.(false);
    }
    return () => {
      onHoldToTalk?.(false);
    };
  }, [isOpen, onHoldToTalk]);

  const handleClose = () => {
    onHoldToTalk?.(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), true);
    setInputText('');
  };

  const handleQuickPhrase = (phrase: string) => {
    onSendMessage(phrase, true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col max-h-[85vh] h-[580px] overflow-hidden"
          >
            {/* Header Handle & Title */}
            <div className="p-3 bg-muted/20 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--theme-primary,#5B5BF0)] text-white flex items-center justify-center font-bold text-xs">
                  💬
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">
                    {labels?.roomChatTitle ?? '房间交流'} {roomCode ? `(#${roomCode})` : ''}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {roundInfo}{' '}
                    {currentDrawerNickname
                      ? `· ${labels?.artistLabel ?? '画手:'} ${currentDrawerNickname}`
                      : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label={labels?.closeDrawerAria ?? '关闭聊天抽屉'}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Segmented Nav Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 bg-muted/40 border-b border-border/40 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                aria-label={
                  labels?.chatTabAria
                    ? `${labels.chatTabAria} (${messages.length})`
                    : `${labels?.chatTab ?? '聊天动态'} (${messages.length})`
                }
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-card text-[var(--theme-primary,#5B5BF0)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {(labels?.chatTab ?? '聊天动态')} ({messages.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('phrases')}
                aria-label={labels?.phrasesTabAria ?? labels?.phrasesTab ?? '快捷短语'}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'phrases'
                    ? 'bg-card text-[var(--theme-primary,#5B5BF0)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {labels?.phrasesTab ?? '快捷短语'}
              </button>
            </div>

            {/* Microphone Status Strip */}
            <div
              className={`flex items-center justify-between px-4 py-2 border-b text-xs font-bold shrink-0 transition-colors ${
                voiceStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : voiceStatus === 'connecting'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : voiceStatus === 'error'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-muted/40 text-muted-foreground border-border/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {voiceStatus === 'connected' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {isMuted
                        ? voiceMode === 'hold'
                          ? (labels?.holdReadyMuted ?? '按住说话已就绪 (静音中)')
                          : (labels?.micMuted ?? '麦克风已静音')
                        : (labels?.micOpenSpeaking ?? '麦克风已开 (发言中)')}
                    </span>
                  </>
                ) : voiceStatus === 'connecting' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>{labels?.connecting ?? '正在连接语音...'}</span>
                  </>
                ) : voiceStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="truncate max-w-[200px]">
                      {voiceError || (labels?.errorFallback ?? '语音连接失败')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    <span>{labels?.off ?? '语音未开启'}</span>
                  </>
                )}
                {isDeafened && (
                  <span className="text-rose-500 font-extrabold">
                    {labels?.deafenedBadge ?? '(已闭音)'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {voiceStatus === 'error' ? (
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={labels?.retryUnmuteAria ?? '重试语音连接'}
                    className="text-xs font-extrabold underline text-rose-600 dark:text-rose-400 hover:opacity-80 cursor-pointer"
                  >
                    {labels?.retryUnmute ?? '重试开麦'}
                  </button>
                ) : voiceStatus === 'off' ? (
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={labels?.joinVoiceAria ?? '点击开麦加入语音'}
                    className="text-xs font-extrabold underline hover:text-foreground cursor-pointer"
                  >
                    {labels?.joinVoice ?? '开麦加入'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={
                      isMuted
                        ? labels?.unmuteAria ?? '点击开麦'
                        : labels?.muteAria ?? '点击静音'
                    }
                    className="text-xs font-extrabold underline hover:opacity-80 cursor-pointer"
                  >
                    {isMuted ? labels?.unmute ?? '开麦' : labels?.mute ?? '静音'}
                  </button>
                )}

                {onToggleDeafen && (
                  <button
                    type="button"
                    onClick={onToggleDeafen}
                    aria-label={
                      isDeafened
                        ? labels?.undeafenAria ?? '取消闭音'
                        : labels?.deafenAria ?? '闭音'
                    }
                    className="text-xs font-extrabold underline text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isDeafened
                      ? labels?.undeafen ?? '取消闭音'
                      : labels?.deafen ?? '闭音'}
                  </button>
                )}
              </div>
            </div>

            {/* Voice Player Avatars Strip */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-border/40 overflow-x-auto no-scrollbar shrink-0 bg-muted/10">
              {players.map((p) => {
                const isSpeaking = speakingUserIds.includes(p.id);
                const isMe = p.id === currentUserId;
                return (
                  <div key={p.id} className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <div
                        className={`rounded-full transition-transform ${
                          isSpeaking ? 'ring-2 ring-emerald-500 ring-offset-2 scale-105' : ''
                        }`}
                      >
                        <Avatar src={p.avatar} alt={p.nickname} size="sm" />
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] shadow ${
                          p.micMuted ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      >
                        {p.micMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-extrabold text-foreground flex items-center gap-1">
                        <span>{p.nickname}</span>
                        {isMe && (
                          <span className="text-[10px] text-[var(--theme-primary,#5B5BF0)]">
                            {labels?.me ?? '(我)'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {isSpeaking ? (
                          <span className="text-emerald-600 font-bold">
                            {labels?.speaking ?? '发言中'}
                          </span>
                        ) : p.micMuted ? (
                          labels?.muted ?? '静音'
                        ) : (
                          labels?.ready ?? '就绪'
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Body & Real Messages */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 bg-background/50">
                {roundInfo && currentDrawerNickname && (
                  <div className="flex justify-center">
                    <div className="px-3.5 py-1 rounded-full bg-[var(--theme-primary,#5B5BF0)]/10 text-[var(--theme-primary,#5B5BF0)] text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {roundInfo} · {labels?.artistLabel ?? '画手为'} {currentDrawerNickname}
                      </span>
                    </div>
                  </div>
                )}

                {/* Message List */}
                {messages.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                    {labels?.emptyMessages ?? '暂无消息记录，开始发言吧！'}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    const isCorrect = msg.payload.type === 'correct_guess';

                    if (isCorrect) {
                      return (
                        <div key={msg.payload.id} className="flex justify-center">
                          <div className="px-3 py-1 rounded-full bg-emerald-500 text-white font-extrabold text-xs shadow-md">
                            🎉 {msg.payload.senderNickname} 猜中了正确答案！
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.payload.id}
                        className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <Avatar src={msg.payload.senderAvatar} alt={msg.payload.senderNickname} size="sm" />
                        <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-0.5 text-[11px] font-bold text-muted-foreground">
                            <span>{msg.payload.senderNickname}</span>
                            <span className="text-[10px] opacity-75">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`p-3 rounded-2xl text-xs sm:text-sm font-semibold shadow-sm leading-relaxed ${
                              isMe
                                ? 'bg-[var(--theme-primary,#5B5BF0)] text-white rounded-br-none'
                                : 'bg-card text-foreground border border-border/80 rounded-bl-none'
                            }`}
                          >
                            {msg.payload.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            {/* Quick Phrase Chips Bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-t border-border/40 bg-muted/10 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-xs font-black text-muted-foreground shrink-0 flex items-center gap-0.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{labels?.quickChatPrefix ?? '快聊:'}</span>
              </span>
              {activeQuickPhrases.map((item) => (
                <button
                  key={item.text}
                  type="button"
                  onClick={() => handleQuickPhrase(item.text)}
                  aria-label={
                    labels?.quickPhraseAria
                      ? `${labels.quickPhraseAria} ${item.text}`
                      : `${labels?.quickChatPrefix ?? '快聊:'} ${item.text}`
                  }
                  className="px-3 py-1 rounded-full bg-card hover:bg-muted border border-border text-xs font-bold text-foreground flex items-center gap-1 shrink-0 transition-transform active:scale-95 shadow-2xs cursor-pointer"
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.text}</span>
                </button>
              ))}
            </div>

            {/* Shared Bottom Input Bar & Voice Controls */}
            <div className="p-2.5 bg-card border-t border-border shrink-0">
              <InGameBottomBar
                value={inputText}
                onChange={setInputText}
                onSubmit={handleSend}
                placeholder={
                  isDrawer
                    ? labels?.inputPlaceholderArtist ?? '发送聊天消息... (画手禁发答案)'
                    : labels?.inputPlaceholderGuesser ?? '发送消息或猜词...'
                }
                sendLabel={labels?.send ?? '发送'}
                showVoiceButton={true}
                voiceMode={voiceMode}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                onHoldToTalk={onHoldToTalk}
                isSpeaking={!isMuted}
                leftSlot={
                  <button
                    type="button"
                    onClick={() => setInputText((prev) => `${prev} 🎉`)}
                    aria-label={labels?.insertEmojiAria ?? '插入表情符号'}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                }
                labels={{
                  placeholder: isDrawer
                    ? labels?.inputPlaceholderArtist ?? (isEnglish ? 'Send chat message... (Artist cannot send answers)' : '发送聊天消息... (画手禁发答案)')
                    : labels?.inputPlaceholderGuesser ?? (isEnglish ? 'Send chat message...' : '发送聊天消息...'),
                  send: labels?.send ?? '发送',
                  sendAria: labels?.sendAria ?? '发送消息',
                  clearAria: labels?.clearAria,
                  danmakuOn: labels?.danmakuOn,
                  danmakuOff: labels?.danmakuOff,
                  danmakuOnBadge: labels?.danmakuOnBadge,
                  danmakuOffBadge: labels?.danmakuOffBadge,
                  danmakuToggleAria: labels?.danmakuToggleAria,
                  holdToTalk: labels?.holdToTalk,
                  releaseToMute: labels?.releaseToMute,
                  holdToTalkShort: labels?.holdToTalkShort,
                  releaseToMuteShort: labels?.releaseToMuteShort,
                  holdToTalkAria: labels?.holdToTalkAria,
                  releaseToMuteAria: labels?.releaseToMuteAria,
                  mute: labels?.mute,
                  unmute: labels?.unmute,
                  muteAria: labels?.muteAria,
                  unmuteAria: labels?.unmuteAria,
                }}
              />
            </div>

            {/* Voice Mode Footer */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30 border-t border-border/60 text-[11px] font-bold text-muted-foreground shrink-0 pb-safe">
              <div className="flex items-center gap-2">
                <span>{labels?.voiceModeLabel ?? '语音模式:'}</span>
                <div className="inline-flex rounded-full bg-muted p-0.5 border border-border/60">
                  <button
                    type="button"
                    onClick={() => onSetVoiceMode?.('hold')}
                    aria-label={labels?.modeHoldAria ?? '切换到按住说话模式'}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                      voiceMode === 'hold' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    {labels?.modeHold ?? '按住说话'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetVoiceMode?.('open')}
                    aria-label={labels?.modeOpenAria ?? '切换到自由麦模式'}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                      voiceMode === 'open'
                        ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-xs'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {labels?.modeOpen ?? '自由麦'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {voiceStatus === 'connected' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {labels?.statusConnected ?? '实时语音已连麦'}
                    </span>
                  </>
                ) : voiceStatus === 'connecting' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-amber-500 animate-ping" />
                    <span className="text-amber-600 dark:text-amber-400">
                      {labels?.statusConnecting ?? '语音连接中...'}
                    </span>
                  </>
                ) : voiceStatus === 'error' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-rose-500" />
                    <button
                      type="button"
                      onClick={onToggleMute}
                      aria-label={labels?.statusErrorAria ?? '语音连接异常，点击重试开麦'}
                      className="text-rose-500 underline cursor-pointer hover:opacity-80"
                    >
                      {labels?.statusError ?? '连接异常 (重试)'}
                    </button>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-muted-foreground">
                      {labels?.statusOff ?? '语音未开启'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
