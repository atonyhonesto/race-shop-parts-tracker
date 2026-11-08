import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { rolesFromAccessToken } from '../src/main/auth';
import { createDevAuth } from '../src/main/auth';
import { isSafeExternalUrl, isTrustedAppUrl, resolveRendererFile } from '../src/main/security';

describe('isTrustedAppUrl', () => {
  it.each([
    ['app://bundle/index.html', true],
    ['app://bundle/#/parts', true],
    ['app://evil/index.html', false],
    ['https://bundle/index.html', false],
    ['file:///C:/Windows/index.html', false],
    ['not a url', false],
    [undefined, false],
  ])('%s → %s', (url, expected) => {
    expect(isTrustedAppUrl(url)).toBe(expected);
  });
});

describe('isSafeExternalUrl', () => {
  it.each([
    ['https://learn.microsoft.com', true],
    ['http://example.com', false],
    ['file:///C:/Windows/System32/calc.exe', false],
    ['javascript:alert(1)', false],
    ['smb://server/share', false],
  ])('%s → %s', (url, expected) => {
    expect(isSafeExternalUrl(url)).toBe(expected);
  });
});

describe('resolveRendererFile', () => {
  const root = resolve('/app/dist/renderer');

  it('serves index.html for the root and files inside the renderer folder', () => {
    expect(resolveRendererFile(root, '/')).toBe(join(root, 'index.html'));
    expect(resolveRendererFile(root, '/assets/index-abc.js')).toBe(
      join(root, 'assets', 'index-abc.js'),
    );
  });

  it.each([
    '/../main/main.mjs',
    '/%2e%2e/%2e%2e/secrets.txt',
    '/assets/../../package.json',
    '/%E0%A4%A',
  ])('refuses %s', (path) => {
    expect(resolveRendererFile(root, path)).toBeNull();
  });
});

describe('rolesFromAccessToken', () => {
  const token = (claims: object) =>
    `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

  it('keeps only the app roles the app knows', () => {
    expect(rolesFromAccessToken(token({ roles: ['PartsManager', 'GlobalAdmin'] }))).toEqual([
      'PartsManager',
    ]);
  });

  it('returns no roles when the claim is missing', () => {
    expect(rolesFromAccessToken(token({ name: 'casey' }))).toEqual([]);
  });
});

describe('dev auth', () => {
  it('sends the Dev scheme headers only after sign-in, with known roles only', async () => {
    const auth = createDevAuth();
    expect(await auth.getRequestHeaders()).toBeNull();

    await auth.signIn({ name: 'alex', roles: ['PartsManager', 'Admin' as 'CrewChief'] });

    expect(await auth.getRequestHeaders()).toEqual({
      'X-Dev-User': 'alex',
      'X-Dev-Roles': 'PartsManager',
    });
    await auth.signOut();
    expect(await auth.getUser()).toBeNull();
  });
});
