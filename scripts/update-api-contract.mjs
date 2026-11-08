// @ts-check
/**
 * Refreshes the API contract and the generated TypeScript client in one step:
 *   1. the OpenAPI contract test writes the API's current document to packages/api-client/openapi.json
 *   2. @hey-api/openapi-ts regenerates packages/api-client/src/generated from it
 *
 * Usage: pnpm api:contract
 * Commit both outputs together. CI fails if either is stale (ADR 0005).
 */
import { spawnSync } from 'node:child_process';

/**
 * @param {string} command
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} [env]
 */
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`\n✖ ${command} ${args.join(' ')} failed.`);
    process.exit(result.status ?? 1);
  }
}

run(
  'dotnet',
  [
    'test',
    '--project',
    'api/tests/RaceShop.IntegrationTests',
    '--filter-class',
    '*OpenApiContractTests',
  ],
  { ...process.env, UPDATE_OPENAPI: '1' },
);
run('pnpm', ['--filter', '@raceshop/api-client', 'generate']);
console.error('✓ openapi.json and the generated client are up to date. Commit both.');
