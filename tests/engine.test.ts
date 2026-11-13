import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "../src/shared/createRun";
import { stepCombat } from "../src/features/combat";
import { stepWaves } from "../src/features/waves";
import { stepArsenal } from "../src/features/arsenal";
import { stepProgression, chooseUpgrade } from "../src/features/progression";
import { stepResults } from "../src/features/results";
import type { FrameEvents } from "../src/shared/types";
const input = { x: 0, y: 0, aim: { x: 700, y: 325 }, firing: false };
const events = (): FrameEvents => ({
  kills: [],
  damage: 0,
  taken: 0,
  shots: 0,
  collected: 0,
});
const enemy = (id = 1) => ({
  id,
  kind: "chaser" as const,
  x: 600,
  y: 325,
  hp: 10,
  maxHp: 10,
  radius: 12,
  cooldown: 0,
});
test("automatic fire acquires a target without pointer firing", () => {
  const d = createRun();
  d.enemies = [enemy()];
  assert.ok(stepArsenal(d, input, 1 / 60) > 0);
  assert.ok(d.bullets.some((b) => b.owner === "player"));
});
test("collision kills once, reports actual damage and prevents duplicate piercing hits", () => {
  const d = createRun();
  d.enemies = [enemy()];
  d.bullets = [
    {
      id: 2,
      x: 600,
      y: 325,
      vx: 0,
      vy: 0,
      radius: 5,
      damage: 20,
      life: 1,
      owner: "player",
      weapon: "pulse",
      pierce: 2,
      hit: [],
    },
  ];
  const e = stepCombat(d, input, 0);
  assert.equal(e.kills.length, 1);
  assert.equal(e.damage, 10);
  assert.equal(stepCombat(d, input, 0).kills.length, 0);
});
test("contact invincibility prevents repeated frame damage", () => {
  const d = createRun();
  d.enemies = [{ ...enemy(), x: 500 }];
  assert.ok(stepCombat(d, input, 0).taken > 0);
  assert.equal(stepCombat(d, input, 0).taken, 0);
});
test("large experience pickup queues every level and choices consume one at a time", () => {
  const d = createRun();
  d.phase = "playing";
  d.drops = [{ id: 4, x: 500, y: 325, kind: "xp", value: 100, life: 30 }];
  stepProgression(d, events(), 0);
  assert.equal(d.phase, "upgrade");
  assert.ok(d.pendingLevels > 1);
  const pending = d.pendingLevels;
  chooseUpgrade(d, d.choices[0]);
  assert.equal(d.pendingLevels, pending - 1);
  assert.equal(d.phase, "upgrade");
  while (d.pendingLevels) chooseUpgrade(d, d.choices[0]);
  assert.equal(d.phase, "playing");
});
test("the final tide ends spawning; victory waits for the boss", () => {
  const d = createRun();
  d.phase = "playing";
  d.wave = 8;
  d.waveTime = 29.99;
  d.enemies = [{ id: 9, kind: "chaser", x: 600, y: 325, hp: 10, maxHp: 10, radius: 12, cooldown: 0 }];
  stepWaves(d, 0.02);
  assert.equal(d.victory, false);
  assert.equal(d.stage, "tide");
  assert.match(d.notice, /残余敌群/);
  // The emptied tide hands the arena to the boss on the same frame.
  d.enemies = [];
  stepWaves(d, 0.01);
  assert.equal(d.stage, "boss");
  assert.ok(d.boss);
  assert.equal(d.boss!.hp, d.boss!.maxHp);
  assert.equal(d.boss!.phase, 1);
});
test("finished results append a single immutable record", () => {
  const d = createRun();
  d.phase = "playing";
  d.player.hp = 0;
  stepResults(d, events());
  assert.equal(d.phase, "ended");
  assert.equal(d.records.length, 1);
  stepResults(d, events());
  assert.equal(d.records.length, 1);
});
test("weapon damage includes nonlethal hits and ignores overkill", () => {
  const d = createRun();
  d.enemies = [{ ...enemy(), hp: 30, maxHp: 30 }];
  d.bullets = [
    {
      id: 2,
      x: 600,
      y: 325,
      vx: 0,
      vy: 0,
      radius: 5,
      damage: 20,
      life: 1,
      owner: "player",
      weapon: "pulse",
      pierce: 0,
      hit: [],
    },
  ];
  const e = stepCombat(d, input, 0);
  stepResults(d, e);
  assert.equal(d.stats.byWeapon.pulse, 20);
  assert.equal(d.stats.kills, 0);
});
