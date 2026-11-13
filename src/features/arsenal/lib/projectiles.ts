import type { GameDoc, WeaponId, Vec } from "../../../shared/types";
import { weakPointPosition } from "../../combat/model/stepBoss";
export function fire(
  doc: GameDoc,
  weapon: WeaponId,
  angle: number,
  damage: number,
  speed: number,
  pierce: number,
  origin: Vec = doc.player,
): void {
  doc.bullets.push({
    id: doc.nextId++,
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: weapon === "nova" ? 6 : 4,
    damage,
    life: weapon === "orbit" ? 1.25 : 2.1,
    owner: "player",
    weapon,
    pierce,
    hit: [],
  });
}
/** Aim assist prefers a live weak point, so auto-fire can actually exploit the boss. */
export function nearestTarget(doc: GameDoc): Vec | undefined {
  let best: Vec | undefined,
    bestSquared = Infinity;
  const boss = doc.boss;
  if (boss && !boss.defeated) {
    for (const point of boss.weakPoints) {
      const at = weakPointPosition(boss, point);
      const n = (at.x - doc.player.x) ** 2 + (at.y - doc.player.y) ** 2;
      if (n < bestSquared) {
        best = at;
        bestSquared = n;
      }
    }
  }
  for (const e of doc.enemies) {
    if (e.hp <= 0) continue;
    const n = (e.x - doc.player.x) ** 2 + (e.y - doc.player.y) ** 2;
    if (n < bestSquared) {
      best = e;
      bestSquared = n;
    }
  }
  return best;
}
