import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DanmakuItem } from '@idavoll/protocol';

export interface DanmakuOverlayProps {
  items: DanmakuItem[];
  enabled?: boolean;
  className?: string;
}

export const DanmakuOverlay: React.FC<DanmakuOverlayProps> = ({
  items,
  enabled = true,
  className = '',
}) => {
  const [activeDanmakus, setActiveDanmakus] = useState<DanmakuItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isInitializedRef = useRef(false);

  // Initialize with existing items so historical snapshots are not replayed on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      items.forEach((item) => seenIdsRef.current.add(item.id));
      return;
    }

    if (!enabled) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
      setActiveDanmakus([]);
      return;
    }

    // Capture all incoming items that haven't been shown yet (supports batch & continuous updates)
    const newItems = items.filter((item) => !seenIdsRef.current.has(item.id));
    if (newItems.length === 0) return;

    newItems.forEach((item) => {
      seenIdsRef.current.add(item.id);

      // Dedicated safety timeout per item without clearing siblings
      const timer = setTimeout(() => {
        setActiveDanmakus((prev) => prev.filter((d) => d.id !== item.id));
        timersRef.current.delete(item.id);
      }, 11000);
      timersRef.current.set(item.id, timer);
    });

    setActiveDanmakus((prev) => [...prev.slice(-25), ...newItems]);
  }, [items, enabled]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-20 ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {activeDanmakus.map((d) => {
          const isDefaultThemeColor = !d.color || d.color.toUpperCase() === '#5B5BF0';
          return (
            <motion.div
              key={d.id}
              initial={{ x: '100vw', opacity: 0.85 }}
              animate={{ x: '-100%', opacity: 0.85 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 10,
                ease: 'linear',
              }}
              onAnimationComplete={() => {
                const timer = timersRef.current.get(d.id);
                if (timer) {
                  clearTimeout(timer);
                  timersRef.current.delete(d.id);
                }
                setActiveDanmakus((prev) => prev.filter((item) => item.id !== d.id));
              }}
              className="absolute whitespace-nowrap px-3.5 py-1 rounded-full font-bold text-xs sm:text-sm tracking-wide text-white/95 shadow-xs flex items-center gap-1.5 border backdrop-blur-xs pointer-events-none select-none"
              style={{
                top: `${Math.max(8, Math.min(82, d.topPercent))}%`,
                backgroundColor: isDefaultThemeColor
                  ? 'color-mix(in srgb, var(--theme-primary, #5B5BF0) 55%, transparent)'
                  : `${d.color?.slice(0, 7)}66`,
                borderColor: isDefaultThemeColor
                  ? 'color-mix(in srgb, var(--theme-primary, #5B5BF0) 40%, rgba(255, 255, 255, 0.25))'
                  : `${d.color?.slice(0, 7)}88`,
                position: 'absolute',
              }}
            >
              <span className="opacity-80 text-xs font-normal">[{d.senderNickname}]</span>
              <span>{d.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
