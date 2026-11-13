import type {
  Boss,
  BossPhase,
  GameDoc,
  WeakPoint,
} from "../../../shared/types";
import { WIDTH, HEIGHT } from "../../../shared/types";
import { clamp, distance, normalize } from "../../../shared/math";
import { hurtPlayer } from "./health";
import {
  BOSS_CATALOG,
  PHASE_LABELS,
  phaseForHealth,
} from "./bossCatalog";

const TELEGRAPH = 0.9;
const FADE = 0.45;

export function beginBossEncounter(doc: GameDoc): Boss {
  const data = BOSS_CATALOG,
    shape = data.phase[1];
  const boss: Boss = {
    id: doc.nextId++,
    name: data.name,
    x: clamp(doc.player.x, 180, WIDTH - 180),
    y: clamp(Math.min(doc.player.y - 230, 210), 130, HEIGHT - 180),
    hp: data.maxHp,
    maxHp: data.maxHp,
    radius: data.radius,
    phase: 1,
    pendingPhase: 0,
    cycle: 0,
    volley: 0,
    spin: 0,
    attackTime: 0,
    cycleDuration: shape.cycleDuration,
    weakPoints: buildWeakPoints(doc, 1),
    warnings: [],
    defeated: false,
    flash: 0,
    phaseFlash: 0,
  };
  doc.stage = "boss";
  doc.boss = boss;
  // The tide is over: the arena belongs to the boss alone.
  doc.enemies = [];
  doc.spawnBudget = 0;
  doc.bullets = doc.bullets.filter((b) => b.owner === "player");
  doc.notice = "敌潮终止 · 首领接管战场";
  return boss;
}

export function buildWeakPoints(doc: GameDoc, phase: BossPhase): WeakPoint[] {
  const shape = BOSS_CATALOG.phase[phase];
  return Array.from({ length: shape.weakPoints }, (_, i) => ({
    id: doc.nextId++,
    radius: 15 - phase,
    angle: (i * Math.PI * 2) / shape.weakPoints,
    orbitRadius: shape.orbitRadius,
  }));
}

/** Weak points orbit deterministically from battle time, so a freeze keeps them aligned. */
export function weakPointPosition(
  boss: Boss,
  point: WeakPoint,
): { x: number; y: number } {
  const shape = BOSS_CATALOG.phase[boss.phase],
    angle = point.angle + shape.orbitSpeed * boss.spin;
  return {
    x: boss.x + Math.cos(angle) * point.orbitRadius,
    y: boss.y + Math.sin(angle) * point.orbitRadius * 0.78,
  };
}

function spawnZone(doc: GameDoc, boss: Boss, slot: number): void {
  const shape = BOSS_CATALOG.phase[boss.phase],
    toward = Math.atan2(doc.player.y - boss.y, doc.player.x - boss.x);
  const angle = toward + (slot - (shape.volleys - 1) / 2) * 0.8 + boss.cycle * 0.37;
  const lead = 110 + ((boss.cycle + slot) % 3) * 26;
  boss.warnings.push({
    id: doc.nextId++,
    x: clamp(doc.player.x + Math.cos(angle) * lead, 40, WIDTH - 40),
    y: clamp(doc.player.y + Math.sin(angle) * lead, 40, HEIGHT - 40),
    radius: shape.warningRadius,
    damage: shape.warningDamage,
    duration: TELEGRAPH,
    remaining: TELEGRAPH,
  });
  const directions = 3 + boss.phase;
  for (let i = 0; i < directions; i++) {
    const spread = (i - (directions - 1) / 2) * 0.16;
    doc.bullets.push({
      id: doc.nextId++,
      x: boss.x + Math.cos(toward + spread) * boss.radius,
      y: boss.y + Math.sin(toward + spread) * boss.radius,
      vx: Math.cos(toward + spread) * (150 + boss.phase * 22),
      vy: Math.sin(toward + spread) * (150 + boss.phase * 22),
      radius: 5,
      damage: 10 + boss.phase * 2,
      life: 6,
      owner: "enemy",
      weapon: "enemy",
      pierce: 0,
      hit: [],
    });
  }
}

/** How many volley slots the elapsed clock has passed, so slots can never double-fire. */
export function volleysDue(
  elapsed: number,
  duration: number,
  slots: number,
): number {
  let due = 0;
  for (let slot = 0; slot < slots; slot++) {
    const at = 0.55 + slot * (duration / slots);
    if (elapsed >= at - 1e-9) due++;
  }
  return due;
}

export function stepBoss(doc: GameDoc, dt: number): number {
  let taken = 0;
  if (doc.stage === "boss" && !doc.boss) beginBossEncounter(doc);
  const boss = doc.boss;
  if (!boss) return taken;
  boss.flash = Math.max(0, boss.flash - dt * 4);
  boss.phaseFlash = Math.max(0, boss.phaseFlash - dt * 2.2);
  if (boss.defeated) return taken;

  // Telegraphed zones resolve on their own clock; freezing stops them along with the phase timer.
  for (const warning of boss.warnings) {
    const before = warning.remaining;
    warning.remaining -= dt;
    if (before >= 0 && warning.remaining < 0) {
      const reach = warning.radius + doc.player.radius;
      if (distance(warning, doc.player) <= reach)
        taken += hurtPlayer(doc, warning.damage);
    }
  }
  boss.warnings = boss.warnings.filter((w) => w.remaining > -FADE);

  boss.spin += dt;
  const toward = normalize(doc.player.x - boss.x, doc.player.y - boss.y);
  const drift = boss.phase === 1 ? 26 : boss.phase === 2 ? 38 : 50;
  boss.x = clamp(
    boss.x + toward.x * drift * dt,
    boss.radius,
    WIDTH - boss.radius,
  );
  boss.y = clamp(
    boss.y + toward.y * drift * dt,
    boss.radius,
    HEIGHT - boss.radius,
  );

  const duration = boss.cycleDuration;
  const shape = BOSS_CATALOG.phase[boss.phase];
  boss.attackTime = Math.min(duration, boss.attackTime + dt);
  const due = volleysDue(boss.attackTime, duration, shape.volleys);
  for (let slot = boss.volley; slot < due; slot++) spawnZone(doc, boss, slot);
  boss.volley = due;
  const to = boss.attackTime;

  const contact = boss.radius * 0.7 + doc.player.radius;
  if (distance(boss, doc.player) < contact)
    taken += hurtPlayer(doc, BOSS_CATALOG.contactDamage);

  // A cycle closes only after the attack pattern ended and every displayed telegraph resolved.
  const telegraphing = boss.warnings.some((w) => w.remaining >= 0);
  if (to < duration || telegraphing) return taken;

  boss.cycle++;
  boss.attackTime = 0;
  boss.volley = 0;
  boss.warnings = boss.warnings.filter((w) => w.remaining >= 0);
  const target = phaseForHealth(boss.hp / boss.maxHp);
  if (target > boss.phase) {
    // Thresholds are applied here and nowhere else; at most one phase shift per completed cycle.
    boss.phase = Math.min(target, boss.phase + 1) as BossPhase;
    boss.cycleDuration = BOSS_CATALOG.phase[boss.phase].cycleDuration;
    boss.weakPoints = buildWeakPoints(doc, boss.phase);
    boss.phaseFlash = 1;
    doc.notice = `首领进入 ${PHASE_LABELS[boss.phase]} · 第 ${boss.phase} 阶段`;
  }
  // Keep the HUD queue truthful: it mirrors the next threshold still above the current phase.
  boss.pendingPhase = target > boss.phase ? target : 0;
  return taken;
}

/** Called after weapon damage lands: thresholds only queue, they never cut a telegraph short. */
export function queueBossPhase(doc: GameDoc): void {
  const boss = doc.boss;
  if (!boss || boss.defeated) return;
  const next = phaseForHealth(boss.hp / boss.maxHp);
  if (next <= boss.phase || boss.pendingPhase) return;
  // Advisory only: recorded for the HUD, consumed exclusively at the cycle boundary above.
  boss.pendingPhase = next;
  doc.notice = "首领结构受损 · 相位将在本轮攻势结束后切换";
}

export function applyBossHit(
  doc: GameDoc,
  damage: number,
  weak: boolean,
): { effective: number; weak: number } {
  const boss = doc.boss;
  if (!boss || boss.defeated) return { effective: 0, weak: 0 };
  const multiplier = weak
    ? BOSS_CATALOG.weakMultiplier
    : BOSS_CATALOG.bodyMultiplier;
  const effective = Math.min(boss.hp, damage * multiplier);
  boss.hp = Math.max(0, boss.hp - effective);
  boss.flash = 1;
  if (boss.hp <= 0) {
    boss.defeated = true;
    boss.warnings = [];
    doc.stage = "cleared";
    doc.victory = true;
    doc.notice = "首领信号终止 · 战场已净化";
  } else queueBossPhase(doc);
  return { effective, weak: weak ? effective : 0 };
}
