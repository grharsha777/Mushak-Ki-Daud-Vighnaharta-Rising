/**
 * zodSchemas.js
 * Zod validation schemas for all structured data that enters the game
 * from external sources (localStorage, level config JSON).
 *
 * On validation failure: log a warning and fall back to safe defaults.
 * Never hard-crash the game due to bad external data.
 */

import { z } from 'zod';

// ─── Save Data Schema ────────────────────────────────────────────────────────
export const SaveDataSchema = z.object({
  highScore:            z.number().int().nonnegative().default(0),
  bestCombo:            z.number().int().nonnegative().default(0),
  totalModaksCollected: z.number().int().nonnegative().default(0),
  biomesReached:        z.array(z.string()).default(['himalaya']),
  settings: z.object({
    soundOn:       z.boolean().default(true),
    controlScheme: z.enum(['swipe', 'tapzone']).default('swipe'),
    difficulty:    z.enum(['easy', 'normal', 'hard']).default('normal'),
  }).default({}),
  schemaVersion: z.number().int().positive().default(1),
}).default({});

export const DEFAULT_SAVE = {
  highScore:            0,
  bestCombo:            0,
  totalModaksCollected: 0,
  biomesReached:        ['himalaya'],
  settings: {
    soundOn:       true,
    controlScheme: 'swipe',
    difficulty:    'normal',
  },
  schemaVersion: 1,
};

// ─── Level Config Schema ─────────────────────────────────────────────────────
const ObstacleEntrySchema = z.object({
  type:   z.string(),
  weight: z.number().min(0).max(1),
  lanes:  z.array(z.number().int().min(0).max(2)),
});

const CollectibleEntrySchema = z.object({
  type:   z.string(),
  weight: z.number().min(0).max(1),
  value:  z.number().int().positive(),
});

const BiomeConfigSchema = z.object({
  biome:                  z.string(),
  baseSpeed:              z.number().positive(),
  speedRampPerSecond:     z.number().nonnegative(),
  obstacleSpawnInterval:  z.number().positive(),
  obstacleSpawnTable:     z.array(ObstacleEntrySchema),
  collectibleSpawnTable:  z.array(CollectibleEntrySchema),
});

export const LevelConfigSchema = z.object({
  biomes: z.object({
    himalaya: BiomeConfigSchema,
    jungle:   BiomeConfigSchema,
  }),
  laneSplitDistance:      z.number().positive(),
  laneSplitDuration:      z.number().positive(),
  trainSequenceDistance:  z.number().positive(),
  trainSequenceDuration:  z.number().positive(),
  bossTriggerDistance:    z.number().positive(),
  difficultyModifiers: z.object({
    easy:   z.object({ speedMult: z.number(), obstacleMult: z.number(), spawnIntervalMult: z.number() }),
    normal: z.object({ speedMult: z.number(), obstacleMult: z.number(), spawnIntervalMult: z.number() }),
    hard:   z.object({ speedMult: z.number(), obstacleMult: z.number(), spawnIntervalMult: z.number() }),
  }),
});

// ─── Boss Sequence Schema ─────────────────────────────────────────────────────
export const BossSequenceSchema = z.object({
  totalDuration: z.number().positive(),
  steps: z.array(z.object({
    t:      z.number().nonnegative(),
    action: z.string(),
    desc:   z.string().optional(),
  })),
});

// ─── Demon Type Schema ────────────────────────────────────────────────────────
export const DemonTypeSchema = z.array(z.object({
  id:          z.string(),
  color:       z.string(),
  behavior:    z.string(),
  spawnLane:   z.string(),
  cooldown:    z.number().positive(),
  throwSpeed:  z.number().positive(),
  scale:       z.number().positive(),
  description: z.string().optional(),
}));

// ─── Helper: safe parse with fallback ────────────────────────────────────────
export function safeParse(schema, data, fallback, label = 'data') {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[Zod] ${label} validation failed — using safe defaults.`, result.error.format());
    return fallback ?? schema.parse(undefined);
  }
  return result.data;
}
