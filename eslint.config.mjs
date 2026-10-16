import js from "@eslint/js";
import babelParser from "@babel/eslint-parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "release/**", "coverage/**", "node_modules/**", "src-tauri/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          // Babel 8's preset-typescript enables JSX from the file extension
          // (.tsx), so preset-react is scoped to JSX-capable files. Applying it
          // to .ts would make `<T>` parse as JSX instead of a type parameter.
          presets: ["@babel/preset-typescript"],
          overrides: [
            {
              test: /\.(tsx|jsx|js)$/,
              presets: [["@babel/preset-react", { runtime: "automatic" }]],
            },
          ],
        },
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.jest,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh.plugin,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs["recommended-latest"].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-refresh/only-export-components": "off",
      "react-hooks/set-state-in-effect": "off",
      // The app plays music, not captioned video, so its <audio> elements have
      // no captions to require.
      "jsx-a11y/media-has-caption": "off",
      // AppCheckbox wraps MUI's Checkbox (a native input) and the label text
      // sits two levels deep, past the rule's default depth of 2.
      "jsx-a11y/label-has-associated-control": [
        "error",
        { controlComponents: ["AppCheckbox"], depth: 3 },
      ],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  {
    files: ["vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
