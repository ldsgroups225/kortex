import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  rules: {
    'node/prefer-global/process': 'off',
  },
  ignores: [
    'dist',
    'dev-dist',
    'convex/auth.ts',
    'convex/_generated',
    '.kiro/steering/convex_rules.md',
  ],
})
