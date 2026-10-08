import { z } from 'zod';
import { BaseMessageSchema } from './common';

export const PointSchema = z.tuple([z.number(), z.number(), z.number().optional()]); // [x, y, pressure]
export type Point = z.infer<typeof PointSchema>;

export const DrawStrokeSchema = z.object({
  id: z.string(),
  points: z.array(PointSchema),
  color: z.string(),
  size: z.number(),
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
