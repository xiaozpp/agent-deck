import {
  LayoutGrid,
  Maximize2,
  Minimize2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WindowButton } from "./components/WindowButton";
import { HomeModule } from "./modules/home/HomeModule";
import { MarkdownModule } from "./modules/markdown/MarkdownModule";
import { McpModule } from "./modules/mcp/McpModule";
import { UsageModule } from "./modules/usage/UsageModule";
import { SkillsModule } from "./modules/skills/SkillsModule";
import { ProjectsModule } from "./modules/projects/ProjectsModule";
import { SessionsModule } from "./modules/sessions/SessionsModule";
import { ToolManagerModule } from "./modules/tools/ToolManagerModule";
import { modules } from "./modules/moduleRegistry";
import { toolApi } from "./toolApi";

import type { ModuleId, ToolItem } from "./types";

export function App() {
  const [active, setActive] = useState<ModuleId>("home");
  const [tools, setTools] = useState<ToolItem[]>([]);

  useEffect(() => {
    toolApi.listTools().then(setTools).catch(() => setTools([]));
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <LayoutGrid size={18} />
          </div>
          <div>
            <strong>Agent 指挥台</strong>
            <span>Agent Deck</span>
          </div>
        </div>

        <nav className="module-nav">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={active === item.id ? "nav-item active" : "nav-item"}
                type="button"
                onClick={() => setActive(item.id)}
                style={{ "--tone": item.tone } as React.CSSProperties}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <span>统一 Electron + React 技术栈</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="titlebar">
          <span>{modules.find((item) => item.id === active)?.label}</span>
          <div className="window-controls">
            <WindowButton label="最小化" action="minimize">
              <Minimize2 size={15} />
            </WindowButton>
            <WindowButton label="最大化" action="maximize">
              <Maximize2 size={14} />
            </WindowButton>
            <WindowButton label="关闭" action="close">
              <X size={18} />
            </WindowButton>
          </div>
        </header>

        <div className="module-host">
          <ErrorBoundary>
            {active === "home" && <HomeModule setActive={setActive} />}
            {active === "codex-usage" && <UsageModule />}
            {active === "mcp" && <McpModule />}
            {active === "markdown-viewer" && <MarkdownModule />}
            {active === "projects" && <ProjectsModule />}
            {active === "skills" && <SkillsModule />}
            {active === "sessions" && <SessionsModule />}
            {active === "tool-manager" && <ToolManagerModule tools={tools} />}
          </ErrorBoundary>
        </div>
      </section>
    </main>
  );
}
