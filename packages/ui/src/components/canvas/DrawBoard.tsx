import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import { DrawStroke, Point } from '@idavoll/protocol';

export interface DrawBoardProps {
  strokes: DrawStroke[];
  onStrokeComplete?: (stroke: DrawStroke) => void;
  onStrokeAppend?: (strokeId: string, point: Point) => void;
  onStrokeUpdate?: (stroke: DrawStroke) => void;
  currentColor?: string;
  currentSize?: number;
  isEraser?: boolean;
  isDrawer?: boolean;
  disabled?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const DrawBoard: React.FC<DrawBoardProps> = ({
  strokes,
  onStrokeComplete,
  onStrokeAppend,
  onStrokeUpdate,
  currentColor = '#161A30',
  currentSize = 8,
  isEraser = false,
  isDrawer = false,
  disabled = false,
  width = 800,
  height = 600,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const currentStrokeIdRef = useRef<string>('');
  const lastEmitTimeRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);

  const [boxSize, setBoxSize] = useState<{ width: number; height: number }>({
    width,
    height,
  });

  const canDraw = isDrawer && !disabled;

  // Measure container and compute true 4:3 letterbox fit dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateFit = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw <= 0 || ch <= 0) return;

      const targetAspect = 4 / 3;
      let fitW = cw;
      let fitH = cw / targetAspect;

      if (fitH > ch) {
        fitH = ch;
        fitW = ch * targetAspect;
      }

      setBoxSize({
        width: Math.max(1, Math.floor(fitW)),
        height: Math.max(1, Math.floor(fitH)),
      });
    };

    calculateFit();
    const ro = new ResizeObserver(calculateFit);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const renderStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: DrawStroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      const outline = getStroke(stroke.points as any, {
        size: stroke.size,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      });

      if (outline.length === 0) return;

      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i++) {
        ctx.lineTo(outline[i][0], outline[i][1]);
      }
      ctx.closePath();

      if (stroke.isEraser) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = stroke.color;
        ctx.fill();
      }
    },
    []
  );

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenCanvasRef.current;
    if (offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
    }
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Render strokes on transparent offscreen layer so erasers punch through cleanly
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);

    for (const stroke of strokes) {
      renderStroke(offCtx, stroke);
    }

    // Draw active drawing stroke if drawer is currently drawing
    if (isDrawingRef.current && currentPointsRef.current.length > 0) {
      renderStroke(offCtx, {
        id: currentStrokeIdRef.current,
        points: currentPointsRef.current,
        color: currentColor,
        size: currentSize,
        isEraser,
        timestamp: Date.now(),
      });
    }

    // Composite onto main canvas with permanent white paper background (always white in dark mode and after eraser)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0);
  }, [strokes, renderStroke, currentColor, currentSize, isEraser]);

  useEffect(() => {
    redrawAll();
  }, [strokes, redrawAll]);

  // Cancel active stroke and pointer capture when canDraw becomes false
  useEffect(() => {
    if (!canDraw && isDrawingRef.current) {
      isDrawingRef.current = false;
      currentPointsRef.current = [];
      const canvas = canvasRef.current;
      if (canvas && activePointerIdRef.current !== null) {
        try {
          canvas.releasePointerCapture(activePointerIdRef.current);
        } catch {
          // ignore
        }
        activePointerIdRef.current = null;
      }
      redrawAll();
    }
  }, [canDraw, redrawAll]);

  // Pointer event handlers with strict bounds clamping to [0, width] x [0, height]
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    activePointerIdRef.current = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;
    const x = Math.max(0, Math.min(canvas.width, Math.round(rawX * 10) / 10));
    const y = Math.max(0, Math.min(canvas.height, Math.round(rawY * 10) / 10));
    const pressure = Math.max(0, Math.min(1, e.pressure || 0.5));

    const newPoint: Point = [x, y, pressure];
    const newId = `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    currentStrokeIdRef.current = newId;
    currentPointsRef.current = [newPoint];
    lastEmitTimeRef.current = Date.now();

    if (onStrokeAppend) {
      onStrokeAppend(newId, newPoint);
    }
    if (onStrokeUpdate) {
      onStrokeUpdate({
        id: newId,
        points: [newPoint],
        color: currentColor,
        size: currentSize,
        isEraser,
        timestamp: Date.now(),
      });
    }
    redrawAll();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;
    const x = Math.max(0, Math.min(canvas.width, Math.round(rawX * 10) / 10));
    const y = Math.max(0, Math.min(canvas.height, Math.round(rawY * 10) / 10));
    const pressure = Math.max(0, Math.min(1, e.pressure || 0.5));

    const newPoint: Point = [x, y, pressure];
    currentPointsRef.current.push(newPoint);

    // Segment long strokes if points reach 1000 (well within 2048 limit)
    if (currentPointsRef.current.length >= 1000) {
      if (onStrokeComplete) {
        onStrokeComplete({
          id: currentStrokeIdRef.current,
          points: [...currentPointsRef.current],
          color: currentColor,
          size: currentSize,
          isEraser,
          timestamp: Date.now(),
        });
      }
      const segmentId = `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      currentStrokeIdRef.current = segmentId;
      currentPointsRef.current = [newPoint];
    }

    if (onStrokeAppend) {
      onStrokeAppend(currentStrokeIdRef.current, newPoint);
    }

    // Throttle live stroke updates to ~30Hz (33ms)
    const now = Date.now();
    if (now - lastEmitTimeRef.current >= 33) {
      lastEmitTimeRef.current = now;
      if (onStrokeUpdate) {
        onStrokeUpdate({
          id: currentStrokeIdRef.current,
          points: [...currentPointsRef.current],
          color: currentColor,
          size: currentSize,
          isEraser,
          timestamp: now,
        });
      }
    }

    redrawAll();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (canvas && activePointerIdRef.current !== null) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture release ignored
      }
      activePointerIdRef.current = null;
    }
    isDrawingRef.current = false;

    if (currentPointsRef.current.length > 0) {
      const finalStroke: DrawStroke = {
        id: currentStrokeIdRef.current,
        points: [...currentPointsRef.current],
        color: currentColor,
        size: currentSize,
        isEraser,
        timestamp: Date.now(),
      };
      // If onStrokeComplete is provided, call only once on pointerup. Otherwise fallback to onStrokeUpdate.
      if (onStrokeComplete) {
        onStrokeComplete(finalStroke);
      } else if (onStrokeUpdate) {
        onStrokeUpdate(finalStroke);
      }
    }
    currentPointsRef.current = [];
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-inner ${className}`}
    >
      <div
        style={{ width: `${boxSize.width}px`, height: `${boxSize.height}px` }}
        className="relative flex items-center justify-center shrink-0 bg-white rounded-lg shadow-sm overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ backgroundColor: '#ffffff' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full block touch-none bg-white ${canDraw ? 'cursor-crosshair' : 'cursor-default'}`}
        />
      </div>
    </div>
  );
};
