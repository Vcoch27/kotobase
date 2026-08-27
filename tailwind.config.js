/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Font Family (theo DESIGN.md) ──────────────────────────────
      fontFamily: {
        display: ["var(--font-display)", "Noto Serif JP", "serif"],
        body: ["var(--font-body)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },

      // ── Font Size — Thang đo toán học × 1.25 (base 16px) ─────────
      fontSize: {
        "display": ["2.441rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "heading-1": ["1.953rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "heading-2": ["1.563rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "heading-3": ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.005em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "body": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "caption": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],
      },

      // ── Colors — Token ngữ nghĩa (đọc từ CSS variables OKLCH) ─────
      colors: {
        // Surface system
        bg: "oklch(var(--color-bg) / <alpha-value>)",
        surface: "oklch(var(--color-surface) / <alpha-value>)",
        "surface-raised": "oklch(var(--color-surface-raised) / <alpha-value>)",
        border: "oklch(var(--color-border) / <alpha-value>)",

        // Text system
        "text-primary": "oklch(var(--color-text-primary) / <alpha-value>)",
        "text-muted": "oklch(var(--color-text-muted) / <alpha-value>)",

        // Brand colors
        primary: {
          DEFAULT: "oklch(var(--color-primary) / <alpha-value>)",
          hover: "oklch(var(--color-primary-hover) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--color-accent) / <alpha-value>)",
          hover: "oklch(var(--color-accent-hover) / <alpha-value>)",
          muted: "oklch(var(--color-accent-muted) / <alpha-value>)",
        },
        danger: "oklch(var(--color-danger) / <alpha-value>)",
        success: "oklch(var(--color-success) / <alpha-value>)",

        // Giữ lại amber/slate cho backward compatibility với components chưa migrate
        amber: require("tailwindcss/colors").amber,
        slate: require("tailwindcss/colors").slate,
        emerald: require("tailwindcss/colors").emerald,
        red: require("tailwindcss/colors").red,
        sky: require("tailwindcss/colors").sky,
        indigo: require("tailwindcss/colors").indigo,
        rose: require("tailwindcss/colors").rose,
        purple: require("tailwindcss/colors").purple,
        yellow: require("tailwindcss/colors").yellow,
        green: require("tailwindcss/colors").green,
        blue: require("tailwindcss/colors").blue,
        orange: require("tailwindcss/colors").orange,
        gray: require("tailwindcss/colors").gray,
        zinc: require("tailwindcss/colors").zinc,
        neutral: require("tailwindcss/colors").neutral,
        stone: require("tailwindcss/colors").stone,
        teal: require("tailwindcss/colors").teal,
        cyan: require("tailwindcss/colors").cyan,
        violet: require("tailwindcss/colors").violet,
        fuchsia: require("tailwindcss/colors").fuchsia,
        pink: require("tailwindcss/colors").pink,
        lime: require("tailwindcss/colors").lime,
      },

      // ── Box Shadow — Hệ thống Elevation (không viền) ──────────────
      boxShadow: {
        "elevation-sm": "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        "elevation-md": "0 4px 12px rgba(0,0,0,0.09), 0 2px 4px rgba(0,0,0,0.05)",
        "elevation-lg": "0 16px 40px rgba(0,0,0,0.13), 0 4px 8px rgba(0,0,0,0.07)",
        "elevation-xl": "0 24px 64px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.08)",
        // Dark mode elevations (sẽ được override qua CSS var)
        "glow-accent": "0 0 20px oklch(72% 0.18 55 / 0.25)",
        "glow-primary": "0 0 20px oklch(52% 0.16 250 / 0.25)",
      },

      // ── Ring (Focus) ───────────────────────────────────────────────
      ringColor: {
        DEFAULT: "oklch(var(--ring) / <alpha-value>)",
      },

      // ── Animation ─────────────────────────────────────────────────
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-out": "fadeOut 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "zoom-in": "zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "shimmer": "shimmer 1.8s infinite linear",
        "pulse-soft": "pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      // ── Keyframes ─────────────────────────────────────────────────
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        fadeOut: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.98)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        zoomIn: {
          "0%": { opacity: "0", transform: "translate(-50%, -45%) scale(0.95)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
