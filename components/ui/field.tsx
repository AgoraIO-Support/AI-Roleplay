import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { AlertCircleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/* Shared control chrome. Height is on the control scale so inputs and buttons
 line up when placed side by side, and mobile height clears 44px. */
const controlBase =
  "w-full rounded-xl border border-input bg-surface text-foreground shadow-xs" +
  "placeholder:text-subtle-foreground" +
  "transition-colors duration-fast ease-out" +
  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40" +
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70" +
  "read-only:bg-surface-sunken read-only:text-muted-foreground" +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/30";

export function Label({
  className,
  required,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      )}
      {required && <span className="sr-only"> (required)</span>}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        controlBase,
        "h-control px-3.5 text-base sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        controlBase,
        "min-h-28 resize-y px-3.5 py-2.5 text-base leading-6 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        controlBase,
        "h-control appearance-none px-3.5 pr-9 text-base sm:text-sm",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
        backgroundSize: "1rem",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Wraps a control with its label, persistent helper text and inline error.
 * The error is rendered below the field and announced via role="alert".
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      data-invalid={error ? "true" : undefined}
    >
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-danger"
        >
          <AlertCircleIcon className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** ids to wire onto the control inside a <Field>. */
export function fieldAria(
  id: string,
  { hint, error }: { hint?: unknown; error?: unknown },
) {
  const describedBy = [
    hint && !error ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}
