import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Smile,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, UserProfile } from '@idavoll/protocol';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';

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
}

const QUICK_PHRASES = [
  { icon: '👍', text: '画得太棒了' },
  { icon: '😂', text: '抽象艺术' },
  { icon: '⏳', text: '猜快点猜快点' },
  { icon: '💡', text: '给个提示嘛' },
  { icon: '👏', text: '太牛了！秒猜' },
  { icon: '🎨', text: '灵魂画师' },
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
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'phrases'>('chat');
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Release push-to-talk on unmount or drawer close
  useEffect(() => {
    return () => {
      onHoldToTalk?.(false);
    };
  }, [onHoldToTalk]);

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
    onSendMessage(inputText.trim(), false);
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
                    房间交流 {roomCode ? `(#${roomCode})` : ''}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {roundInfo} {currentDrawerNickname ? `· 画手: ${currentDrawerNickname}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="关闭聊天抽屉"
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
                aria-label={`聊天动态 (${messages.length}条)`}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-card text-[var(--theme-primary,#5B5BF0)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                聊天动态 ({messages.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('phrases')}
                aria-label="快捷短语"
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'phrases'
                    ? 'bg-card text-[var(--theme-primary,#5B5BF0)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                快捷短语
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
                          ? '按住说话已就绪 (静音中)'
                          : '麦克风已静音'
                        : '麦克风已开 (发言中)'}
                    </span>
                  </>
                ) : voiceStatus === 'connecting' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>正在连接语音...</span>
                  </>
                ) : voiceStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="truncate max-w-[200px]">{voiceError || '语音连接失败'}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    <span>语音未开启</span>
                  </>
                )}
                {isDeafened && <span className="text-rose-500 font-extrabold">(已闭音)</span>}
              </div>

              <div className="flex items-center gap-2">
                {voiceStatus === 'error' ? (
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label="重试语音连接"
                    className="text-xs font-extrabold underline text-rose-600 dark:text-rose-400 hover:opacity-80 cursor-pointer"
                  >
                    重试开麦
                  </button>
                ) : voiceStatus === 'off' ? (
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label="点击开麦加入语音"
                    className="text-xs font-extrabold underline hover:text-foreground cursor-pointer"
                  >
                    开麦加入
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={isMuted ? '点击开麦' : '点击静音'}
                    className="text-xs font-extrabold underline hover:opacity-80 cursor-pointer"
                  >
                    {isMuted ? '开麦' : '静音'}
                  </button>
                )}

                {onToggleDeafen && (
                  <button
                    type="button"
                    onClick={onToggleDeafen}
                    aria-label={isDeafened ? '取消闭音' : '闭音'}
                    className="text-xs font-extrabold underline text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isDeafened ? '取消闭音' : '闭音'}
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
                        {isMe && <span className="text-[10px] text-[var(--theme-primary,#5B5BF0)]">(我)</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {isSpeaking ? (
                          <span className="text-emerald-600 font-bold">发言中</span>
                        ) : p.micMuted ? (
                          '静音'
                        ) : (
                          '就绪'
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
                    <span>{roundInfo} · 画手为 {currentDrawerNickname}</span>
                  </div>
                </div>
              )}

              {/* Message List */}
              {messages.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                  暂无消息记录，开始发言吧！
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
                <span>快聊:</span>
              </span>
              {QUICK_PHRASES.map((item) => (
                <button
                  key={item.text}
                  type="button"
                  onClick={() => handleQuickPhrase(item.text)}
                  aria-label={`发送快捷短语: ${item.text}`}
                  className="px-3 py-1 rounded-full bg-card hover:bg-muted border border-border text-xs font-bold text-foreground flex items-center gap-1 shrink-0 transition-transform active:scale-95 shadow-2xs cursor-pointer"
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>

            {/* Input Bar & Push-to-Talk Action */}
            <form onSubmit={handleSend} className="p-3 bg-card border-t border-border flex items-center gap-2 shrink-0">
              {/* Mic / Push-to-talk button */}
              {voiceMode === 'hold' ? (
                <button
                  type="button"
                  aria-label={!isMuted ? '松开静音' : '按住说话'}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onHoldToTalk?.(true);
                  }}
                  onPointerUp={(e) => {
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {}
                    onHoldToTalk?.(false);
                  }}
                  onPointerCancel={() => onHoldToTalk?.(false)}
                  onLostPointerCapture={() => onHoldToTalk?.(false)}
                  onKeyDown={(e) => {
                    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                      e.preventDefault();
                      onHoldToTalk?.(true);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.code === 'Space' || e.code === 'Enter') {
                      e.preventDefault();
                      onHoldToTalk?.(false);
                    }
                  }}
                  onBlur={() => onHoldToTalk?.(false)}
                  className={`px-3 h-10 rounded-full flex items-center justify-center gap-1 shrink-0 font-extrabold text-xs transition-all select-none touch-none cursor-pointer ${
                    !isMuted
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 scale-105 shadow-md animate-pulse'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {!isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span className="hidden sm:inline">{!isMuted ? '松开发言' : '按住说话'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={isMuted ? '开麦' : '静音'}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    isMuted ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isDrawer ? '发送聊天消息... (画手禁发答案)' : '发送消息或猜词...'}
                  aria-label={isDrawer ? '发送聊天消息' : '发送消息或猜词'}
                  className="w-full h-10 pl-3 pr-8 rounded-full bg-muted/60 border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary,#5B5BF0)]"
                />
                <button
                  type="button"
                  onClick={() => setInputText((prev) => `${prev} 🎉`)}
                  aria-label="插入表情符号"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <Button
                type="submit"
                disabled={!inputText.trim()}
                aria-label="发送消息"
                className="h-10 px-4 rounded-full font-black text-xs gap-1 shrink-0 shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>发送</span>
              </Button>
            </form>

            {/* Voice Mode Footer */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30 border-t border-border/60 text-[11px] font-bold text-muted-foreground shrink-0 pb-safe">
              <div className="flex items-center gap-2">
                <span>语音模式:</span>
                <div className="inline-flex rounded-full bg-muted p-0.5 border border-border/60">
                  <button
                    type="button"
                    onClick={() => onSetVoiceMode?.('hold')}
                    aria-label="切换到按住说话模式"
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                      voiceMode === 'hold' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    按住说话
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetVoiceMode?.('open')}
                    aria-label="切换到自由麦模式"
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                      voiceMode === 'open'
                        ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-xs'
                        : 'text-muted-foreground'
                    }`}
                  >
                    自由麦
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {voiceStatus === 'connected' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400">实时语音已连麦</span>
                  </>
                ) : voiceStatus === 'connecting' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-amber-500 animate-ping" />
                    <span className="text-amber-600 dark:text-amber-400">语音连接中...</span>
                  </>
                ) : voiceStatus === 'error' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-rose-500" />
                    <button
                      type="button"
                      onClick={onToggleMute}
                      aria-label="语音连接异常，点击重试开麦"
                      className="text-rose-500 underline cursor-pointer hover:opacity-80"
                    >
                      连接异常 (重试)
                    </button>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-muted-foreground">语音未开启</span>
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
