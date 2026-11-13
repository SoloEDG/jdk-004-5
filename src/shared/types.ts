export type Vec = { x: number; y: number };
export type Phase = "ready" | "playing" | "paused" | "upgrade" | "ended";
export type WeaponId = "pulse" | "orbit" | "nova";
export type Stage = "tide" | "boss" | "cleared";
export type BossPhase = 1 | 2 | 3;
export type RunOutcome = "victory" | "defeat" | "mutual";
export interface Player extends Vec {
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  invincible: number;
}
export interface Enemy extends Vec {
  id: number;
  kind: "chaser" | "shooter" | "elite";
  hp: number;
  maxHp: number;
  radius: number;
  cooldown: number;
}
export interface Bullet extends Vec {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  owner: "player" | "enemy";
  weapon: WeaponId | "enemy";
  pierce: number;
  hit: number[];
  /** One projectile may damage the boss once, even through overlapping weak points. */
  bossHit?: boolean;
}
export interface WeakPoint {
  id: number;
  radius: number;
  angle: number;
  orbitRadius: number;
}
export interface BossWarning extends Vec {
  id: number;
  radius: number;
  damage: number;
  duration: number;
  /** Counts down while telegraphed; negative values are the detonation fade. */
  remaining: number;
}
export interface Boss extends Vec {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  radius: number;
  phase: BossPhase;
  /** Phase queued by a health threshold, applied only after a completed attack cycle. */
  pendingPhase: BossPhase | 0;
  /** Completed attack cycles; phase changes are only allowed on these boundaries. */
  cycle: number;
  /** Volley slots already fired in the current cycle, so a large dt cannot double-fire one. */
  volley: number;
  /** Monotonic orbit clock; advances only inside stepBoss so a freeze keeps weak points aligned. */
  spin: number;
  attackTime: number;
  cycleDuration: number;
  weakPoints: WeakPoint[];
  warnings: BossWarning[];
  defeated: boolean;
  flash: number;
  phaseFlash: number;
}
export interface Drop extends Vec {
  id: number;
  kind: "xp" | "heal" | "magnet";
  value: number;
  life: number;
}
export interface Weapon {
  id: WeaponId;
  level: number;
  cooldown: number;
}
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  category: string;
  max: number;
}
export interface RunStats {
  kills: number;
  damage: number;
  taken: number;
  collected: number;
  shots: number;
  byWeapon: Record<WeaponId, number>;
  /** Effective boss damage (clamped to remaining health, never overkill). */
  bossDamage: number;
  /** Portion of bossDamage scored on a weak point. */
  weakDamage: number;
  /** Weak-point damage attributed per weapon for segmented settlement. */
  weakByWeapon: Record<WeaponId, number>;
}
export interface RunRecord {
  id: string;
  duration: number;
  wave: number;
  level: number;
  kills: number;
  damage: number;
  weapons: string[];
  victory: boolean;
  outcome?: RunOutcome;
  bossPhase?: number;
  bossDamage?: number;
  weakDamage?: number;
}
export interface GameDoc {
  version: 1;
  seed: number;
  initialSeed: number;
  nextId: number;
  phase: Phase;
  time: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  drops: Drop[];
  weapons: Weapon[];
  upgrades: Record<string, number>;
  choices: string[];
  xp: number;
  level: number;
  pendingLevels: number;
  wave: number;
  waveTime: number;
  spawnBudget: number;
  stage: Stage;
  boss: Boss | null;
  outcome: RunOutcome | null;
  stats: RunStats;
  records: RunRecord[];
  notice: string;
  victory: boolean;
}
export interface Input {
  x: number;
  y: number;
  aim: Vec;
  firing: boolean;
}
export interface KillEvent {
  enemy: Enemy;
  weapon: WeaponId;
}
export interface FrameEvents {
  weaponDamage?: Partial<Record<WeaponId, number>>;
  bossDamage?: number;
  weakDamage?: number;
  weakByWeapon?: Partial<Record<WeaponId, number>>;
  bossDefeated?: boolean;
  kills: KillEvent[];
  damage: number;
  taken: number;
  shots: number;
  collected: number;
}
export const WIDTH = 1000;
export const HEIGHT = 650;
