import { Activity, ChevronRight } from "lucide-react";
import { HOME_CARDS, modules } from "../moduleRegistry";
import type { ModuleId } from "../../types";

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

export function HomeModule({ setActive }: { setActive: (id: ModuleId) => void }) {
  return (
    <section className="module-page home-page">
      <div className="page-heading">
        <div>
          <h1>一个窗口，掌控你的 vibecoding</h1>
          <p>把散落在各个 agent 里的用量、配额、技能、会话与项目状态收拢到一处。全程本地运行，不联网、不上报。</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setActive("codex-usage")}>
          <Activity size={17} />
          查看用量
        </button>
      </div>

      <div className="overview-grid">
        <MetricCard label="已整合模块" value={String(HOME_CARDS.length)} detail="用量 / 项目 / 技能 / 会话 …" />
        <MetricCard label="技术栈" value="Electron" detail="React + TypeScript" />
        <MetricCard label="数据来源" value="本地" detail="只读优先 · 不联网" />
      </div>

      <div className="tool-module-grid">
        {HOME_CARDS.map((card) => {
          const item = modules.find((m) => m.id === card.id);
          if (!item) return null;
          const Icon = item.icon;
          return (
            <button key={item.id} className="module-card" type="button" onClick={() => setActive(item.id)}>
              <span className="module-icon" style={{ "--tone": item.tone } as React.CSSProperties}>
                <Icon size={26} />
              </span>
              <strong>{item.label}</strong>
              <p>{card.desc}</p>
              <ChevronRight size={18} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
