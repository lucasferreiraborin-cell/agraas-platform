import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ag-empty-state">
      {Icon && (
        <div className="ag-empty-state-icon">
          <Icon size={20} />
        </div>
      )}
      <p className="ag-empty-state-title">{title}</p>
      {text && <p className="ag-empty-state-text">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
