import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function runInstall(dirName) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Installing dependencies in ${dirName}...`);
    const child = spawn(npmCmd, ['install'], {
      cwd: path.resolve(rootDir, dirName),
      stdio: 'inherit',
      shell: true
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to install in ${dirName} (exit code ${code})`));
    });
  });
}

async function main() {
  try {
    await runInstall('server');
    await runInstall('client');
    console.log('\n✨ All dependencies installed successfully!');
  } catch (err) {
    console.error('\n❌ Installation error:', err.message);
    process.exit(1);
  }
}

main();
