import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const directColorPattern =
  /\b(?:text|bg|border|ring|fill|stroke)-(?:perfo-[\w/-]+|white|black)\b|\b(?:text|bg|border|ring|fill|stroke)-\[[^\]]*#(?:[0-9a-fA-F]{3,8})[^\]]*\]|\b(?:text|bg|border|ring|fill|stroke)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/

const isStyleContext = (node) => {
  let current = node;

  while (current?.parent) {
    const parent = current.parent;

    if (
      parent.type === "JSXAttribute"
      && (parent.name.name === "className" || parent.name.name === "class")
    ) {
      return true;
    }

    if (
      parent.type === "CallExpression"
      && parent.callee.type === "Identifier"
      && ["cn", "cva"].includes(parent.callee.name)
    ) {
      return true;
    }

    current = parent;
  }

  return false;
};

const colorTokenRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct color utility classes in JSX and class composition helpers.",
    },
    messages: {
      useTokens:
        "Use semantic theme tokens instead of direct color classes. Prefer `bg-background`, `text-foreground`, `border-border`, `text-primary`, or `bg-[var(--surface-raised)]`.",
    },
    schema: [],
  },
  create(context) {
    const reportIfMatched = (node, value) => {
      if (!isStyleContext(node) || !directColorPattern.test(value)) {
        return;
      }

      context.report({
        node,
        messageId: "useTokens",
      });
    };

    return {
      Literal(node) {
        if (typeof node.value === "string") {
          reportIfMatched(node, node.value);
        }
      },
      TemplateElement(node) {
        reportIfMatched(node, node.value.raw);
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist-electron/**",
    "playwright-report/**",
    "test-results/**",
    "types/routes.d.ts",
  ]),
  {
    plugins: {
      perfo: {
        rules: {
          "no-direct-color-classes": colorTokenRule,
        },
      },
    },
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "perfo/no-direct-color-classes": "error",
    },
  },
  {
    files: ["main-process/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
