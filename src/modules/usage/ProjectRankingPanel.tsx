import { ChevronRight } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { clientLabel, formatCost, formatNumber, type ProjectGroup } from "./usageMetrics";

export function ProjectRankingPanel({
  filteredProjects,
  pagedProjects,
  pageSize,
  projectPage,
  totalProjectPages,
  hideDeleted,
  setHideDeleted,
  setProjectPage,
  expandedProjects,
  toggleProject,
}: {
  filteredProjects: ProjectGroup[];
  pagedProjects: ProjectGroup[];
  pageSize: number;
  projectPage: number;
  totalProjectPages: number;
  hideDeleted: boolean;
  setHideDeleted: (value: boolean) => void;
  setProjectPage: Dispatch<SetStateAction<number>>;
  expandedProjects: Set<string>;
  toggleProject: (groupKey: string) => void;
}) {
  return (
        <article className="panel">
          <div className="panel-title">
            <div className="panel-title-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2>项目排行</h2>
              <span>{filteredProjects.length} 项</span>
            </div>
            <label className="checkbox-label" title="隐藏本地已被删除或重命名的项目" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#5a7390", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={hideDeleted} 
                onChange={(e) => setHideDeleted(e.target.checked)} 
                style={{ cursor: "pointer" }}
              />
              <span>隐藏已失效</span>
            </label>
          </div>
          <div className="project-list">
            {pagedProjects.map((entry) => {
              const isDeleted = entry.existsLocally === false;
              const expandable = entry.children.length > 1;
              const isExpanded = expandedProjects.has(entry.groupKey);
              const metaMid = expandable ? entry.clients.map(clientLabel).join(" · ") : (entry.model || "-");
              return (
                <div key={entry.groupKey} className="project-group">
                  <div
                    className={`project-row ${isDeleted ? "project-row-deleted" : ""}`}
                    title={entry.displayPath || entry.workspaceKey}
                    onClick={expandable ? () => toggleProject(entry.groupKey) : undefined}
                    style={{
                      ...(isDeleted ? { opacity: 0.65, background: "#f1f5f9" } : {}),
                      ...(expandable ? { cursor: "pointer" } : {}),
                    }}
                  >
                    <div className="project-row-info" style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                      <div className="project-row-name-container" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {expandable && (
                          <ChevronRight
                            size={14}
                            style={{ flexShrink: 0, color: "#94a3b8", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
                          />
                        )}
                        <strong data-i18n-skip style={{ fontSize: "14px", color: isDeleted ? "#64748b" : "#0f172a", textDecoration: isDeleted ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.realName || entry.workspaceLabel || entry.workspaceKey || "未识别项目"}
                        </strong>
                        {expandable && (
                          <span style={{ flexShrink: 0, height: "16px", padding: "0 6px", display: "inline-flex", alignItems: "center", fontSize: "10px", fontWeight: 700, color: "#0b84ee", border: "1px solid #bfdbfe", borderRadius: "4px", background: "#eff6ff" }}>
                            {entry.children.length} 端
                          </span>
                        )}
                        {isDeleted && (
                          <span className="deleted-tag" style={{ display: "inline-flex", alignItems: "center", height: "16px", padding: "0 6px", fontSize: "10px", fontWeight: 700, color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "4px", background: "#fef2f2" }}>
                            已失效
                          </span>
                        )}
                      </div>
                      <small className="project-row-meta" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
                        <span className="project-path" data-i18n-skip style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.displayPath || entry.workspaceKey || "-"}
                        </span>
                        <span className="meta-divider" style={{ flexShrink: 0 }}>·</span>
                        <span style={{ flex: "0 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{metaMid}</span>
                        <span className="meta-divider" style={{ flexShrink: 0 }}>·</span>
                        <span style={{ flexShrink: 0 }}>{formatNumber(entry.messageCount)} 消息</span>
                      </small>
                    </div>
                    <b style={{ color: isDeleted ? "#94a3b8" : "#0b84ee", fontSize: "15px", flexShrink: 0 }}>{formatCost(entry.cost)}</b>
                  </div>
                  {expandable && isExpanded && (
                    <div className="project-children" style={{ marginLeft: "22px", borderLeft: "2px solid #e2e8f0", paddingLeft: "12px", marginTop: "2px", marginBottom: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                      {entry.children.map((child) => (
                        <div
                          key={`${child.client}:${child.workspaceLabel || child.workspaceKey}`}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "4px 0" }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: child.existsLocally === false ? "#94a3b8" : "#334155" }}>
                              {clientLabel(child.client)}
                            </span>
                            <small style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{child.model || "-"}</span>
                              <span className="meta-divider">·</span>
                              <span>{formatNumber(child.messageCount)} 消息</span>
                            </small>
                          </div>
                          <b style={{ color: "#64748b", fontSize: "13px", flexShrink: 0 }}>{formatCost(child.cost)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredProjects.length === 0 && <p className="empty-text">当前范围没有项目数据。</p>}
          </div>
          {filteredProjects.length > pageSize && (
            <div className="pagination-bar" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
              <button 
                type="button" 
                className="pagination-btn"
                onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                disabled={projectPage === 1}
                style={{ height: "28px", padding: "0 10px", fontSize: "12px", color: projectPage === 1 ? "#cbd5e1" : "#1e293b", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", cursor: projectPage === 1 ? "not-allowed" : "pointer" }}
              >
                上一页
              </button>
              <span className="pagination-text" style={{ fontSize: "13px", color: "#475569" }}>{projectPage} / {totalProjectPages}</span>
              <button 
                type="button" 
                className="pagination-btn"
                onClick={() => setProjectPage((p) => Math.min(totalProjectPages, p + 1))}
                disabled={projectPage === totalProjectPages}
                style={{ height: "28px", padding: "0 10px", fontSize: "12px", color: projectPage === totalProjectPages ? "#cbd5e1" : "#1e293b", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", cursor: projectPage === totalProjectPages ? "not-allowed" : "pointer" }}
              >
                下一页
              </button>
            </div>
          )}
        </article>
  );
}
