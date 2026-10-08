import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile } from '@idavoll/protocol';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';

export interface VoiceDockProps {
  players: UserProfile[];
  currentUserId: string;
  isMuted: boolean;
  onToggleMute: () => void;
  isDeafened?: boolean;
  onToggleDeafen?: () => void;
  speakingUserIds?: string[];
  className?: string;
}

export const VoiceDock: React.FC<VoiceDockProps> = ({
  players,
  currentUserId,
  isMuted,
  onToggleMute,
  isDeafened = false,
  onToggleDeafen,
  speakingUserIds = [],
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 bg-card/90 backdrop-blur-md rounded-2xl border border-border shadow-sm ${className}`}>
      {/* Active Voice Speakers */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mr-1">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">语音频道</span>
        </div>

        {players.map((player) => {
          const isSpeaking = speakingUserIds.includes(player.id);
          return (
            <div key={player.id} className="relative group" title={`${player.nickname} ${player.micMuted ? '(静音)' : ''}`}>
              <div className={`relative rounded-full transition-all ${isSpeaking ? 'ring-2 ring-emerald-500 scale-105' : ''}`}>
                <Avatar src={player.avatar} alt={player.nickname} size="sm" />
                {player.micMuted && (
                  <span className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow">
                    <MicOff className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice Controls */}
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={isMuted ? 'secondary' : 'default'}
          onClick={onToggleMute}
          className="h-8 px-3 gap-1 text-xs"
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMuted ? '开麦' : '静音'}</span>
        </Button>

        {onToggleDeafen && (
          <Button
            type="button"
            size="icon"
            variant="surface"
            onClick={onToggleDeafen}
            className="h-8 w-8 text-muted-foreground"
            title={isDeafened ? '取消闭音' : '闭音'}
          >
            {isDeafened ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
};
