export type ProviderMeta = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

const PROVIDER_META: Record<string, ProviderMeta> = {
  antigravity: { label: "反重力", color: "#7c3aed", bg: "#f3ebff", border: "#e2d4fb" },
  codex: { label: "Codex", color: "#0b7285", bg: "#e6fcf5", border: "#c3fae8" },
  claude: { label: "Claude", color: "#c2410c", bg: "#fff4ed", border: "#fed7aa" },
};

export function providerMeta(provider?: string): ProviderMeta {
  return PROVIDER_META[provider || ""] || {
    label: provider || "未知",
    color: "#64748b",
    bg: "#f1f5f9",
    border: "#e2e8f0",
  };
}
