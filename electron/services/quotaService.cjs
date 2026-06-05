const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { maskEmail } = require("./privacy.cjs");

// cockpit-tools (https://github.com/jlcodes99/cockpit-tools) caches each
// provider's quota API responses locally. We only READ this local cache to
// render an "intuitive quota" panel — no OAuth, no network, no code copied.
const COCKPIT_ROOT = path.join(os.homedir(), ".antigravity_cockpit");

const TIER_LABELS = {
  "g1-pro-tier": "Google AI Pro",
  "g1-ultra-tier": "Google AI Ultra",
  "free-tier": "免费版",
};
const PLAN_LABELS = {
  plus: "Plus",
  pro: "Pro",
  free: "Free",
  team: "Team",
  business: "Business",
  enterprise: "Enterprise",
};

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function tierLabel(tier) {
  if (!tier) return "";
  return TIER_LABELS[tier] || tier;
}

function planLabel(plan) {
  if (!plan) return "";
  const key = String(plan).toLowerCase();
  return PLAN_LABELS[key] || plan;
}

function toMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value; // seconds → ms
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function clampPct(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

// ── Antigravity ─────────────────────────────────────────────
// cockpit-tools buckets the many Antigravity models into a few families rather
// than listing each one. Match that: Claude / Gemini Pro / Gemini Flash.
const ANTIGRAVITY_GROUPS = [
  { label: "Claude", test: (n) => /claude/i.test(n) },
  { label: "Gemini Pro", test: (n) => /gemini/i.test(n) && /pro/i.test(n) },
  { label: "Gemini Flash", test: (n) => /gemini/i.test(n) && /flash/i.test(n) },
];

function buildAntigravityAccounts() {
  const index = readJsonSafe(path.join(COCKPIT_ROOT, "accounts.json"));
  if (!index || !Array.isArray(index.accounts) || index.accounts.length === 0) {
    return { accounts: [], reason: "未找到反重力账号缓存（请确认已安装 cockpit-tools 并登录）。" };
  }
  const accountsDir = path.join(COCKPIT_ROOT, "accounts");
  const currentId = index.current_account_id || (index.accounts[0] && index.accounts[0].id) || "";

  const accounts = [];
  for (const meta of index.accounts) {
    if (!meta || !meta.id) continue;
    const data = readJsonSafe(path.join(accountsDir, `${meta.id}.json`));
    if (!data) continue;
    const q = data.quota || {};

    // `percentage` is REMAINING quota (100 = full). Bucket each model into a
    // family (Claude / Gemini Pro / Gemini Flash); per family keep the lowest
    // remaining (worst case) + earliest reset.
    const groupMap = new Map();
    for (const m of q.models || []) {
      const name = m.display_name || m.name || "";
      if (!name || name === "未知模型") continue;
      const group = ANTIGRAVITY_GROUPS.find((g) => g.test(name));
      if (!group) continue;
      const remaining = clampPct(m.percentage);
      const resetAt = toMs(m.reset_time);
      const existing = groupMap.get(group.label);
      if (!existing) groupMap.set(group.label, { label: group.label, percentage: remaining, resetAt });
      else {
        existing.percentage = Math.min(existing.percentage, remaining);
        if (resetAt && (!existing.resetAt || resetAt < existing.resetAt)) existing.resetAt = resetAt;
      }
    }
    // Keep the fixed family order (Claude → Gemini Pro → Gemini Flash).
    const bars = ANTIGRAVITY_GROUPS.filter((g) => groupMap.has(g.label)).map((g) => {
      const v = groupMap.get(g.label);
      return { label: v.label, percentage: v.percentage, resetAt: v.resetAt, available: true };
    });

    accounts.push({
      id: meta.id,
      provider: "antigravity",
      email: maskEmail(data.email || meta.email || ""),
      name: data.name || meta.name || "",
      current: meta.id === currentId,
      disabled: !!data.disabled,
      planLabel: tierLabel(q.subscription_tier),
      isForbidden: !!q.is_forbidden,
      lastUpdated: toMs(q.last_updated) || toMs(data.usage_updated_at),
      validUntil: 0,
      credits: (q.credits || []).map((c) => ({
        label: c.credit_type === "GOOGLE_ONE_AI" ? "Google One AI 积分" : c.credit_type || "积分",
        amount: Number(c.credit_amount) || 0,
        minimum: Number(c.minimum_credit_amount_for_usage) || 0,
      })),
      bars,
    });
  }
  accounts.sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0));
  return { accounts, reason: accounts.length ? "" : "反重力账号缓存为空或无法解析。" };
}

// ── Codex ───────────────────────────────────────────────────
function buildCodexAccounts() {
  const accountsDir = path.join(COCKPIT_ROOT, "codex_accounts");
  const index = readJsonSafe(path.join(COCKPIT_ROOT, "codex_accounts.json")) || {};
  const currentId = index.current_account_id || "";

  // The account LIST must come from the stable registry, not from quota
  // presence — cockpit-tools drops the quota windows from an account file when
  // it goes idle, and rewrites files atomically (temp + rename), so a live
  // `.json` can momentarily vanish. Build the canonical id set from the index
  // entries ∪ the current-account id ∪ the on-disk `.json` files. We do NOT
  // include `.bak`-only ids — those are deleted accounts.
  const metaById = new Map();
  for (const a of index.accounts || []) {
    if (a && a.id) metaById.set(a.id, a);
  }
  if (currentId && !metaById.has(currentId)) metaById.set(currentId, { id: currentId });
  try {
    for (const f of fs.readdirSync(accountsDir)) {
      const m = /^(codex_[0-9a-f]+)\.json$/.exec(f);
      if (m && !metaById.has(m[1])) metaById.set(m[1], { id: m[1] });
    }
  } catch {
    /* dir missing — fall through to the empty check below */
  }
  if (metaById.size === 0) {
    return { accounts: [], reason: "未找到 Codex 账号缓存（请确认已在 cockpit-tools 中登录 Codex）。" };
  }

  const accounts = [];
  for (const [id, meta] of metaById) {
    // Prefer the live file; fall back to .bak when the .json is mid-rename.
    const data =
      readJsonSafe(path.join(accountsDir, `${id}.json`)) ||
      readJsonSafe(path.join(accountsDir, `${id}.json.bak`)) ||
      {};
    const q = data.quota || {};
    // Both windows are always shown so the layout is stable. The 5h window
    // cycles every 5h, so 100%/idle genuinely means full. The weekly window,
    // however, is dropped from the file when cockpit re-polls an idle account
    // (raw_data disappears) — in that case we must NOT fabricate "100%"; we
    // mark it unavailable so the UI shows "数据未获取" instead of a wrong value.
    const hPct = typeof q.hourly_percentage === "number" ? clampPct(q.hourly_percentage) : null;
    const weeklyReady = !!q.weekly_window_present && typeof q.weekly_percentage === "number";
    const bars = [
      {
        label: "5 小时",
        available: hPct !== null,
        percentage: hPct ?? 0,
        resetAt: q.hourly_window_present ? toMs(q.hourly_reset_time) : 0,
      },
      {
        label: "每周",
        available: weeklyReady,
        percentage: weeklyReady ? clampPct(q.weekly_percentage) : 0,
        resetAt: weeklyReady ? toMs(q.weekly_reset_time) : 0,
      },
    ];
    // Only OAuth accounts (with a real token set) can be switched to; API-key
    // accounts can't become the active Codex login.
    const switchable = !!(data.tokens && data.tokens.access_token && data.tokens.refresh_token);
    accounts.push({
      id,
      provider: "codex",
      email: maskEmail(data.email || meta.email || ""),
      name: "",
      current: id === currentId,
      switchable,
      disabled: !!data.disabled,
      planLabel: planLabel(data.plan_type || meta.plan_type),
      isForbidden: false,
      lastUpdated: toMs(data.usage_updated_at) || toMs(data.token_updated_at),
      validUntil: toMs(data.subscription_active_until || meta.subscription_active_until),
      credits: [],
      bars,
    });
  }
  accounts.sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0));
  return { accounts, reason: accounts.length ? "" : "Codex 账号缓存中没有可用的配额数据。" };
}

// Claude Code keeps its OAuth token in OS secure storage and fetches rate
// limits live — it never persists a quota file we can read offline.
function buildClaudeProvider() {
  return {
    provider: "claude",
    label: "Claude",
    available: false,
    reason: "Claude Code 的配额由 Anthropic 实时下发，凭据存于系统安全存储、用量不落地为本地文件，因此无法离线读取（成本/Token 已在下方统计中通过 ccusage 展示）。",
    accounts: [],
  };
}

/**
 * Read locally cached quota for every supported provider.
 * Returns { available, source, reason, providers: [...] } — never throws.
 */
function getQuota() {
  const ag = buildAntigravityAccounts();
  const cx = buildCodexAccounts();
  const providers = [
    { provider: "antigravity", label: "反重力", available: ag.accounts.length > 0, reason: ag.reason, accounts: ag.accounts },
    { provider: "codex", label: "Codex", available: cx.accounts.length > 0, reason: cx.reason, accounts: cx.accounts },
    buildClaudeProvider(),
  ];
  const available = providers.some((p) => p.available);
  return {
    available,
    source: "cockpit-tools",
    reason: available ? "" : "未找到任何本地账号缓存（请确认已安装 cockpit-tools 并登录）。",
    providers,
  };
}

module.exports = { getQuota, getAntigravityQuota: getQuota, tierLabel, planLabel };
