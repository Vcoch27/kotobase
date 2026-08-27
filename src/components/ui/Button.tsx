import * as React from "react";
import { cn } from "@/lib/cn";

// ── Types ────────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

// ── Variant styles ────────────────────────────────────────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[oklch(var(--color-primary))] text-white",
    "hover:bg-[oklch(var(--color-primary-hover))]",
    "shadow-elevation-sm",
  ].join(" "),

  accent: [
    "bg-[oklch(var(--color-accent))] text-slate-950 font-semibold",
    "hover:bg-[oklch(var(--color-accent-hover))]",
    "shadow-elevation-sm",
  ].join(" "),

  secondary: [
    "bg-[oklch(var(--color-surface-raised))] text-[oklch(var(--color-text-primary))]",
    "hover:bg-[oklch(var(--color-border))]",
  ].join(" "),

  ghost: [
    "bg-transparent text-[oklch(var(--color-text-muted))]",
    "hover:bg-[oklch(var(--color-surface-raised))] hover:text-[oklch(var(--color-text-primary))]",
  ].join(" "),

  danger: [
    "bg-[oklch(var(--color-danger))] text-white",
    "hover:opacity-90",
    "shadow-elevation-sm",
  ].join(" "),
};

// ── Size styles ───────────────────────────────────────────────────────────────
const sizeStyles: Record<ButtonSize, string> = {
  sm:   "h-8  px-3   text-caption  gap-1.5 rounded-lg",
  md:   "h-10 px-4   text-body-sm  gap-2   rounded-xl",
  lg:   "h-12 px-6   text-body     gap-2   rounded-xl",
  icon: "h-9  w-9    rounded-xl",
};

// ── Component ─────────────────────────────────────────────────────────────────
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[oklch(var(--ring))] focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[oklch(var(--color-bg))]",
          "select-none whitespace-nowrap",

          // Active press effect
          "active:scale-[0.97]",

          // Variant
          variantStyles[variant],

          // Size
          sizeStyles[size],

          // Disabled
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",

          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading ? (
          <>
            <svg
              className="animate-spin w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            {children && (
              <span className="ml-1 opacity-70">{children}</span>
            )}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="shrink-0">{leftIcon}</span>
            )}
            {children}
            {rightIcon && (
              <span className="shrink-0">{rightIcon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
