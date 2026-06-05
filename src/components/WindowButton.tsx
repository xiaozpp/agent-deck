import type { ReactNode } from "react";
import { toolApi } from "../toolApi";

export function WindowButton({
  label,
  action,
  children,
}: {
  label: string;
  action: "minimize" | "maximize" | "close";
  children: ReactNode;
}) {
  return (
    <button className="window-button" type="button" aria-label={label} onClick={() => toolApi.windowAction(action)}>
      {children}
    </button>
  );
}
