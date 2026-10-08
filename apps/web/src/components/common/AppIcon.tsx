import React from 'react';
import {
  Hash,
  Eye,
  HelpCircle,
  MessageSquare,
  MessagesSquare,
  LogOut,
  Lightbulb,
  Sparkles,
  PartyPopper,
  Trophy,
  Smile,
  Search,
  Send,
  XCircle,
  X,
  Timer,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Megaphone,
  Hand,
  ArrowLeft,
  Undo2,
  Redo2,
  Trash2,
  Eraser,
  PenTool,
  Palette,
  RotateCw,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Hourglass,
  Crown,
  Check,
  LucideProps,
} from 'lucide-react';

export type IconName =
  | 'tag'
  | 'visibility'
  | 'help'
  | 'chat'
  | 'forum'
  | 'logout'
  | 'lightbulb'
  | 'tips_and_updates'
  | 'auto_awesome'
  | 'celebration'
  | 'leaderboard'
  | 'add_reaction'
  | 'sentiment_satisfied'
  | 'search'
  | 'send'
  | 'cancel'
  | 'close'
  | 'timer'
  | 'mic'
  | 'mic_none'
  | 'mic_off'
  | 'volume_up'
  | 'volume_off'
  | 'campaign'
  | 'touch_app'
  | 'arrow_back'
  | 'undo'
  | 'redo'
  | 'delete_sweep'
  | 'ink_eraser'
  | 'edit'
  | 'palette'
  | 'autorenew'
  | 'fullscreen'
  | 'fullscreen_exit'
  | 'open_in_full'
  | 'open_in_new'
  | 'expand_less'
  | 'expand_more'
  | 'hourglass_top'
  | 'crown'
  | 'check';

const ICON_MAP: Record<IconName, React.ComponentType<LucideProps>> = {
  tag: Hash,
  visibility: Eye,
  help: HelpCircle,
  chat: MessageSquare,
  forum: MessagesSquare,
  logout: LogOut,
  lightbulb: Lightbulb,
  tips_and_updates: Sparkles,
  auto_awesome: Sparkles,
  celebration: PartyPopper,
  leaderboard: Trophy,
  add_reaction: Smile,
  sentiment_satisfied: Smile,
  search: Search,
  send: Send,
  cancel: XCircle,
  close: X,
  timer: Timer,
  mic: Mic,
  mic_none: Mic,
  mic_off: MicOff,
  volume_up: Volume2,
  volume_off: VolumeX,
  campaign: Megaphone,
  touch_app: Hand,
  arrow_back: ArrowLeft,
  undo: Undo2,
  redo: Redo2,
  delete_sweep: Trash2,
  ink_eraser: Eraser,
  edit: PenTool,
  palette: Palette,
  autorenew: RotateCw,
  fullscreen: Maximize2,
  fullscreen_exit: Minimize2,
  open_in_full: Maximize2,
  open_in_new: ExternalLink,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  hourglass_top: Hourglass,
  crown: Crown,
  check: Check,
};

export interface AppIconProps extends LucideProps {
  name: IconName | string;
}

/**
 * Universal vector SVG icon component for Idavoll.
 * Replaces fragile external web fonts (Material Symbols ligatures) with robust,
 * bundled SVG vectors that never fail to render, never leak ligature text,
 * and always maintain functional recognition even in offline/firewalled networks.
 */
export const AppIcon: React.FC<AppIconProps> = ({ name, className = 'w-4 h-4', ...props }) => {
  const IconComponent = ICON_MAP[name as IconName] || Sparkles;
  return <IconComponent className={className} aria-hidden="true" {...props} />;
};
