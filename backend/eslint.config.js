import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import { defineConfig } from "eslint/config"
import n from "eslint-plugin-n"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import unusedImports from "eslint-plugin-unused-imports"
import tseslint from "typescript-eslint"

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      // Type information for no-floating-promises. It needs the TypeScript JS API, so typescript must be <= 6.0
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      n,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      // Rules carried over from the old biome.json
      "@typescript-eslint/no-unused-vars": "off", // replaced by unused-imports, which can autofix imports
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-explicit-any": "warn",
      eqeqeq: ["error", "always"],
      "@typescript-eslint/no-floating-promises": [
        "warn",
        {
          // describe/it/after of node:test return promises that the test runner already handles
          allowForKnownSafeCalls: [
            {
              from: "package",
              package: "node:test",
              name: ["describe", "it", "test", "suite", "before", "after", "beforeEach", "afterEach"],
            },
          ],
        },
      ],
      "n/prefer-node-protocol": "warn",
      // Biome's organizeImports
      // One group: packages first, then relative paths, with no blank lines between them (like Biome)
      "simple-import-sort/imports": ["warn", { groups: [["^\\u0000", "^node:", "^@?\\w", "^", "^\\."]] }],
      "simple-import-sort/exports": "warn",

      // Extra type-aware rules that Biome did not have
      "@typescript-eslint/no-misused-promises": "warn", // async callback where a void one is expected
      "@typescript-eslint/return-await": ["warn", "always"], // always `return await`: required inside try/catch, and keeps the function in async stack traces
      "@typescript-eslint/switch-exhaustiveness-check": "warn", // every case of a union handled
      "@typescript-eslint/no-unsafe-argument": "warn", // an `any` used as if it had a type
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
    },
  },
  {
    // supertest's res.body is `any` by nature: the assertions are what check its shape
    files: ["src/tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  // Must be last: turns off the rules that would fight with Prettier's formatting
  prettier,
)
