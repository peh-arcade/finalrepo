import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)"
          },
          "50%": {
            transform: "translateY(-10px)"
          }
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(270 85% 60% / 0.3)"
          },
          "50%": {
            boxShadow: "0 0 40px hsl(270 85% 60% / 0.6), 0 0 60px hsl(280 90% 70% / 0.4)"
          }
        },
        "game-bounce": {
          "0%, 20%, 53%, 80%, 100%": {
            transform: "translateY(0px)"
          },
          "40%, 43%": {
            transform: "translateY(-10px)"
          },
          "70%": {
            transform: "translateY(-5px)"
          }
        },
        "tile-appear": {
          "0%": {
            opacity: "0",
            transform: "scale(0)"
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)"
          }
        },
        "tile-new": {
          "0%": {
            transform: "scale(0)"
          },
          "50%": {
            transform: "scale(1.1)"
          },
          "100%": {
            transform: "scale(1)"
          }
        },
        "tile-merged": {
          "0%": {
            transform: "scale(1)"
          },
          "50%": {
            transform: "scale(1.2)"
          },
          "100%": {
            transform: "scale(1)"
          }
        },
        "tile-2048-glow": {
          "0%": {
            boxShadow: "0 0 30px 10px rgba(243, 215, 116, 0.8)"
          },
          "100%": {
            boxShadow: "0 0 40px 15px rgba(243, 215, 116, 1)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite alternate",
        "game-bounce": "game-bounce 2s ease-in-out infinite",
        "tile-appear": "tile-appear 0.2s ease-in-out",
        "tile-new": "tile-new 0.2s ease-in-out",
        "tile-merged": "tile-merged 0.15s ease-in-out",
        "tile-2048-glow": "tile-2048-glow 1.5s ease-in-out infinite alternate"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
