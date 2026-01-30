import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      spacing: {
        // iOS 4pt Grid Spacing
        'ios-0': '0px',
        'ios-1': '4px',
        'ios-2': '8px',
        'ios-3': '12px',
        'ios-4': '16px',
        'ios-5': '20px',
        'ios-6': '24px',
        'ios-7': '32px',
        'ios-8': '40px',
        'ios-9': '48px',
        'ios-10': '64px',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Gold Primary (D3ECOM)
        gold: {
          DEFAULT: "hsl(var(--gold))",
          hover: "hsl(var(--gold-hover))",
          glow: "hsl(var(--gold-glow))",
        },

        // Brand - iOS Yellow Style
        brand: {
          DEFAULT: "hsl(var(--brand-primary))",
          primary: "hsl(var(--brand-primary))",
          soft: "hsl(var(--brand-primary-soft))",
          strong: "hsl(var(--brand-primary-strong))",
        },

        // Text - iOS Style
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
          muted: "hsl(var(--text-muted))",
          link: "hsl(var(--text-link))",
        },

        // State Colors - iOS
        state: {
          success: "hsl(var(--state-success))",
          warning: "hsl(var(--state-warning))",
          error: "hsl(var(--state-error))",
          info: "hsl(var(--state-info))",
        },

        // Border - iOS Style
        "border-subtle": "hsl(var(--border-subtle))",
        "border-strong": "hsl(var(--border-strong))",
        
        // Surfaces
        surface: {
          page: "hsl(var(--surface-page))",
          card: "hsl(var(--surface-card))",
          input: "hsl(var(--surface-input))",
          elevated: "hsl(var(--surface-elevated))",
        },
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "hsl(var(--secondary-light))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          light: "hsl(var(--danger-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      transitionDuration: {
        'ios-fast': 'var(--duration-fast)',
        'ios-default': 'var(--duration-default)',
        'ios-slow': 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        'ios': 'var(--ease-ios)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-subtle': 'var(--gradient-subtle)',
        'gradient-gold-glow': 'var(--gradient-gold-glow)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'primary': 'var(--shadow-primary)',
        'glow': 'var(--shadow-glow)',
        'gold': 'var(--shadow-gold)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // iOS Border Radius
        'ios-none': '0px',
        'ios-xs': '4px',
        'ios-sm': '8px',
        'ios-md': '12px',
        'ios-lg': '20px',
        'ios-full': '999px',
      },
      fontFamily: {
        sans: ['"SF Pro"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      fontSize: {
        // iOS Typography Scale
        'display-lg': ['34px', { lineHeight: '40px', letterSpacing: '0.37px', fontWeight: '700' }],
        'title-lg': ['28px', { lineHeight: '34px', letterSpacing: '0.36px', fontWeight: '700' }],
        'title-md': ['22px', { lineHeight: '28px', letterSpacing: '0.35px', fontWeight: '600' }],
        'title-sm': ['20px', { lineHeight: '24px', letterSpacing: '0.38px', fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '600' }],
        'body': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '400' }],
        'callout': ['16px', { lineHeight: '21px', letterSpacing: '-0.32px', fontWeight: '400' }],
        'subhead': ['15px', { lineHeight: '20px', letterSpacing: '-0.24px', fontWeight: '400' }],
        'caption-ios': ['13px', { lineHeight: '18px', letterSpacing: '-0.08px', fontWeight: '400' }],
        'footnote': ['12px', { lineHeight: '16px', letterSpacing: '0px', fontWeight: '400' }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "shimmer": {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        "liquid-move": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(45 100% 50% / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(45 100% 50% / 0.5)" },
        },
        "fade-in-zoom": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "shimmer": "shimmer 2s infinite",
        "liquid-move": "liquid-move 25s ease-in-out infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "fade-in-zoom": "fade-in-zoom 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
