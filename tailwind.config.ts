import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg:       '#0f1117',
          surface:  '#1a1d27',
          border:   '#2a2d3e',
          hover:    '#232637',
          accent:   '#3b82f6',
          success:  '#22c55e',
          warning:  '#f59e0b',
          danger:   '#ef4444',
          muted:    '#6b7280',
          text:     '#e2e8f0',
          subtext:  '#94a3b8',
        },
      },
    },
  },
  plugins: [],
}

export default config
