import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // BD-04 (14/09/2026): o lint voltou a rodar (`next lint` saiu no Next 16 e o
    // eslint não estava instalado). Baseline medido nesse dia: 119 erros e 70
    // avisos — 84 deles `no-explicit-any` (38 só em app/api/chat/route.ts).
    // `any` fica como AVISO até o backlog ser pago; as regras de hooks do
    // React 19 (set-state-in-effect, purity, immutability) continuam erro
    // porque apontam bug real. Lint roda no CI sem bloquear (continue-on-error).
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
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
]);

export default eslintConfig;
