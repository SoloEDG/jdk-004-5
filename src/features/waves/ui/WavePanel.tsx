import type { GameDoc } from "../../../shared/types";
import { TOTAL_WAVES, WAVE_DURATION } from "../model/catalog";
import {
  BOSS_CATALOG,
  BOSS_TIDE_WAVE,
  PHASE_LABELS,
  phaseForHealth,
} from "../../combat/model/bossCatalog";
export function WavePanel({ doc }: { doc: GameDoc }) {
  const boss = doc.boss,
    nextPhase = boss ? phaseForHealth(boss.hp / boss.maxHp) : 1;
  const stageLabel = !boss
    ? doc.wave >= TOTAL_WAVES
      ? "终末敌潮 · 清场中"
      : doc.wave < 3
        ? "外围侦察群"
        : doc.wave < 6
          ? "重装突击群"
          : "深空精英群"
    : boss.defeated
      ? "首领已净化"
      : `${PHASE_LABELS[boss.phase]} · 第 ${boss.phase} 阶段`;
  return (
    <section className="panel">
      <div className="section-caption">
        <span>波次进程</span>
        <span className="badge">{boss ? "BOSS" : `${TOTAL_WAVES} WAVES`}</span>
      </div>
      <div className="wave-num mono">
        {boss
          ? boss.phase.toString().padStart(2, "0")
          : Math.max(1, doc.wave).toString().padStart(2, "0")}
        <span>/ {boss ? "03" : `0${TOTAL_WAVES}`}</span>
      </div>
      <div className="wave-steps">
        {boss
          ? [1, 2, 3].map((i) => (
              <i key={i} className={i <= boss.phase ? "active" : ""} />
            ))
          : Array.from({ length: TOTAL_WAVES }, (_, i) => (
              <i key={i} className={i < Math.max(1, doc.wave) ? "active" : ""} />
            ))}
      </div>
      <div className="section-caption muted">
        <span>{stageLabel}</span>
        <span className="mono">
          {boss
            ? `${Math.round((boss.hp / boss.maxHp) * 100)}% HP`
            : `${Math.max(0, WAVE_DURATION - doc.waveTime).toFixed(0)}s`}
        </span>
      </div>
      <div className={`bar ${boss ? "boss-bar" : ""}`}>
        <i
          style={{
            width: boss
              ? `${(boss.hp / boss.maxHp) * 100}%`
              : `${Math.min(100, (doc.waveTime / WAVE_DURATION) * 100)}%`,
          }}
        />
      </div>
      {boss && (
        <div className={`boss-phase ${boss.pendingPhase ? "pending" : ""}`}>
          <span>
            弱点 ×{boss.weakPoints.length} · 伤害 ×{BOSS_CATALOG.weakMultiplier}
          </span>
          <span>
            {boss.defeated
              ? "信号已终止"
              : boss.pendingPhase
                ? `阶段 ${boss.pendingPhase} 待本轮结束`
                : nextPhase > boss.phase
                    ? "阈值已过 · 等待攻势收尾"
                    : boss.attackTime >= boss.cycleDuration
                      ? "本轮攻势收尾中"
                      : `下一次 ${(boss.cycleDuration - boss.attackTime).toFixed(1)}s`}
          </span>
        </div>
      )}
      <p className="tiny">
        {boss
          ? `命中弱点区域造成 ×${BOSS_CATALOG.weakMultiplier} 伤害；阶段只在完整攻击周期结束时切换。`
          : doc.wave >= TOTAL_WAVES
            ? `终末敌潮已停止增援。清空场上敌人后，首领将接管战场。`
            : `撑过第 ${BOSS_TIDE_WAVE} 波并清除残余敌群，首领将接管战场。`}
      </p>
    </section>
  );
}
