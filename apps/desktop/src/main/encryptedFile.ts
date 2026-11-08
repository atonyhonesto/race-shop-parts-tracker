import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** The part of Electron's safeStorage we use; injected so tests don't need Electron. */
export interface Encryptor {
  isEncryptionAvailable: () => boolean;
  encryptString: (plainText: string) => Buffer;
  decryptString: (encrypted: Buffer) => string;
}

/**
 * A file whose contents are encrypted with the OS user's key (Windows DPAPI via Electron
 * safeStorage). Used for the MSAL token cache and the offline parts cache. If encryption isn't
 * available, nothing is written: data stays in memory rather than on disk in plain text.
 */
export class EncryptedFile {
  constructor(
    private readonly path: string,
    private readonly encryptor: Encryptor,
  ) {}

  get canPersist(): boolean {
    return this.encryptor.isEncryptionAvailable();
  }

  async read(): Promise<string | null> {
    if (!this.canPersist) return null;
    try {
      return this.encryptor.decryptString(await readFile(this.path));
    } catch (error) {
      if (isMissingFile(error)) return null;
      // Unreadable (e.g. copied from another Windows account): treat as empty and start fresh.
      await this.remove();
      return null;
    }
  }

  async write(value: string): Promise<void> {
    if (!this.canPersist) return;
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, this.encryptor.encryptString(value));
  }

  async remove(): Promise<void> {
    await rm(this.path, { force: true });
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
