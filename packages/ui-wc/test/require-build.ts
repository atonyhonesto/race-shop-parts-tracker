import { existsSync } from 'node:fs';

/** The element tests run against the compiled output, the same artifact consumers import. */
export default function requireBuild(): void {
  if (!existsSync(new URL('../dist/components/life-gauge.js', import.meta.url))) {
    throw new Error(
      'packages/ui-wc is not built. Run `pnpm --filter @raceshop/ui-wc build` first.',
    );
  }
}
