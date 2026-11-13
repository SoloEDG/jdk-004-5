import type { GameDoc } from "../../../shared/types";
import { BOSS_TIDE_WAVE } from "../../combat/model/bossCatalog";
import { beginBossEncounter } from "../../combat/model/stepBoss";

/** The tide owns stage entry; the boss takeover happens only after the designated tide is empty. */
export function advanceStage(doc: GameDoc): void {
  if (doc.victory || doc.stage !== "tide") return;
  if (doc.wave >= BOSS_TIDE_WAVE && doc.enemies.length === 0) {
    beginBossEncounter(doc);
  }
}
