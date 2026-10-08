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
  CheckCircle2,
  Trophy,
  History,
  Zap,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, UserProfile } from '@idavoll/protocol';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export interface InGameChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string, isDanmaku?: boolean) => void;
  players: UserProfile[];
  isMuted: boolean;
  onToggleMute: () => void;
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
  speakingUserIds = [],
  roomCode = '84920',
  roundInfo = '第 2/5 轮',
  currentDrawerNickname = '小明',
  isDrawer = false,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'history' | 'phrases'>('chat');
  const [inputText, setInputText] = useState('');
  const [voiceMode, setVoiceMode] = useState<'hold' | 'open'>('open');
  const [isDeafened, setIsDeafened] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Container (Slide up from bottom) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-[32px] shadow-2xl flex flex-col max-h-[82vh] h-[680px] overflow-hidden"
          >
            {/* Top Handle */}
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto my-2 shrink-0 cursor-grab" />

            {/* Header: Exact Stitch Layout */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/80 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-foreground">房间畅聊与语音</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--theme-primary,#5B5BF0)]/15 text-[var(--theme-primary,#5B5BF0)] font-mono">
                      房间 #{roomCode}
                    </span>
                    <span>{players.length}/8人在线</span>
                    <span className="text-emerald-500 font-mono">📶 22ms</span>
                  </div>
                </div>
              </div>

              {/* Top Voice Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDeafened(!isDeafened)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isDeafened ? 'bg-rose-500/15 text-rose-500' : 'bg-muted/70 text-foreground'
                  }`}
                  title={isDeafened ? '静音输出' : '声音开启'}
                >
                  {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isMuted ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-600'
                  }`}
                  title={isMuted ? '已静音麦克风' : '麦克风工作中'}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border/60 bg-muted/20 shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`relative px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-card text-[var(--theme-primary,#5B5BF0)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>房间聊天</span>
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-rose-500 inline-block align-middle" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('voice')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'voice'
                    ? 'bg-card text-[var(--theme-primary,#5B5BF0)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                实时语音 ({players.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-card text-[var(--theme-primary,#5B5BF0)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                局内记录
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('phrases')}
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
            <div className="flex items-center justify-between px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20 text-xs font-bold shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{isMuted ? '麦克风已关闭' : '麦克风已开启 · AI降噪已启用'}</span>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                className="text-xs font-extrabold underline hover:text-emerald-700 cursor-pointer"
              >
                {isMuted ? '一键开麦' : '一键静音'}
              </button>
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
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow">
                        <Mic className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-extrabold text-foreground flex items-center gap-1">
                        <span>{p.nickname}</span>
                        {isMe && <span className="text-[10px] text-[var(--theme-primary,#5B5BF0)]">(我)</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {isSpeaking ? (
                          <span className="text-emerald-600 font-bold">正在发言</span>
                        ) : isMe ? (
                          '自由麦开'
                        ) : (
                          '倾听中'
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Body & Messages */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 bg-background/50">
              {/* Event Announcement Pill 1 */}
              <div className="flex justify-center">
                <div className="px-3.5 py-1 rounded-full bg-[var(--theme-primary,#5B5BF0)]/10 text-[var(--theme-primary,#5B5BF0)] text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{roundInfo}开始，本轮画手为 {currentDrawerNickname}</span>
                </div>
              </div>

              {/* Event Announcement Pill 2 (Guess Notification) */}
              <div className="flex justify-center">
                <div className="px-4 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-2 shadow-sm">
                  <span>🎉 阿雅 (Aya) 在 18s 时猜中了谜底，获得 +100 分！</span>
                </div>
              </div>

              {/* Message List */}
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const isCorrect = msg.payload.type === 'correct_guess';

                if (isCorrect) {
                  return (
                    <div key={msg.payload.id} className="flex justify-center">
                      <div className="px-3 py-1 rounded-full bg-emerald-500 text-white font-extrabold text-xs shadow-md">
                        {msg.payload.content}
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
              })}
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
                  className="px-3 py-1 rounded-full bg-card hover:bg-muted border border-border text-xs font-bold text-foreground flex items-center gap-1 shrink-0 transition-transform active:scale-95 shadow-2xs cursor-pointer"
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 bg-card border-t border-border flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleMute}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  isMuted ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-foreground'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isDrawer ? '发送聊天消息... (画手禁发答案)' : '发送消息或猜词...'}
                  className="w-full h-10 pl-3 pr-8 rounded-full bg-muted/60 border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary,#5B5BF0)]"
                />
                <button
                  type="button"
                  onClick={() => setInputText((prev) => `${prev} 🎉`)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <Button
                type="submit"
                disabled={!inputText.trim()}
                className="h-10 px-4 rounded-full font-black text-xs gap-1 shrink-0 shadow-md"
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
                    onClick={() => setVoiceMode('hold')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors cursor-pointer ${
                      voiceMode === 'hold' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                    }`}
                  >
                    按住说话
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceMode('open')}
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

              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>麦克风收音良好</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
