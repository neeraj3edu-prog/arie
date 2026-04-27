const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'app/**/*.{js,jsx,ts,tsx}'),
    path.join(__dirname, 'components/**/*.{js,jsx,ts,tsx}'),
    path.join(__dirname, 'lib/**/*.{js,jsx,ts,tsx}'),
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#13131a',
        'surface-raised': '#1c1c27',
        'text-primary': '#f0f0f5',
        'text-secondary': '#8a8aa0',
        'text-muted': '#4a4a60',
        tasks: '#4f6ef7',
        expenses: '#f7a24f',
        success: '#34c759',
        error: '#ff453a',
        border: 'rgba(255,255,255,0.07)',
        'border-strong': 'rgba(255,255,255,0.14)',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  // Force-include all custom utility classes used in the app.
  // NativeWind's web CSS cache doesn't always pick them up via file scanning.
  safelist: [
    // Backgrounds
    'bg-bg', 'bg-surface', 'bg-surface-raised',
    'bg-tasks', 'bg-expenses', 'bg-success', 'bg-error',
    // Text
    'text-text-primary', 'text-text-secondary', 'text-text-muted',
    'text-tasks', 'text-expenses', 'text-success', 'text-error',
    // Borders
    'border-border', 'border-border-strong',
    'border-tasks', 'border-expenses',
    // Common layout
    'flex-1', 'flex-row', 'flex-wrap',
    'items-center', 'items-start', 'items-end',
    'justify-center', 'justify-between', 'justify-end',
    'overflow-hidden',
    // Rounded
    'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
    // Padding / margin
    'px-4', 'px-5', 'px-6', 'py-3', 'py-4',
    'mt-1', 'mt-2', 'mt-3', 'mb-2', 'mb-3', 'mb-4',
    // Text sizes
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-2xl', 'text-3xl',
    'font-medium', 'font-semibold', 'font-bold',
    // Line-through, opacity
    'line-through', 'opacity-50', 'opacity-80',
    // Active state
    'active:opacity-75', 'active:opacity-80',
  ],
  plugins: [],
};
