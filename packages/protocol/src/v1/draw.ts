import { z } from 'zod';
import { BaseMessageSchema } from './common';

export const PointSchema = z.tuple([z.number().finite().min(0).max(4096), z.number().finite().min(0).max(4096), z.number().min(0).max(1).optional()]);
export type Point = z.infer<typeof PointSchema>;

export const DrawStrokeSchema = z.object({
  id: z.string().min(1).max(100),
  points: z.array(PointSchema).min(1).max(2048),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  size: z.number().finite().min(1).max(64),
  isEraser: z.boolean().default(false),
  timestamp: z.number(),
});

export type DrawStroke = z.infer<typeof DrawStrokeSchema>;

export const DrawEventSchema = BaseMessageSchema.extend({
  type: z.enum(['draw:stroke_append', 'draw:stroke_complete', 'draw:clear', 'draw:undo']),
  payload: z.object({
    stroke: DrawStrokeSchema.optional(),
    strokeId: z.string().optional(),
    points: z.array(PointSchema).optional(),
  }),
});

export type DrawEvent = z.infer<typeof DrawEventSchema>;
