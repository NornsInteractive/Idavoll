import React from 'react';
import { Eraser, RotateCcw, Trash2, Paintbrush } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';

export interface PaletteBarProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  currentSize: number;
  onSizeChange: (size: number) => void;
  isEraser: boolean;
  onEraserToggle: (isEraser: boolean) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

const COLOR_SWATCHES = [
  '#161A30', // Dark Navy / Charcoal
  '#5B5BF0', // Vibrant Indigo
  '#FF6B5E', // Warm Coral
  '#2EC4A6', // Mint
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#3B82F6', // Sky Blue
  '#10B981', // Emerald
  '#6B7280', // Gray
];

const STROKE_SIZES = [4, 8, 14, 22];

export const PaletteBar: React.FC<PaletteBarProps> = ({
  currentColor,
  onColorChange,
  currentSize,
  onSizeChange,
  isEraser,
  onEraserToggle,
  onUndo,
  onClear,
  canUndo,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-card/90 backdrop-blur-md rounded-2xl border border-border shadow-sm max-w-full overflow-hidden">
      {/* Colors Swatches (Scrollable row) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink min-w-0 pr-1">
        {COLOR_SWATCHES.map((color) => {
          const isSelected = !isEraser && currentColor.toLowerCase() === color.toLowerCase();
          return (
            <motion.button
              key={color}
              type="button"
              disabled={disabled}
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                onEraserToggle(false);
                onColorChange(color);
              }}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-transform cursor-pointer shrink-0 shadow-xs ${
                isSelected
                  ? 'border-[var(--theme-primary,#5B5BF0)] dark:border-white scale-110 ring-2 ring-[var(--theme-primary,#5B5BF0)]/60'
                  : 'border-white/80 dark:border-white/20 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          );
        })}
      </div>

      {/* Tool actions and sizes */}
      <div className="flex items-center gap-2">
        {/* Stroke sizes */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full">
          {STROKE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              disabled={disabled}
              onClick={() => onSizeChange(size)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                currentSize === size && !isEraser
                  ? 'bg-background shadow text-primary font-bold'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              title={`笔刷大小: ${size}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: `${Math.min(size + 2, 14)}px`, height: `${Math.min(size + 2, 14)}px` }}
              />
            </button>
          ))}
        </div>

        {/* Eraser */}
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          variant={isEraser ? 'default' : 'surface'}
          onClick={() => onEraserToggle(!isEraser)}
          className="h-9 px-3 gap-1.5"
          title="橡皮擦"
        >
          <Eraser className="w-4 h-4" />
          <span className="hidden sm:inline">橡皮擦</span>
        </Button>

        {/* Undo */}
        <Button
          type="button"
          size="icon"
          variant="surface"
          disabled={disabled || !canUndo}
          onClick={onUndo}
          className="h-9 w-9"
          title="撤销"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Clear */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          onClick={onClear}
          className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          title="清空画板"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
