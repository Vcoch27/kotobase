import * as React from "react";
import { cn } from "@/lib/cn";

// ── Props ────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Cấp độ elevation — dùng shadow thay vì viền 1px */
  elevation?: "flat" | "sm" | "md" | "lg";
  /** Bật hover effect (translateY + shadow nâng) */
  hoverable?: boolean;
  /** Bật selected state */
  selected?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      elevation = "sm",
      hoverable = false,
      selected = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base — nền surface, bo góc xl, transition
          "rounded-xl bg-[oklch(var(--color-surface))] transition-all duration-200",

          // Elevation system — không viền, dùng shadow
          elevation === "flat" && "shadow-none bg-[oklch(var(--color-surface-raised))]",
          elevation === "sm"   && "shadow-elevation-sm",
          elevation === "md"   && "shadow-elevation-md",
          elevation === "lg"   && "shadow-elevation-lg",

          // Hoverable state
          hoverable && [
            "cursor-pointer",
            "hover:-translate-y-0.5 hover:shadow-elevation-md",
          ],

          // Selected state
          selected && [
            "ring-2 ring-[oklch(var(--ring))] ring-offset-1 ring-offset-[oklch(var(--color-bg))]",
            "bg-[oklch(var(--color-accent-muted))]",
          ],

          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

// ── Sub-components ────────────────────────────────────────────────────────────
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-heading-3 font-semibold leading-tight text-[oklch(var(--color-text-primary))]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body-sm text-[oklch(var(--color-text-muted))]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
