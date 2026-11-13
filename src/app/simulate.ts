import type { GameDoc, Input } from "../shared/types";
import { stepCombat } from "../features/combat";
import { advanceStage } from "../features/waves/model/stage";
import { stepWaves } from "../features/waves";
import { stepArsenal } from "../features/arsenal";
import { stepProgression } from "../features/progression";
import { stepResults } from "../features/results";
export function simulate(doc: GameDoc, input: Input, dt: number) {
  if (doc.phase !== "playing") return;
  doc.time += dt;
  stepWaves(doc, dt);
  const shots = stepArsenal(doc, input, dt);
  const events = stepCombat(doc, input, dt);
  // A kill can empty the final tide inside combat; stage entry must not wait another frame.
  advanceStage(doc);
  events.shots += shots;
  stepProgression(doc, events, dt);
  stepResults(doc, events);
}
