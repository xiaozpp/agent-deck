const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

// Codex account switching.
//
// The Codex CLI reads exactly one auth file: ~/.codex/auth.json. cockpit-tools
// stores the full token set for every signed-in account under
// ~/.antigravity_cockpit/codex_accounts/codex_<id>.json. "Switching" therefore
// means: take the target account's tokens, back up the current auth.json, write
// the target tokens into auth.json, and update cockpit's current_account_id so
// the two stay in sync.
//
// This is the most sensitive write in the app (it moves OAuth tokens), so:
//   - tokens are reconstructed from an explicit field allow-list (no blind copy)
//   - auth.json is backed up before every write
//   - the result is re-read and validated
//   - tokens NEVER cross the IPC boundary (only an account id comes in)

const HOME = os.homedir();
const CODEX_HOME = process.env.CODEX_HOME || path.join(HOME, ".codex");
const CODEX_AUTH = path.join(CODEX_HOME, "auth.json");
const COCKPIT_ROOT = path.join(HOME, ".antigravity_cockpit");
const COCKPIT_INDEX = path.join(COCKPIT_ROOT, "codex_accounts.json");
const COCKPIT_ACCOUNTS = path.join(COCKPIT_ROOT, "codex_accounts");

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

// Resolve a stored account file, preferring the live `.json`, falling back to
// `.json.bak` (cockpit writes atomically, so the live file can momentarily vanish).
function readStoredAccount(id) {
  if (!/^codex_[0-9a-z]+$/i.test(id)) return null;
  return readJson(path.join(COCKPIT_ACCOUNTS, `${id}.json`)) || readJson(path.join(COCKPIT_ACCOUNTS, `${id}.json.bak`));
}

function currentAccountId() {
  const live = readJson(CODEX_AUTH);
  return (live && live.tokens && live.tokens.account_id) || null;
}

// Whether account switching is usable on this machine (cockpit cache present).
function switchAvailable() {
  return exists(COCKPIT_INDEX) && exists(COCKPIT_ACCOUNTS);
}

function backup(fp) {
  if (!exists(fp)) return null;
  const bak = `${fp}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  try { fs.copyFileSync(fp, bak); return bak; } catch { return null; }
}

/**
 * Switch the live Codex account to the stored account with cockpit id `targetId`.
 * Returns { ok, switchedTo, backup } — never leaks tokens.
 */
function switchCodexAccount(targetId) {
  if (!switchAvailable()) {
    return { ok: false, message: "未找到 cockpit-tools 的 Codex 账号缓存，无法切换。" };
  }
  const acct = readStoredAccount(targetId);
  if (!acct || !acct.tokens || !acct.tokens.access_token) {
    return { ok: false, message: "目标账号缺少有效凭据（可能是 API-Key 账号或缓存损坏）。" };
  }
  const t = acct.tokens;
  // cockpit stores account_id at the TOP level of the account file, not inside
  // `tokens`; auth.json needs it inside `tokens`. Pull from either location.
  const accountId = t.account_id || acct.account_id;
  if (!accountId || !t.id_token || !t.refresh_token) {
    return { ok: false, message: "目标账号凭据不完整，无法切换。" };
  }

  // Reconstruct auth.json from a strict allow-list, preserving the live file's
  // top-level shape where possible.
  const live = readJson(CODEX_AUTH) || {};
  const next = {
    OPENAI_API_KEY: live.OPENAI_API_KEY ?? null,
    tokens: {
      access_token: t.access_token,
      account_id: accountId,
      id_token: t.id_token,
      refresh_token: t.refresh_token,
    },
    last_refresh: new Date().toISOString(),
  };

  // Back up + write atomically (temp then rename).
  const bak = backup(CODEX_AUTH);
  try {
    fs.mkdirSync(CODEX_HOME, { recursive: true });
    const tmp = CODEX_AUTH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
    fs.renameSync(tmp, CODEX_AUTH);
  } catch (e) {
    return { ok: false, message: "写入 auth.json 失败：" + e.message, backup: bak };
  }

  // Validate the write landed.
  const check = readJson(CODEX_AUTH);
  if (!check || !check.tokens || check.tokens.account_id !== accountId) {
    return { ok: false, message: "写入校验失败，已保留备份。", backup: bak };
  }

  // Keep cockpit's pointer in sync (best-effort; don't fail the switch if this errors).
  try {
    const idx = readJson(COCKPIT_INDEX);
    if (idx && idx.current_account_id !== targetId) {
      backup(COCKPIT_INDEX);
      idx.current_account_id = targetId;
      fs.writeFileSync(COCKPIT_INDEX, JSON.stringify(idx, null, 2), "utf8");
    }
  } catch { /* non-fatal */ }

  return { ok: true, switchedTo: acct.email || targetId, backup: bak };
}

module.exports = { switchCodexAccount, currentAccountId, switchAvailable };
