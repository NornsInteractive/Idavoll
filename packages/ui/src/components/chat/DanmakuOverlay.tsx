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
    setActiveDanmakus((prev) => {
      if (prev.some((d) => d.id === latest.id)) return prev;
      return [...prev.slice(-20), latest];
    });

    const timer = setTimeout(() => {
      setActiveDanmakus((prev) => prev.filter((d) => d.id !== latest.id));
    }, 11000);

    return () => clearTimeout(timer);
  }, [items, enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {activeDanmakus.map((d) => (
          <motion.div
            key={d.id}
            initial={{ x: '100vw', opacity: 0.7 }}
            animate={{ x: '-100%', opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 10,
              ease: 'linear',
            }}
            onAnimationComplete={() => {
              setActiveDanmakus((prev) => prev.filter((item) => item.id !== d.id));
            }}
            className="absolute whitespace-nowrap px-3.5 py-1 rounded-full font-bold text-xs sm:text-sm tracking-wide text-white/95 shadow-xs flex items-center gap-1.5 border border-white/20 backdrop-blur-xs pointer-events-none"
            style={{
              top: `${Math.max(8, Math.min(82, d.topPercent))}%`,
              backgroundColor: d.color ? `${d.color.slice(0, 7)}66` : 'rgba(91, 91, 240, 0.40)',
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
