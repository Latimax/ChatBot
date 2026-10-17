import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('\n🚀 Starting Groq Chat Playground development environment...');
console.log('---------------------------------------------------------');
console.log('• Express API: http://localhost:3001');
console.log('• Vite Web:    http://localhost:5173');
console.log('---------------------------------------------------------\n');

function runService(name, cwd, args, color) {
  const child = spawn(npmCmd, args, {
    cwd: path.resolve(rootDir, cwd),
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  const prefix = `[${name}]`;

  child.stdout.on('data', data => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`\x1b[${color}m${prefix}\x1b[0m ${line}`);
      }
    }
  });

  child.stderr.on('data', data => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`\x1b[${color}m${prefix}\x1b[0m \x1b[31m${line}\x1b[0m`);
      }
    }
  });

  child.on('close', code => {
    console.log(`\x1b[${color}m${prefix}\x1b[0m Process exited with code ${code}`);
  });

  return child;
}

// 36m is cyan, 35m is magenta
const serverProcess = runService('API-Server', 'server', ['run', 'dev'], '36');
const clientProcess = runService('Vite-Client', 'client', ['run', 'dev'], '35');

function cleanUp() {
  console.log('\n🛑 Shutting down services...');
  serverProcess.kill();
  clientProcess.kill();
  process.exit(0);
}

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
