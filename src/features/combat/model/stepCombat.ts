import type { GameDoc, Input, FrameEvents } from "../../../shared/types";
import { WIDTH, HEIGHT } from "../../../shared/types";
import { clamp, distance, normalize } from "../../../shared/math";
import { segmentDistance } from "../lib/collision";
import { hurtPlayer } from "./health";
import {
  applyBossHit,
  stepBoss,
  weakPointPosition,
} from "./stepBoss";

export function stepCombat(
  doc: GameDoc,
  input: Input,
  dt: number,
): FrameEvents {
  const events: FrameEvents = {
    kills: [],
    damage: 0,
    taken: 0,
    shots: 0,
    collected: 0,
    weaponDamage: {},
    bossDamage: 0,
    weakDamage: 0,
    weakByWeapon: {},
    bossDefeated: false,
  };
  const player = doc.player;
  player.invincible = Math.max(0, player.invincible - dt);
  const direction = normalize(input.x, input.y),
    strength = Math.min(1, Math.hypot(input.x, input.y));
  player.x = clamp(
    player.x + direction.x * strength * player.speed * dt,
    player.radius,
    WIDTH - player.radius,
  );
  player.y = clamp(
    player.y + direction.y * strength * player.speed * dt,
    player.radius,
    HEIGHT - player.radius,
  );
  const boss = doc.boss;
  const bossTaken = stepBoss(doc, dt);
  events.taken += bossTaken;

  for (const bullet of doc.bullets) {
    const previous = { x: bullet.x, y: bullet.y };
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life < 0) continue;
    if (bullet.owner === "enemy") {
      if (
        segmentDistance(player, previous, bullet) <
        player.radius + bullet.radius
      ) {
        events.taken += hurtPlayer(doc, bullet.damage);
        bullet.life = -1;
      }
      continue;
    }
    for (const enemy of doc.enemies) {
      if (enemy.hp <= 0 || bullet.hit.includes(enemy.id)) continue;
      if (
        segmentDistance(enemy, previous, bullet) > enemy.radius + bullet.radius
      )
        continue;
      bullet.hit.push(enemy.id);
      const damage = Math.min(enemy.hp, bullet.damage);
      enemy.hp -= damage;
      events.damage += damage;
      if (bullet.weapon !== "enemy")
        events.weaponDamage![bullet.weapon] =
          (events.weaponDamage![bullet.weapon] || 0) + damage;
      if (enemy.hp <= 0)
        events.kills.push({
          enemy: { ...enemy },
          weapon: bullet.weapon === "enemy" ? "pulse" : bullet.weapon,
        });
      if (bullet.pierce <= 0) {
        bullet.life = -1;
        break;
      }
      bullet.pierce--;
    }
    if (bullet.life < 0 || !boss || boss.defeated || bullet.bossHit) continue;
    // A single projectile may score one boss hit: overlapping weak points cannot double-charge it.
    const reach = bullet.radius;
    let weak = false;
    for (const point of boss.weakPoints) {
      const at = weakPointPosition(boss, point);
      if (
        segmentDistance(
          { x: at.x, y: at.y },
          previous,
          bullet,
        ) <=
        point.radius + reach
      ) {
        weak = true;
        break;
      }
    }
    if (
      !weak &&
      segmentDistance(boss, previous, bullet) > boss.radius + reach
    )
      continue;
    bullet.bossHit = true;
    const weapon = bullet.weapon === "enemy" ? null : bullet.weapon;
    const hit = applyBossHit(doc, bullet.damage, weak);
    events.damage += hit.effective;
    events.bossDamage! += hit.effective;
    if (weapon) {
      events.weaponDamage![weapon] =
        (events.weaponDamage![weapon] || 0) + hit.effective;
      if (hit.weak) {
        events.weakDamage! += hit.weak;
        events.weakByWeapon![weapon] =
          (events.weakByWeapon![weapon] || 0) + hit.weak;
      }
    }
    if (boss.defeated) events.bossDefeated = true;
    if (bullet.pierce <= 0) {
      bullet.life = -1;
    } else {
      bullet.pierce--;
    }
  }
  for (const enemy of doc.enemies) {
    if (enemy.hp > 0 && distance(enemy, player) < enemy.radius + player.radius)
      events.taken += hurtPlayer(doc, enemy.kind === "elite" ? 25 : 12);
  }
  doc.enemies = doc.enemies.filter((e) => e.hp > 0);
  doc.bullets = doc.bullets.filter(
    (b) =>
      b.life >= 0 &&
      b.x > -120 &&
      b.x < WIDTH + 120 &&
      b.y > -120 &&
      b.y < HEIGHT + 120,
  );
  return events;
}
