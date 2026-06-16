import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import queryPlugin from "@tanstack/eslint-plugin-query";
import storybook from "eslint-plugin-storybook";

export default tseslint.config(
  { ignores: ["dist", "storybook-static", "node_modules", "vite.config.ts"] },
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@tanstack/query": queryPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...queryPlugin.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-duplicate-imports": "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  ...storybook.configs["flat/recommended"],
);
