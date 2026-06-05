import { Save } from "lucide-react";

export function SkillEditor({
  title,
  isCreate,
  isClaude = true,
  createSource,
  onCreateSource,
  form,
  setForm,
  busy,
  onSave,
  onCancel,
}: {
  title: string;
  isCreate: boolean;
  isClaude?: boolean;
  createSource?: "claude" | "codex";
  onCreateSource?: (s: "claude" | "codex") => void;
  form: { name: string; description: string; allowedTools: string; body: string };
  setForm: (f: { name: string; description: string; allowedTools: string; body: string }) => void;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  // Both Claude Code and Codex use the same SKILL.md standard now.
  const claudeLike = true;
  void isClaude;
  return (
    <div className="skill-detail">
      <div className="skill-detail-head">
        <h2>{title}</h2>
      </div>

      {isCreate && (
        <div className="skill-field">
          <label>来源</label>
          <div className="skills-source-tabs">
            <button type="button" className={createSource === "claude" ? "range-pill active" : "range-pill"} onClick={() => onCreateSource?.("claude")}>Claude Code</button>
            <button type="button" className={createSource === "codex" ? "range-pill active" : "range-pill"} onClick={() => onCreateSource?.("codex")}>Codex</button>
          </div>
        </div>
      )}

      <div className="skill-field">
        <label>名称 {isCreate && <em>（仅字母、数字、- 和 _）</em>}</label>
        <input
          value={form.name}
          disabled={!isCreate}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={claudeLike ? "例如 pdf-export" : "例如 review"}
        />
      </div>

      <div className="skill-field">
        <label>描述{claudeLike && <em>（决定何时被自动调用，务必清晰）</em>}</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="一句话说明这个 skill 做什么、何时使用"
        />
      </div>

      {claudeLike && (
        <div className="skill-field">
          <label>allowed-tools <em>（逗号分隔，可留空）</em></label>
          <input
            value={form.allowedTools}
            onChange={(e) => setForm({ ...form, allowedTools: e.target.value })}
            placeholder="Read, Grep, Bash"
          />
        </div>
      )}

      <div className="skill-field skill-field-grow">
        <label>{claudeLike ? "SKILL.md 正文" : "提示内容"}</label>
        <textarea
          className="skill-body-input"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder={claudeLike ? "# 步骤\n\n描述该 skill 的操作流程…" : "在这里编写提示内容…"}
        />
      </div>

      <div className="skill-actions">
        <button className="primary-button" type="button" onClick={onSave} disabled={busy || !form.name.trim()}>
          <Save size={14} /> 保存
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>取消</button>
      </div>
    </div>
  );
}
