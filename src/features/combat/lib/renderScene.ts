import type { GameDoc } from "../../../shared/types";
import { WIDTH, HEIGHT } from "../../../shared/types";
import { BOSS_CATALOG } from "../model/bossCatalog";
import { weakPointPosition } from "../model/stepBoss";
export function renderScene(ctx: CanvasRenderingContext2D, d: GameDoc) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#0a1019";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#172431";
  ctx.lineWidth = 0.6;
  for (let x = 0; x < WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#2d424d";
  ctx.setLineDash([6, 8]);
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);
  ctx.setLineDash([]);
  ctx.strokeStyle = "#152c35";
  for (const r of [110, 220, 330]) {
    ctx.beginPath();
    ctx.arc(500, 325, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const drop of d.drops) {
    ctx.fillStyle =
      drop.kind === "xp"
        ? "#9eeaa6"
        : drop.kind === "heal"
          ? "#fc91aa"
          : "#8ac6ff";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  if (d.boss) {
    const boss = d.boss;
    for (const warning of boss.warnings) {
      const charge = Math.max(0, warning.remaining) / warning.duration;
      ctx.beginPath();
      ctx.arc(warning.x, warning.y, warning.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 92, 96, ${0.07 + (1 - charge) * 0.16})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        warning.x,
        warning.y,
        warning.radius * (0.25 + charge * 0.75),
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = `rgba(255, 118, 106, ${0.35 + (1 - charge) * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    const glow =
      !boss.defeated && boss.phaseFlash > 0
        ? `rgba(255,255,255,${boss.phaseFlash * 0.28})`
        : null;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowColor = boss.defeated ? "#5f6b78" : "#ff7a86";
    ctx.shadowBlur = 34;
    ctx.fillStyle = "#1a1420";
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = boss.defeated ? "#5f6b78" : "#ff9aa3";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(boss.attackTime * 0.6 + boss.phase);
    ctx.strokeStyle = boss.defeated ? "#4c5662" : "#c86bff";
    ctx.lineWidth = 1;
    for (let i = 0; i < boss.phase * 2; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius * (0.35 + i * 0.16), 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = boss.flash > 0.5 ? "#ffffff" : "#ff6273";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    if (glow) {
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius + 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd6e2";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius + 10 + boss.phaseFlash * 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!boss.defeated) {
      for (const point of boss.weakPoints) {
        const at = weakPointPosition(boss, point);
        ctx.fillStyle = "#ffd166";
        ctx.shadowColor = "#ffb347";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(at.x, at.y, point.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff3c4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(at.x, at.y, point.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const width = 260;
    ctx.fillStyle = "#2a1620";
    ctx.fillRect(500 - width / 2, HEIGHT - 82, width, 5);
    ctx.fillStyle = boss.defeated ? "#65727e" : "#ff6b7a";
    ctx.fillRect(
      500 - width / 2,
      HEIGHT - 82,
      width * Math.max(0, boss.hp / boss.maxHp),
      5,
    );
    ctx.fillStyle = "#c9a9b0";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `${BOSS_CATALOG.name} · PHASE ${boss.phase}${
        boss.pendingPhase ? ` → ${boss.pendingPhase}` : ""
      }`,
      500,
      HEIGHT - 90,
    );
    ctx.textAlign = "left";
  }
  for (const e of d.enemies) {
    const color =
      e.kind === "shooter"
        ? "#bb9eff"
        : e.kind === "elite"
          ? "#ffae70"
          : "#ed697b";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (e.kind === "chaser") {
      ctx.moveTo(e.x, e.y - 12);
      ctx.lineTo(e.x + 11, e.y + 9);
      ctx.lineTo(e.x - 11, e.y + 9);
      ctx.closePath();
    } else {
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#10121d";
    ctx.beginPath();
    ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (e.hp < e.maxHp) {
      ctx.fillStyle = "#ef7287";
      ctx.fillRect(e.x - 14, e.y - 22, (28 * e.hp) / e.maxHp, 2);
    }
  }
  for (const b of d.bullets) {
    ctx.fillStyle =
      b.owner === "enemy"
        ? "#ff827d"
        : b.weapon === "nova"
          ? "#ba9fff"
          : b.weapon === "orbit"
            ? "#f7cd79"
            : "#a7ffe1";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  const p = d.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = "#9eeeb3";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = p.invincible > 0 ? 0.45 : 1;
  ctx.shadowColor = "#a9ffd7";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#cdfedc";
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(12, 11);
  ctx.lineTo(0, 7);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#193b3b";
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
  ctx.fillStyle = "#526571";
  ctx.font = "10px monospace";
  ctx.fillText("SECTOR 07 / SIGNAL ACTIVE", 48, HEIGHT - 42);
  ctx.fillText(
    d.boss
      ? d.boss.defeated
        ? "BOSS SIGNAL LOST"
        : "BOSS ENGAGED"
      : `${d.enemies.length.toString().padStart(3, "0")} HOSTILES`,
    WIDTH - 145,
    HEIGHT - 42,
  );
}
