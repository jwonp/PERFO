import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

const isDev = process.env.NODE_ENV !== 'production';
const DEV_SERVER_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(DEV_SERVER_URL);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

    nextProcess = spawn(npmCommand, ['dev'], {
      cwd: isDev ? process.cwd() : path.join(__dirname, '..'),
      stdio: 'pipe',
      shell: true,
    });

    nextProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[Next.js]', output);
      if (output.includes('Ready') || output.includes('started server')) {
        resolve();
      }
    });

    nextProcess.stderr?.on('data', (data) => {
      console.error('[Next.js Error]', data.toString());
    });

    nextProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    // Timeout fallback
    setTimeout(() => resolve(), 10000);
  });
}

app.whenReady().then(async () => {
  try {
    console.log('Starting Next.js server...');
    await startNextServer();
    console.log('Next.js server started, creating window...');
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
