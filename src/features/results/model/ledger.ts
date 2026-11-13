import type {
  GameDoc,
  FrameEvents,
  RunRecord,
  RunOutcome,
} from "../../../shared/types";
import { PHASE_LABELS } from "../../combat/model/bossCatalog";
export function applyEvents(doc: GameDoc, events: FrameEvents): void {
  doc.stats.kills += events.kills.length;
  doc.stats.damage += events.damage;
  doc.stats.taken += events.taken;
  doc.stats.shots += events.shots;
  doc.stats.collected += events.collected;
  for (const weapon of ["pulse", "orbit", "nova"] as const) {
    doc.stats.byWeapon[weapon] += events.weaponDamage?.[weapon] || 0;
    doc.stats.weakByWeapon[weapon] += events.weakByWeapon?.[weapon] || 0;
  }
  doc.stats.bossDamage += events.bossDamage || 0;
  doc.stats.weakDamage += events.weakDamage || 0;
}
/** Player and boss can fall on the same frame; one rule decides the outcome. */
export function resolveOutcome(doc: GameDoc): RunOutcome | null {
  const playerDown = doc.player.hp <= 0,
    bossDown = doc.boss?.defeated === true;
  if (playerDown && bossDown) return "mutual";
  if (bossDown) return "victory";
  if (playerDown) return "defeat";
  return null;
}
export function makeRecord(doc: GameDoc): RunRecord {
  const outcome: RunOutcome = doc.outcome || resolveOutcome(doc) || "defeat";
  return {
    id: `${doc.initialSeed}-${Date.now().toString(36)}`,
    duration: doc.time,
    wave: doc.wave,
    level: doc.level,
    kills: doc.stats.kills,
    damage: Math.round(doc.stats.damage),
    weapons: doc.weapons.map((w) => `${w.id}:${w.level}`),
    victory: outcome === "victory",
    outcome,
    bossPhase: doc.boss?.phase,
    bossDamage: Math.round(doc.stats.bossDamage),
    weakDamage: Math.round(doc.stats.weakDamage),
  };
}
export function finalPhaseLabel(doc: GameDoc): string | null {
  if (!doc.boss) return null;
  const phase = doc.boss.phase;
  return `${phase} · ${PHASE_LABELS[phase]}`;
}
