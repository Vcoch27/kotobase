import * as React from "react";
import { cn } from "@/lib/cn";

// ── Types ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

// ── Shared base classes ───────────────────────────────────────────────────────
const baseInputClasses = [
  // Layout
  "w-full rounded-xl transition-all duration-150",
  // Colors — không dùng border cứng, dùng bg chênh lệch
  "bg-[oklch(var(--color-surface-raised))]",
  "text-[oklch(var(--color-text-primary))]",
  "placeholder:text-[oklch(var(--color-text-muted))]",
  // Subtle border chỉ để định hình (không phải phân chia nội dung)
  "border border-[oklch(var(--color-border))]",
  // Focus — ring nổi bật thay vì border đổi màu
  "focus:outline-none focus:ring-2 focus:ring-[oklch(var(--ring))] focus:ring-offset-1",
  "focus:ring-offset-[oklch(var(--color-bg))]",
  "focus:border-transparent",
  // Disabled
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

// ── Input ─────────────────────────────────────────────────────────────────────
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, type = "text", ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[oklch(var(--color-text-muted))] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              baseInputClasses,
              "h-10 text-body-sm",
              leftIcon  && "pl-10",
              rightIcon && "pr-10",
              !leftIcon && "pl-4",
              !rightIcon && "pr-4",
              "py-2",
              error && "border-[oklch(var(--color-danger))] focus:ring-[oklch(var(--color-danger))]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[oklch(var(--color-text-muted))] pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          baseInputClasses,
          "h-10 px-4 py-2 text-body-sm",
          error && "border-[oklch(var(--color-danger))] focus:ring-[oklch(var(--color-danger))]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ── Textarea ──────────────────────────────────────────────────────────────────
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          baseInputClasses,
          "px-4 py-3 text-body-sm min-h-[80px] resize-y",
          error && "border-[oklch(var(--color-danger))] focus:ring-[oklch(var(--color-danger))]",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
