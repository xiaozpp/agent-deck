import { CalendarDays, Clock3, Coins, Gauge, RefreshCw } from "lucide-react";
import type { QuotaAccount, QuotaProvider } from "../../types";
import { providerMeta } from "../providerMeta";
import { formatNumber } from "./usageMetrics";

function quotaRemainStyle(remaining: number) {
  if (remaining <= 15) return { color: "#dc2626", grad: "linear-gradient(90deg,#f87171,#dc2626)" };
  if (remaining <= 40) return { color: "#d97706", grad: "linear-gradient(90deg,#fbbf24,#d97706)" };
  return { color: "#16a34a", grad: "linear-gradient(90deg,#4ade80,#16a34a)" };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function absStamp(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// cockpit-tools-style reset readout: compact countdown + absolute time.
function formatResetDetail(ms: number) {
  if (!ms) return "";
  const diff = ms - Date.now();
  if (diff <= 0) return `已重置 · ${absStamp(ms)}`;
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const cd = days > 0 ? `${days}天${hours}时` : hours > 0 ? `${hours}时${m}分` : `${m}分`;
  return `${cd}后重置 · ${absStamp(ms)}`;
}

function formatValidUntil(ms: number) {
  const d = new Date(ms);
  const days = Math.max(0, Math.ceil((ms - Date.now()) / 86400000));
  return { days, date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` };
}

function formatUpdatedLabel(ms: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "刚刚更新";
  if (mins < 60) return `${mins} 分钟前更新`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小时前更新`;
  return `${Math.round(hours / 24)} 天前更新`;
}

function QuotaAccountCard({ account, onSwitch, switching }: { account: QuotaAccount; onSwitch?: (a: QuotaAccount) => void; switching?: boolean }) {
  const resetSet = new Set(account.bars.map((b) => b.resetAt).filter(Boolean));
  const perBarReset = resetSet.size > 1;
  const accountReset = !perBarReset && resetSet.size === 1 ? [...resetSet][0] : 0;
  const pm = providerMeta(account.provider);
  const canSwitch = account.provider === "codex" && account.switchable && !account.current && onSwitch;
  return (
    <div
      className="quota-account"
      style={{ borderTop: `3px solid ${pm.color}`, background: `linear-gradient(180deg, ${pm.bg} 0%, #ffffff 72px)` }}
    >
      <div className="quota-account-head">
        <strong className="quota-account-email" title={account.email}>
          {account.email || account.name || account.id}
        </strong>
        {account.lastUpdated > 0 && (
          <span className="quota-updated">
            <Clock3 size={12} /> {formatUpdatedLabel(account.lastUpdated)}
          </span>
        )}
      </div>
      <div className="quota-badges">
        <span className="quota-badge" style={{ color: pm.color, background: pm.bg, border: `1px solid ${pm.border}` }}>
          {pm.label}
        </span>
        {account.planLabel && <span className="quota-badge quota-badge-tier">{account.planLabel}</span>}
        {account.current && <span className="quota-badge quota-badge-current">当前</span>}
        {account.isForbidden && <span className="quota-badge quota-badge-warn">已受限</span>}
        {account.disabled && <span className="quota-badge quota-badge-mute">已停用</span>}
      </div>

      {account.credits.length > 0 && (
        <div className="quota-credits">
          {account.credits.map((c) => (
            <div className="quota-credit" key={c.label}>
              <Coins size={14} />
              <span className="quota-credit-name">{c.label}</span>
              <b>{formatNumber(c.amount)}</b>
              {c.minimum > 0 && <small>可用门槛 {formatNumber(c.minimum)}</small>}
            </div>
          ))}
        </div>
      )}

      <div className="quota-models">
        {account.bars.length === 0 && <p className="empty-text">配额刷新中…（在 cockpit-tools 中打开该账号即可更新）</p>}
        {account.bars.map((bar) => {
          if (bar.available === false) {
            return (
              <div className="quota-model" key={bar.label}>
                <div className="quota-model-head">
                  <span className="quota-model-name" title={bar.label}>{bar.label}</span>
                  <span className="quota-model-pct quota-pct-na">数据未获取</span>
                </div>
                <div className="quota-bar">
                  <span className="quota-bar-fill quota-bar-na" />
                </div>
              </div>
            );
          }
          const remaining = Math.max(0, Math.min(100, bar.percentage));
          const st = quotaRemainStyle(remaining);
          return (
            <div className="quota-model" key={bar.label}>
              <div className="quota-model-head">
                <span className="quota-model-name" title={bar.label}>{bar.label}</span>
                <span className="quota-model-pct" style={{ color: st.color }}>剩余 {Math.round(remaining)}%</span>
              </div>
              <div className="quota-bar">
                <span className="quota-bar-fill" style={{ width: `${remaining}%`, background: st.grad }} />
              </div>
              {perBarReset && bar.resetAt > 0 && (
                <div className="quota-bar-sub">{formatResetDetail(bar.resetAt)}</div>
              )}
            </div>
          );
        })}
      </div>

      {account.validUntil > 0 && (
        <div className="quota-valid">
          <CalendarDays size={13} />
          <span>有效期 {formatValidUntil(account.validUntil).days} 天</span>
          <em>{formatValidUntil(account.validUntil).date}</em>
        </div>
      )}
      {accountReset > 0 && (
        <div className="quota-reset-note">
          <span>配额刷新：{formatResetDetail(accountReset)}</span>
        </div>
      )}
      {canSwitch && (
        <button className="quota-switch-btn" type="button" onClick={() => onSwitch!(account)} disabled={switching}>
          <RefreshCw size={13} className={switching ? "spin" : ""} /> 切换到此账号
        </button>
      )}
      {account.provider === "codex" && account.current && (
        <div className="quota-current-tag">✓ 当前 Codex 账号</div>
      )}
    </div>
  );
}

export function QuotaPanel({
  providers,
  loading,
  onRefresh,
  onSwitch,
  switchingId,
}: {
  providers: QuotaProvider[];
  loading: boolean;
  onRefresh: () => void;
  onSwitch?: (a: QuotaAccount) => void;
  switchingId?: string;
}) {
  const accounts = providers.flatMap((p) => (p.available ? p.accounts : []));
  const notes = providers.filter((p) => !p.available && p.reason);
  const summary = providers
    .filter((p) => p.available)
    .map((p) => `${p.label} ${p.accounts.length}`)
    .join(" · ");
  return (
    <article className="panel quota-panel">
      <div className="panel-title">
        <div className="panel-title-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Gauge size={18} style={{ color: "#7c3aed" }} />
          <h2>账号配额</h2>
          {summary && <span>{summary}</span>}
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          刷新
        </button>
      </div>
      {accounts.length === 0 && notes.length === 0 && <p className="empty-text">暂无配额数据。</p>}
      {accounts.length > 0 && (
        <div className="quota-accounts">
          {accounts.map((account) => (
            <QuotaAccountCard
              key={`${account.provider}:${account.id}`}
              account={account}
              onSwitch={onSwitch}
              switching={switchingId === account.id}
            />
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <div className="quota-notes">
          {notes.map((note) => {
            const pm = providerMeta(note.provider);
            return (
              <div className="quota-note" key={note.provider}>
                <span className="quota-badge" style={{ color: pm.color, background: pm.bg, border: `1px solid ${pm.border}` }}>
                  {pm.label}
                </span>
                <span className="quota-note-text">{note.reason}</span>
              </div>
            );
          })}
        </div>
      )}
      <footer className="quota-source">配额数据来源于本机 cockpit-tools 缓存，只读展示。</footer>
    </article>
  );
}
