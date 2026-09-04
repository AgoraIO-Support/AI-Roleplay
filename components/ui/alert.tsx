import type { HTMLAttributes, ReactNode } from "react";

import { AlertCircleIcon, CheckIcon, InfoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const tones = {
  info: {
    box: "border-info/30 bg-info-subtle text-info-subtle-foreground",
    Icon: InfoIcon,
  },
  success: {
    box: "border-success/30 bg-success-subtle text-success-subtle-foreground",
    Icon: CheckIcon,
  },
  warning: {
    box: "border-warning/40 bg-warning-subtle text-warning-subtle-foreground",
    Icon: AlertCircleIcon,
  },
  danger: {
    box: "border-danger/30 bg-danger-subtle text-danger-subtle-foreground",
    Icon: AlertCircleIcon,
  },
} as const;

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof tones;
  title?: string;
  /** Recovery affordance — errors should always offer a way forward. */
  action?: ReactNode;
};

export function Alert({
  className,
  tone = "info",
  title,
  action,
  children,
  ...props
}: AlertProps) {
  const { box, Icon } = tones[tone];
  const isLive = tone === "danger" || tone === "warning";

  return (
    <div
      role={isLive ? "alert" : "status"}
      aria-live={isLive ? "assertive" : "polite"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", box, className)}
      {...props}
    >
      {/* Icon pairs with colour so meaning survives for colour-blind users. */}
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold leading-5">{title}</p>}
        {children && (
          <div className="leading-5 [text-wrap:pretty]">{children}</div>
        )}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
