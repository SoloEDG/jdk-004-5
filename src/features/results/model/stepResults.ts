import type { GameDoc, FrameEvents } from "../../../shared/types";
import { applyEvents, makeRecord, resolveOutcome } from "./ledger";
import { saveRecords } from "../lib/storage";
export function stepResults(doc: GameDoc, events: FrameEvents): void {
  if (doc.phase === "ended") return;
  applyEvents(doc, events);
  const outcome = resolveOutcome(doc);
  if (!outcome) return;
  // End the run before persistence, making repeated animation frames idempotent.
  doc.phase = "ended";
  doc.outcome = outcome;
  // "mutual" is a distinct settlement result, not a win: records and archive stay loss-like.
  doc.victory = outcome === "victory";
  doc.choices = [];
  doc.notice =
    outcome === "victory"
      ? "撤离成功 · 信号保全"
      : outcome === "mutual"
        ? "同归于尽 · 信号归于寂静"
        : "信号中断 · 再次连接";
  doc.records = [makeRecord(doc), ...doc.records].slice(0, 20);
  saveRecords(doc.records);
}
