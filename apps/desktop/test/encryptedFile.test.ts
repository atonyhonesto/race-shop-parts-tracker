import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EncryptedFile } from '../src/main/encryptedFile';
import type { Encryptor } from '../src/main/encryptedFile';

/** Stand-in for Electron safeStorage: reversible, but never the plain text. */
function fakeEncryptor(available = true): Encryptor {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (text) => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`),
    decryptString: (data) => {
      const value = data.toString();
      if (!value.startsWith('enc:')) throw new Error('Not encrypted by this user');
      return Buffer.from(value.slice(4), 'base64').toString();
    },
  };
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'raceshop-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('EncryptedFile', () => {
  it('round-trips a value and never writes plain text to disk', async () => {
    const file = new EncryptedFile(join(dir, 'nested', 'cache.bin'), fakeEncryptor());

    await file.write('{"parts":["BR-380-F"]}');

    expect(await file.read()).toBe('{"parts":["BR-380-F"]}');
    expect((await readFile(join(dir, 'nested', 'cache.bin'))).toString()).not.toContain('BR-380-F');
  });

  it('returns null when nothing has been saved', async () => {
    expect(await new EncryptedFile(join(dir, 'missing.bin'), fakeEncryptor()).read()).toBeNull();
  });

  it('stores nothing when OS encryption is unavailable (memory only, never plain text)', async () => {
    const path = join(dir, 'cache.bin');
    const file = new EncryptedFile(path, fakeEncryptor(false));

    await file.write('secret');

    await expect(readFile(path)).rejects.toThrow();
    expect(await file.read()).toBeNull();
  });

  it('discards a file it cannot decrypt (e.g. copied from another account)', async () => {
    const path = join(dir, 'cache.bin');
    await writeFile(path, 'garbage');

    expect(await new EncryptedFile(path, fakeEncryptor()).read()).toBeNull();
    await expect(readFile(path)).rejects.toThrow();
  });
});
