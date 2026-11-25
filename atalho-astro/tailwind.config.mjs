import designTokens from './src/tokens/design-tokens.json' with { type: 'json' };

const { colors, spacing, borderRadius, fontSize, fontFamily, boxShadow, transitionDuration, transitionTiming, zIndex, breakpoints } = designTokens;

export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './src/tokens/design-tokens.json',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic colors mapped from tokens
        ink: colors.ink,
        muted: colors.muted,
        paper: colors.paper,
        line: colors.line,
        lime: colors.lime,
        dark: colors.dark,
        // Extended semantic
        primary: {
          DEFAULT: colors.lime[600],
          foreground: colors.dark[900],
          hover: colors.lime[500],
          light: colors.lime[100],
        },
        surface: {
          DEFAULT: colors.paper[100],
          elevated: colors.paper[0],
          sunken: colors.paper[200],
        },
        border: {
          DEFAULT: colors.line[300],
          strong: colors.line[400],
          focus: colors.lime[500],
        },
        text: {
          primary: colors.ink[900],
          secondary: colors.ink[600],
          muted: colors.muted[500],
          inverse: colors.paper[0],
        },
        // Dark mode overrides handled via CSS variables
      },
      spacing: spacing,
      borderRadius: borderRadius,
      fontSize: fontSize,
      fontFamily: {
        sans: fontFamily.sans,
        heading: fontFamily.heading,
        mono: fontFamily.mono,
      },
      boxShadow: boxShadow,
      transitionDuration: transitionDuration,
      transitionTimingFunction: transitionTiming,
      zIndex: zIndex,
      screens: breakpoints,
      // Custom utilities
      container: {
        center: true,
        padding: {
          DEFAULT: spacing[4],
          sm: spacing[6],
          lg: spacing[8],
          xl: spacing[10],
        },
        screens: {
          sm: breakpoints.sm,
          md: breakpoints.md,
          lg: breakpoints.lg,
          xl: breakpoints.xl,
          '2xl': breakpoints['2xl'],
        },
      },
    },
  },
  plugins: [],
  safelist: [
    // Dynamic classes used in islands
    'bg-lime-500', 'bg-lime-600', 'bg-lime-100',
    'text-lime-600', 'text-lime-700',
    'border-lime-500', 'border-lime-200',
    'ring-lime-500',
    'bg-images-dot', 'bg-writing-dot', 'bg-studies-dot', 'bg-code-dot', 'bg-business-dot',
  ],
};