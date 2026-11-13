import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "../src/shared/createRun";
import { simulate } from "../src/app/simulate";
import { stepCombat } from "../src/features/combat";
import {
  applyBossHit,
  beginBossEncounter,
  queueBossPhase,
  stepBoss,
  weakPointPosition,
} from "../src/features/combat/model/stepBoss";
import { BOSS_CATALOG } from "../src/features/combat/model/bossCatalog";
import { resolveOutcome, makeRecord } from "../src/features/results/model/ledger";
import { stepResults } from "../src/features/results";
import { stepWaves } from "../src/features/waves";
const input = { x: 0, y: 0, aim: { x: 500, y: 325 }, firing: false };
const idle = () => createRun();
function bossRun() {
  const d = idle();
  d.phase = "playing";
  beginBossEncounter(d);
  return d;
}
test("boss takes over only after the final tide is cleared, replacing normal spawning", () => {
  const d = idle();
  d.phase = "playing";
  d.wave = 7;
  d.waveTime = 29;
  d.enemies = [{ id: 9, kind: "chaser", x: 600, y: 325, hp: 10, maxHp: 10, radius: 12, cooldown: 0 }];
  for (let i = 0; i < 120; i++) stepWaves(d, 1 / 60);
  assert.equal(d.wave, 8);
  assert.ok(d.enemies.length > 0);
  d.enemies = [];
  stepWaves(d, 1 / 60);
  assert.equal(d.stage, "boss");
  assert.equal(d.enemies.length, 0, "no ordinary enemies remain in the boss arena");
  assert.equal(d.spawnBudget, 0);
  stepWaves(d, 1);
  assert.equal(d.enemies.length, 0, "the tide never spawns during the boss stage");
});
test("a projectile scores at most one boss hit even through overlapping weak points", () => {
  const d = bossRun();
  const boss = d.boss!;
  const point = weakPointPosition(boss, boss.weakPoints[0]);
  d.bullets = [{
    id: 3,
    x: point.x,
    y: point.y,
    vx: 0,
    vy: 0,
    radius: 5,
    damage: 20,
    life: 1,
    owner: "player",
    weapon: "pulse",
    pierce: 3,
    hit: [],
  }];
  const events = stepCombat(d, input, 0);
  assert.equal(events.bossDamage, 20 * BOSS_CATALOG.weakMultiplier);
  assert.equal(events.weakDamage, 20 * BOSS_CATALOG.weakMultiplier);
  assert.equal(events.weaponDamage!.pulse, 40);
  assert.equal(boss.hp, boss.maxHp - 40, "only one hit landed");
  assert.ok(d.bullets.length >= 1, "a piercing round survives but cannot hit the boss again");
  stepCombat(d, input, 0);
  assert.equal(boss.hp, boss.maxHp - 40);
});
test("weak-point damage is settled per weapon and never exceeds remaining boss health", () => {
  const d = bossRun();
  const boss = d.boss!;
  boss.hp = 5;
  const hit = applyBossHit(d, 20, true);
  assert.equal(hit.effective, 5);
  assert.equal(hit.weak, 5);
  assert.equal(boss.defeated, true);
  assert.equal(applyBossHit(d, 20, true).effective, 0);
  assert.equal(d.stage, "cleared");
});
test("phase thresholds queue and only switch on a completed attack cycle, never cutting a live warning", () => {
  const d = bossRun();
  const boss = d.boss!;
  boss.hp = boss.maxHp * 0.6;
  queueBossPhase(d);
  assert.equal(boss.phase, 1, "threshold crossing does not switch phase immediately");
  assert.equal(boss.pendingPhase, 2);
  for (let i = 0; i < 60 * 6 && boss.phase === 1; i++) stepBoss(d, 1 / 60);
  assert.equal(boss.phase, 2);
  assert.equal(boss.weakPoints.length, BOSS_CATALOG.phase[2].weakPoints);
  assert.equal(boss.attackTime, 0, "the switch happens at the cycle boundary");
});
test("a warning shown before the threshold holds the phase until it resolves", () => {
  const d = bossRun();
  const boss = d.boss!;
  for (let i = 0; i < 60 * 2 && boss.warnings.length === 0; i++) stepBoss(d, 1 / 60);
  assert.ok(boss.warnings.length > 0);
  const warning = boss.warnings[0];
  boss.hp = boss.maxHp * 0.2;
  queueBossPhase(d);
  boss.attackTime = boss.cycleDuration - 0.01;
  stepBoss(d, 1 / 60);
  assert.equal(boss.phase, 1, "the live telegraph keeps the phase");
  assert.ok(boss.warnings.includes(warning), "the displayed warning is not discarded");
  for (let i = 0; i < 120 && boss.phase === 1; i++) stepBoss(d, 1 / 60);
  assert.equal(boss.phase, 2, "only one phase step per completed cycle");
});
test("freezing during an upgrade also stops warnings and phase timers", () => {
  const d = bossRun();
  const boss = d.boss!;
  for (let i = 0; i < 60 * 2 && boss.warnings.length === 0; i++) stepBoss(d, 1 / 60);
  const frozenPhase = boss.phase,
    frozenAttack = boss.attackTime,
    frozenRemaining = boss.warnings.map((w) => w.remaining);
  d.phase = "upgrade";
  const snapshot = JSON.stringify(d);
  simulate(d, input, 1 / 60);
  assert.equal(JSON.stringify(d), snapshot);
  assert.equal(boss.phase, frozenPhase);
  assert.equal(boss.attackTime, frozenAttack);
  assert.deepEqual(boss.warnings.map((w) => w.remaining), frozenRemaining);
});
test("mutual defeat settles under one rule and records the final phase and effective damage", () => {
  const d = bossRun();
  const boss = d.boss!;
  d.player.hp = 0;
  boss.defeated = true;
  boss.phase = 3;
  assert.equal(resolveOutcome(d), "mutual");
  const record = makeRecord(d);
  assert.equal(record.outcome, "mutual");
  assert.equal(record.bossPhase, 3);
  stepResults(d, { kills: [], damage: 0, taken: 0, shots: 0, collected: 0 });
  assert.equal(d.phase, "ended");
  assert.equal(d.outcome, "mutual");
  assert.equal(d.records[0].outcome, "mutual");
  assert.equal(d.records.length, 1);
  stepResults(d, { kills: [], damage: 0, taken: 0, shots: 0, collected: 0 });
  assert.equal(d.records.length, 1);
});
