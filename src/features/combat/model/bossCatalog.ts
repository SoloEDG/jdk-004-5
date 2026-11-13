import type { BossPhase } from "../../../shared/types";
/** Health thresholds are advisory only: they queue a phase at the next cycle end. */
export const BOSS_CATALOG = {
  name: "虚空使徒 · NULL APOSTLE",
  maxHp: 4200,
  radius: 58,
  contactDamage: 26,
  bodyMultiplier: 0.3,
  weakMultiplier: 2,
  phase: {
    1: {
      cycleDuration: 4,
      weakPoints: 2,
      orbitRadius: 78,
      orbitSpeed: 0.9,
      warningDamage: 18,
      warningRadius: 62,
      volleys: 2,
    },
    2: {
      cycleDuration: 3.2,
      weakPoints: 3,
      orbitRadius: 86,
      orbitSpeed: 1.4,
      warningDamage: 22,
      warningRadius: 54,
      volleys: 3,
    },
    3: {
      cycleDuration: 2.6,
      weakPoints: 4,
      orbitRadius: 94,
      orbitSpeed: 2,
      warningDamage: 27,
      warningRadius: 46,
      volleys: 3,
    },
  } as Record<
    BossPhase,
    {
      cycleDuration: number;
      weakPoints: number;
      orbitRadius: number;
      orbitSpeed: number;
      warningDamage: number;
      warningRadius: number;
      volleys: number;
    }
  >,
} as const;

/** A tide that must be fully cleared before the boss takes over the arena. */
export const BOSS_TIDE_WAVE = 8;
export const PHASE_LABELS: Record<BossPhase, string> = {
  1: "相位展开",
  2: "弱点过载",
  3: "终焉脉冲",
};
export const phaseForHealth = (ratio: number): BossPhase =>
  ratio <= 1 / 3 ? 3 : ratio <= 2 / 3 ? 2 : 1;
