// @ts-check
// Starts the built app with Electron. Clears ELECTRON_RUN_AS_NODE, which some editors and tools
// set in their terminals, because it makes Electron run as plain Node.js instead of opening the app.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const electron = /** @type {string} */ (createRequire(import.meta.url)('electron'));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
