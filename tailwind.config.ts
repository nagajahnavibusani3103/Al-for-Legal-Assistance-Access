import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        legal: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        navy: {
          800: '#1e2d42',
          900: '#0f1a2a',
          950: '#0a101d',
        },
        accent: {
          DEFAULT: '#1d4ed8', // restrained classic royal legal blue
          light: '#3b82f6',
          dark: '#1e40af',
          muted: '#eff6ff',
        },
        warning: {
          surface: '#fffbeb',
          border: '#fde68a',
          text: '#92400e',
        },
        critical: {
          surface: '#fef2f2',
          border: '#fecaca',
          text: '#991b1b',
        },
        verified: {
          surface: '#f0fdf4',
          border: '#bbf7d0',
          text: '#166534',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['var(--font-merriweather)', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
