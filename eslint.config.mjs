import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "simple-import-sort": simpleImportSort,
    },
    settings: {
      react: {
        version: "19",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^react$", "^next", "^@?\\w"],
            ["^@root", "^@lib", "^@i18n", "^@components"],
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            ["^.+\\.(css|scss)$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
  // Prevent browser-only code from entering lib/validation/* files
  {
    files: ["lib/validation/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...["window", "document", "navigator", "location", "localStorage", "sessionStorage"].map(
          (name) => ({
            name,
            message: "Browser-only global. lib/validation/* must work on both client and server.",
          })
        ),
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["useState", "useEffect", "useContext"],
              message:
                "React hooks are client-only. lib/validation/* must work on both client and server.",
            },
          ],
          patterns: [
            {
              regex: "^next/navigation$",
              message:
                "next/navigation uses client-only hooks. lib/validation/* must work on both client and server.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-console": "off",
      "no-await-in-loop": "error",
      "no-return-await": "error",
      "react/no-jsx-in-try-catch": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='logMessage'][callee.property.name=/^(info|warn)$/] > ObjectExpression:first-child",
          message:
            "logMessage.info() and logMessage.warn() only accept string arguments. Use template literals instead: logMessage.info(`User: ${userId}`)",
        },
      ],
    },
  },
]);

export default eslintConfig;
