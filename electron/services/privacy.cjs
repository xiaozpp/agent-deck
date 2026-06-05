// Shared privacy helpers for the open-source build.
//
// Agent Deck reads sensitive local data (account emails from cockpit-tools,
// conversation history from the agents). By default we DESENSITIZE personal
// identifiers (emails) before they ever cross the IPC boundary into the
// renderer, so screenshots / shared screens don't leak them. Users who want the
// full value can opt out via the TOOL_MASTER_SHOW_EMAILS=1 env var.

const SHOW_EMAILS = process.env.TOOL_MASTER_SHOW_EMAILS === "1";

// "alice.dev@example.com" -> "ali***om@example.com"
function maskEmail(email) {
  if (SHOW_EMAILS) return email || "";
  if (!email || typeof email !== "string" || !email.includes("@")) return email || "";
  const [local, domain] = email.split("@");
  if (local.length <= 4) return `${local[0] || ""}***@${domain}`;
  return `${local.slice(0, 3)}***${local.slice(-2)}@${domain}`;
}

module.exports = { maskEmail, SHOW_EMAILS };
