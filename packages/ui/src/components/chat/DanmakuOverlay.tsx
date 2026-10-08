import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DanmakuItem } from '@idavoll/protocol';

export interface DanmakuOverlayProps {
  items: DanmakuItem[];
  enabled?: boolean;
}

export const DanmakuOverlay: React.FC<DanmakuOverlayProps> = ({ items, enabled = true }) => {
  const [activeDanmakus, setActiveDanmakus] = useState<DanmakuItem[]>([]);

  useEffect(() => {
    if (!enabled || items.length === 0) return;
    const latest = items[items.length - 1];
    setActiveDanmakus((prev) => [...prev.slice(-15), latest]);

    const timer = setTimeout(() => {
      setActiveDanmakus((prev) => prev.filter((d) => d.id !== latest.id));
    }, 6000);

    return () => clearTimeout(timer);
  }, [items, enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {activeDanmakus.map((d) => (
          <motion.div
            key={d.id}
            initial={{ x: '100vw', opacity: 0.95 }}
            animate={{ x: '-100%' }}
            exit={{ opacity: 0 }}
            className="absolute whitespace-nowrap px-4 py-1.5 rounded-full font-black text-sm tracking-wide text-white shadow-lg flex items-center gap-2 border border-white/20 backdrop-blur-md"
            style={{
              top: `${Math.max(8, Math.min(82, d.topPercent))}%`,
              backgroundColor: d.color ? `${d.color}E6` : '#5B5BF0E6',
              position: 'absolute',
            }}
          >
            <span className="opacity-80 text-xs font-normal">[{d.senderNickname}]</span>
            <span>{d.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
