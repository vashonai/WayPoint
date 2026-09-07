const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettier,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'android/**', 'ios/**'],
  },
  {
    rules: {
      /**
       * Lint as architecture enforcement.
       *
       * The folder boundaries and the brand colour rules only hold if a tool
       * enforces them. Convention alone does not survive a second engineer.
       */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/*/*/*'],
              message:
                'Import a feature through its public surface, not by reaching into its internals.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // Hex literals in component files. Colours come from src/theme/tokens.
          selector:
            "JSXAttribute[name.name=/^(color|backgroundColor|borderColor|tintColor)$/] Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            'Colours come from src/theme/tokens (Brand & Style Guide §2). Do not inline a hex value.',
        },
      ],
    },
  },
];
