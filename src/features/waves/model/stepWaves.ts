import type { GameDoc } from "../../../shared/types";
import { distance, normalize } from "../../../shared/math";
import { spawnEnemy } from "../lib/spawn";
import { ENEMY_CATALOG, WAVE_DURATION, TOTAL_WAVES } from "./catalog";
import { advanceStage } from "./stage";

export function stepWaves(doc: GameDoc, dt: number): void {
  if (doc.victory) return;
  // Once the boss owns the arena the tide stops spawning and advancing.
  if (doc.stage !== "tide") return;
  if (doc.wave === 0) {
    doc.wave = 1;
    doc.spawnBudget = 1;
    doc.notice = "第 1 波 · 信号已连接";
  }

  const finalTide = doc.wave >= TOTAL_WAVES;
  doc.waveTime = Math.min(
    WAVE_DURATION,
    doc.waveTime + dt,
  );
  if (!finalTide && doc.waveTime >= WAVE_DURATION) {
    doc.waveTime -= WAVE_DURATION;
    doc.wave++;
    doc.notice =
      doc.wave >= TOTAL_WAVES
        ? "终末敌潮 · 清空战场后首领登场"
        : `第 ${doc.wave} 波 · 威胁升级`;
  }

  // The designated tide ends on its clock; the boss waits for its leftovers to be cleared.
  const tideEnded = doc.wave >= TOTAL_WAVES && doc.waveTime >= WAVE_DURATION;
  if (tideEnded) {
    if (doc.enemies.length > 0) doc.notice = "终末敌潮结束 · 清除残余敌群";
    else advanceStage(doc);
  } else {
    doc.spawnBudget += dt * (1.05 + doc.wave * 0.27);
    while (doc.spawnBudget >= 1) {
      doc.spawnBudget--;
      if (doc.enemies.length < 180) doc.enemies.push(spawnEnemy(doc));
    }
  }

  for (const enemy of doc.enemies) {
    const toward = normalize(doc.player.x - enemy.x, doc.player.y - enemy.y),
      range = distance(enemy, doc.player);
    const standOff =
      enemy.kind === "shooter" ? (range < 170 ? -1 : range < 245 ? 0 : 1) : 1;
    const speed = ENEMY_CATALOG[enemy.kind].speed * (1 + doc.wave * 0.035);
    enemy.x += toward.x * speed * standOff * dt;
    enemy.y += toward.y * speed * standOff * dt;
    enemy.cooldown -= dt;
    if (enemy.kind !== "chaser" && enemy.cooldown <= 0) {
      enemy.cooldown = enemy.kind === "elite" ? 1.8 : 2.6;
      const angle = Math.atan2(toward.y, toward.x),
        spread = enemy.kind === "elite" ? [-0.24, 0, 0.24] : [0];
      for (const offset of spread) {
        doc.bullets.push({
          id: doc.nextId++,
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle + offset) * 160,
          vy: Math.sin(angle + offset) * 160,
          radius: 5,
          damage: enemy.kind === "elite" ? 16 : 10,
          life: 5,
          owner: "enemy",
          weapon: "enemy",
          pierce: 0,
          hit: [],
        });
      }
    }
  }
  // Clearing the leftovers happens inside combat, which runs after this step; re-check there too.
  advanceStage(doc);
}
