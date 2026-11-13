import type { GameDoc, RunOutcome, WeaponId } from "../../../shared/types";
import { formatTime } from "../../../shared/math";
import { PHASE_LABELS } from "../../combat/model/bossCatalog";
const outcomeCopy: Record<
  RunOutcome,
  { code: string; title: string; note: string }
> = {
  victory: {
    code: "MISSION COMPLETE",
    title: "信号已送达。",
    note: "首领被击穿，战场重新归于寂静。",
  },
  mutual: {
    code: "SIGNAL COLLAPSED",
    title: "同归于尽。",
    note: "你与首领在同一瞬间倒下，按照统一终局规则结算。",
  },
  defeat: {
    code: "MISSION ENDED",
    title: "信号暂时中断。",
    note: "每一次坠落，都是下一次进化的起点。",
  },
};
export function ResultDialog({
  doc,
  restart,
}: {
  doc: GameDoc;
  restart: () => void;
}) {
  const outcome: RunOutcome = doc.outcome || (doc.victory ? "victory" : "defeat"),
    copy = outcomeCopy[outcome] || outcomeCopy.defeat;
  const bossFinal = doc.boss
    ? `${doc.boss.phase} · ${PHASE_LABELS[doc.boss.phase]}`
    : "未遭遇首领";
  const validRate = doc.stats.damage
    ? Math.round((doc.stats.weakDamage / doc.stats.damage) * 100)
    : 0;
  return (
    <div className="overlay">
      <div className="result-dialog">
        <div className="eyebrow">{copy.code}</div>
        <h2>{copy.title}</h2>
        <p>{copy.note}</p>
        <div className="result-grid">
          <div>
            <strong>{formatTime(doc.time)}</strong>
            <small>生存时间</small>
          </div>
          <div>
            <strong>{doc.stats.kills}</strong>
            <small>击败敌人</small>
          </div>
          <div>
            <strong className="result-phase">{bossFinal}</strong>
            <small>最终阶段</small>
          </div>
        </div>
        <div className="damage-breakdown">
          {(Object.keys(doc.stats.byWeapon) as WeaponId[]).map((key) => (
            <div key={key}>
              <span>{key.toUpperCase()}</span>
              <span>
                {Math.round(doc.stats.byWeapon[key])} DMG · 弱点{" "}
                {Math.round(doc.stats.weakByWeapon[key])}
              </span>
            </div>
          ))}
          <div className="ledger-total">
            <span>对首领有效伤害</span>
            <span>{Math.round(doc.stats.bossDamage)} DMG</span>
          </div>
          <div>
            <span>其中弱点结算</span>
            <span>
              {Math.round(doc.stats.weakDamage)} DMG（{validRate}%）
            </span>
          </div>
          <div>
            <span>总计有效伤害</span>
            <span>{Math.round(doc.stats.damage)} DMG</span>
          </div>
        </div>
        <button className="primary" onClick={restart}>
          重新接入 ↗
        </button>
        <p className="tiny">本地已记录 {doc.records.length} 次行动</p>
      </div>
    </div>
  );
}
