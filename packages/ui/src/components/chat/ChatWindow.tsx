import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Sparkles, Volume2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@idavoll/protocol';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';

export interface ChatWindowLabels {
  title?: string;
  placeholder?: string;
  danmakuOn?: string;
  danmakuOff?: string;
  empty?: string;
  quickEmoji?: string;
  send?: string;
}

export interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string, isDanmaku?: boolean) => void;
  title?: string;
  placeholder?: string;
  enableDanmakuToggle?: boolean;
  isDanmakuDefault?: boolean;
  className?: string;
  aboveInputSlot?: React.ReactNode;
  labels?: ChatWindowLabels;
}

const QUICK_EMOJIS = ['🎉', '👏', '🎨', '🔥', '🤔', '🤣', '❤️', '💡'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  title,
  placeholder,
  enableDanmakuToggle = true,
  isDanmakuDefault = false,
  className = '',
  aboveInputSlot,
  labels,
}) => {
  const displayTitle = labels?.title ?? title ?? '房间聊天';
  const displayPlaceholder = labels?.placeholder ?? placeholder ?? '发消息或猜答案...';
  const danmakuOnText = labels?.danmakuOn ?? '🚀 弹幕模式开启';
  const danmakuOffText = labels?.danmakuOff ?? '弹幕已关';
  const emptyText = labels?.empty ?? '还没有发言，快发条消息热热场吧~';
  const quickEmojiTitle = labels?.quickEmoji ?? '快捷表情';
  const sendText = labels?.send ?? '发送';
  const [inputText, setInputText] = useState('');
  const [isDanmaku, setIsDanmaku] = useState(isDanmakuDefault);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), isDanmaku);
    setInputText('');
  };

  const handleQuickEmoji = (emoji: string) => {
    onSendMessage(emoji, isDanmaku);
    setShowEmojiPicker(false);
  };

  return (
    <div className={`flex flex-col h-full min-h-0 bg-card/95 backdrop-blur-md rounded-3xl border border-border shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-muted/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2EC4A6] animate-pulse" />
          <h4 className="font-extrabold text-base text-foreground tracking-tight">{displayTitle}</h4>
        </div>

        {enableDanmakuToggle && (
          <button
            type="button"
            onClick={() => setIsDanmaku(!isDanmaku)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isDanmaku
                ? 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {isDanmaku ? danmakuOnText : danmakuOffText}
          </button>
        )}
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <Sparkles className="w-8 h-8 text-[var(--theme-primary,#5B5BF0)]/50 mb-2" />
            <p className="text-sm font-medium">{emptyText}</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const isSystem = msg.payload.type === 'system';
          const isCorrect = msg.payload.type === 'correct_guess';

          if (isSystem || isCorrect) {
            return (
              <motion.div
                key={msg.payload.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <div
                  className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                    isCorrect
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {msg.payload.content}
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={msg.payload.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isMe && (
                <Avatar
                  src={msg.payload.senderAvatar}
                  alt={msg.payload.senderNickname}
                  size="sm"
                />
              )}

              <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-[11px] font-bold text-muted-foreground mb-1 ml-1">
                    {msg.payload.senderNickname}
                  </span>
                )}

                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm font-medium break-words shadow-sm ${
                    isMe
                      ? 'bg-[var(--theme-primary,#5B5BF0)] text-white rounded-br-sm'
                      : 'bg-background text-foreground border border-border/80 rounded-bl-sm'
                  }`}
                >
                  {msg.payload.content}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick emoji drawer */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-t border-border/60 overflow-x-auto"
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleQuickEmoji(emoji)}
                className="text-xl p-1.5 hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot above input (e.g. Mic / Voice controls) */}
      {aboveInputSlot && (
        <div className="shrink-0">
          {aboveInputSlot}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-border/80 bg-background/80 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          title={quickEmojiTitle}
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={displayPlaceholder}
          className="flex-1 bg-muted/50 rounded-full px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary,#5B5BF0)]"
        />

        <Button type="submit" size="sm" className="h-9 px-4 gap-1.5">
          <Send className="w-3.5 h-3.5" />
          <span>{sendText}</span>
        </Button>
      </form>
    </div>
  );
};
