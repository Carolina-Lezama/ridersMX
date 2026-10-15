const { spawn } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const command = process.argv[2] || 'start';
const expoCommands = {
  start: ['start'],
  'run:android': ['run:android'],
  'run:ios': ['run:ios'],
  web: ['start', '--web'],
};

if (!expoCommands[command]) {
  console.error(`Comando de Expo no reconocido: ${command}`);
  process.exit(1);
}

const pythonCommand =
  process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'py' : 'python3');
const pythonArgs = [
  ...(process.platform === 'win32' && pythonCommand === 'py' ? ['-3'] : []),
  path.join(projectRoot, 'src', 'services', 'geminiapi.py'),
];
const backend = spawn(pythonCommand, pythonArgs, {
  cwd: projectRoot,
  env: { ...process.env, PYTHONUNBUFFERED: '1' },
  stdio: 'inherit',
});

let backendError;
let expo;
let shuttingDown = false;

backend.on('error', error => {
  backendError = error;
});

function stopChildren(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;

  for (const child of [expo, backend]) {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
  }
}

backend.on('exit', code => {
  if (!shuttingDown) {
    console.error(`El servidor Python terminó inesperadamente (código ${code ?? 'desconocido'}).`);
    stopChildren(code || 1);
  }
});

process.on('SIGINT', () => stopChildren(130));
process.on('SIGTERM', () => stopChildren(143));

async function waitForBackend() {
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    if (backendError) {
      throw new Error(
        `No se pudo iniciar Python (${pythonCommand}). Instala Python 3 o configura PYTHON_EXECUTABLE. ${backendError.message}`,
      );
    }
    if (backend.exitCode !== null || backend.signalCode !== null) {
      throw new Error(
        'El servidor Python terminó antes de estar listo. Revisa el error anterior y confirma que .env contenga GEMINI_API_KEY.',
      );
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/health', {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // Retry while Flask starts.
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error('El servidor Python no respondió en el puerto 5000 en 30 segundos.');
}

async function main() {
  try {
    await waitForBackend();
  } catch (error) {
    console.error(error.message);
    stopChildren(1);
    return;
  }

  console.log('Servidor del chatbot listo en http://127.0.0.1:5000');
  expo = spawn(
    process.execPath,
    [path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli'), ...expoCommands[command]],
    { cwd: projectRoot, env: process.env, stdio: 'inherit' },
  );

  expo.on('error', error => {
    console.error(`No se pudo iniciar Expo: ${error.message}`);
    stopChildren(1);
  });
  expo.on('exit', code => stopChildren(code || 0));
}

main();
