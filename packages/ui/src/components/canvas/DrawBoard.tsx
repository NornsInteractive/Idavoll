import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import { DrawStroke, Point } from '@idavoll/protocol';

export interface DrawBoardProps {
  strokes: DrawStroke[];
  onStrokeComplete?: (stroke: DrawStroke) => void;
  onStrokeAppend?: (strokeId: string, point: Point) => void;
  currentColor?: string;
  currentSize?: number;
  isEraser?: boolean;
  isDrawer?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const DrawBoard: React.FC<DrawBoardProps> = ({
  strokes,
  onStrokeComplete,
  onStrokeAppend,
  currentColor = '#161A30',
  currentSize = 8,
  isEraser = false,
  isDrawer = false,
  width = 800,
  height = 600,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const currentStrokeIdRef = useRef<string>('');

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      renderStroke(ctx, stroke);
    }

    // Draw active drawing stroke if drawer is currently drawing
    if (isDrawingRef.current && currentPointsRef.current.length > 0) {
      renderStroke(ctx, {
        id: currentStrokeIdRef.current,
        points: currentPointsRef.current,
        color: currentColor,
        size: currentSize,
        isEraser,
        timestamp: Date.now(),
      });
    }
  }, [strokes, renderStroke, currentColor, currentSize, isEraser]);

  useEffect(() => {
    redrawAll();
  }, [strokes, redrawAll]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure || 0.5;

    const newPoint: Point = [x, y, pressure];
    const newId = `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    currentStrokeIdRef.current = newId;
    currentPointsRef.current = [newPoint];

    if (onStrokeAppend) {
      onStrokeAppend(newId, newPoint);
    }
    redrawAll();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure || 0.5;

    const newPoint: Point = [x, y, pressure];
    currentPointsRef.current.push(newPoint);

    if (onStrokeAppend) {
      onStrokeAppend(currentStrokeIdRef.current, newPoint);
    }
    redrawAll();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture release ignored
      }
    }
    isDrawingRef.current = false;

    if (currentPointsRef.current.length > 0 && onStrokeComplete) {
      onStrokeComplete({
        id: currentStrokeIdRef.current,
        points: [...currentPointsRef.current],
        color: currentColor,
        size: currentSize,
        isEraser,
        timestamp: Date.now(),
      });
    }
    currentPointsRef.current = [];
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none bg-white dark:bg-slate-900 rounded-3xl border border-border shadow-inner ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full object-contain touch-none ${isDrawer ? 'cursor-crosshair' : 'cursor-default'}`}
      />
    </div>
  );
};
