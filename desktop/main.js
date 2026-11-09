const { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

function debugLog(msg) {
  try {
    fs.appendFileSync(path.join(__dirname, '..', 'desktop_boot.log'), `[${new Date().toISOString()}] ${msg}\n`);
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
    const logDir = path.join(appData, 'AlBanshar');
    if (fs.existsSync(logDir)) {
      fs.appendFileSync(path.join(logDir, 'desktop_runtime.log'), `[${new Date().toISOString()}] ${msg}\n`);
    }
  } catch (e) {}
}

process.on('uncaughtException', (err) => {
  debugLog('UNCAUGHT EXCEPTION: ' + (err.stack || err));
});

process.on('unhandledRejection', (reason) => {
  debugLog('UNHANDLED REJECTION: ' + (reason.stack || reason));
});

debugLog('desktop/main.js loaded');

let mainWindow = null;
let expressApp = null;
let autoUpdater = null;

// Initialize Auto-Updater safely
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  console.log('[Updater] electron-updater not active in dev:', e.message);
}

// 1. Single Instance Lock (prevent double-launching in busy workshop)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  debugLog('Single instance lock failed, quitting');
  app.quit();
  process.exit(0);
}
debugLog('Single instance lock acquired');

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// 2. Data Separation Rule: Isolate DB & Backups to %APPDATA%/AlBanshar
const baseAppData = process.env.APPDATA || app.getPath('appData');
const userDataPath = path.join(baseAppData, 'AlBanshar');
const appDataDbDir = path.join(userDataPath, 'db');
const appDataBackupsDir = path.join(userDataPath, 'backups');
const appDataConfigDir = path.join(userDataPath, 'data');

fs.mkdirSync(appDataDbDir, { recursive: true });
fs.mkdirSync(appDataBackupsDir, { recursive: true });
fs.mkdirSync(appDataConfigDir, { recursive: true });

const targetDbPath = path.join(appDataDbDir, 'quick_lube.db');

function getSeedDbPath() {
  const candidates = [
    path.join(process.resourcesPath, 'server', 'db', 'quick_lube.db'),
    path.join(process.resourcesPath, 'app', 'server', 'db', 'quick_lube.db'),
    path.join(__dirname, '..', 'server', 'db', 'quick_lube.db'),
    path.join(app.getAppPath(), 'server', 'db', 'quick_lube.db'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(__dirname, '..', 'server', 'db', 'quick_lube.db');
}

// First-Run Provisioning: Copy initial seed DB if target doesn't exist
const sourceSeedDb = getSeedDbPath();
if (!fs.existsSync(targetDbPath) && fs.existsSync(sourceSeedDb)) {
  try {
    fs.copyFileSync(sourceSeedDb, targetDbPath);
    debugLog('[Desktop Provisioning] Initial database seeded into %APPDATA% successfully.');
  } catch (err) {
    debugLog('[Desktop Provisioning] Seed copy warning: ' + err.message);
  }
}

// Configure persistent runtime environment
process.env.DB_PATH = targetDbPath;
process.env.BACKUPS_DIR = appDataBackupsDir;
process.env.DATA_DIR = appDataConfigDir;
process.env.PORT = process.env.PORT || '5000';
process.env.NODE_ENV = 'production';

// 3. Sidecar Node Process: Resolving node.exe runtime
let backendProcess = null;

function getNodeExecutable() {
  const candidates = [
    path.join(process.resourcesPath, '..', 'bin', 'node.exe'),
    path.join(process.resourcesPath, 'bin', 'node.exe'),
    path.join(path.dirname(process.execPath), 'bin', 'node.exe'),
    path.join(__dirname, '..', 'bin', 'node.exe'),
    path.join(__dirname, '..', '..', 'bin', 'node.exe'),
    path.join(app.getAppPath(), '..', 'bin', 'node.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      debugLog('Found node executable at: ' + c);
      return c;
    }
  }
  debugLog('No bundled node.exe found in candidates, using PATH "node"');
  return 'node';
}

function getServerScript() {
  const candidates = [
    path.join(process.resourcesPath, 'server', 'index.js'),
    path.join(process.resourcesPath, 'app', 'server', 'index.js'),
    path.join(__dirname, '..', 'server', 'index.js'),
    path.join(app.getAppPath(), 'server', 'index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      debugLog('Found server script at: ' + c);
      return c;
    }
  }
  return path.join(__dirname, '..', 'server', 'index.js');
}

function startBackendServer() {
  const nodeExe = getNodeExecutable();
  const serverScript = getServerScript();
  const serverDir = path.dirname(serverScript);
  const appRoot = path.dirname(serverDir);
  debugLog(`Spawning background Node sidecar: ${nodeExe} with script: ${serverScript} (cwd: ${appRoot})`);

  try {
    backendProcess = spawn(nodeExe, [serverScript], {
      cwd: appRoot,
      env: {
        ...process.env,
        PORT: process.env.PORT || '5000',
        DB_PATH: targetDbPath,
        BACKUPS_DIR: appDataBackupsDir,
        DATA_DIR: appDataConfigDir,
        NODE_ENV: 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProcess.stdout.on('data', (data) => {
      debugLog('[Backend stdout] ' + data.toString().trim());
    });

    backendProcess.stderr.on('data', (data) => {
      debugLog('[Backend stderr] ' + data.toString().trim());
    });

    backendProcess.on('exit', (code, signal) => {
      debugLog(`Backend process exited with code ${code} and signal ${signal}`);
    });

    debugLog('Backend child process spawned successfully with PID: ' + backendProcess.pid);
  } catch (err) {
    debugLog('Failed to spawn backend process: ' + err.stack);
  }
}

// Wait until backend responds
function waitForServerReady(port, retries = 60) {
  return new Promise((resolve) => {
    const check = (remaining) => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          debugLog('Health check returned 200 OK');
          return resolve(true);
        }
        retry(remaining);
      });
      req.on('error', () => retry(remaining));
      req.end();
    };

    const retry = (remaining) => {
      if (remaining <= 0) {
        debugLog('Health check timed out after 60 retries (15 seconds)');
        return resolve(false);
      }
      setTimeout(() => check(remaining - 1), 250);
    };

    check(retries);
  });
}

// 4. Create Full Kiosk Browser Window
async function createMainWindow() {
  const PORT = process.env.PORT || 5000;
  debugLog('Waiting for server ready on port ' + PORT);
  const serverReady = await waitForServerReady(PORT);
  debugLog('Server ready result: ' + serverReady);
  debugLog('Creating BrowserWindow...');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    kiosk: true, // Full Kiosk Mode for touchscreens
    fullscreen: true,
    autoHideMenuBar: true,
    title: 'سريع وبنشر PRO - نظام إدارة ورش الزيوت والبناشر',
    icon: path.join(__dirname, '..', 'client', 'src', 'assets', 'hero.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load backend-served production React app
  const appUrl = `http://127.0.0.1:${PORT}`;
  mainWindow.loadURL(appUrl);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    debugLog(`[Desktop Window] URL load retry: ${validatedURL} (${errorCode} - ${errorDescription})`);
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(appUrl);
    }, 1500);
  });

  // Toggle Kiosk via F11 shortcut (for manager convenience)
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      const currentKiosk = mainWindow.isKiosk();
      mainWindow.setKiosk(!currentKiosk);
      mainWindow.setFullScreen(!currentKiosk);
    }
  });

  // Toggle DevTools via F12 shortcut (for technical diagnostics)
  globalShortcut.register('F12', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for OTA Updates in packaged environment
  if (app.isPackaged && autoUpdater) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (e) {
        console.warn('[Updater] Check for updates warning:', e.message);
      }
    }, 5000);

    autoUpdater.on('update-available', (info) => {
      if (mainWindow) mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
    });
  }
}

// 5. IPC Handlers
ipcMain.handle('toggle-kiosk', () => {
  if (mainWindow) {
    const nextState = !mainWindow.isKiosk();
    mainWindow.setKiosk(nextState);
    mainWindow.setFullScreen(nextState);
    return nextState;
  }
  return false;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('restart-and-install-update', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall();
  }
});

ipcMain.handle('app-relaunch', () => {
  debugLog('[App] Restarting application after hot-patch update...');
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('print-silent', async (_event, htmlContent) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    return new Promise((resolve) => {
      printWindow.webContents
        .getPrintersAsync()
        .then((printers) => {
          if (!printers || printers.length === 0) {
            debugLog('[Silent Print] No printers installed or connected. Skipping safely.');
            try { printWindow.close(); } catch (e) {}
            return resolve({ success: false, reason: 'no_printer' });
          }

          // Find optimal receipt printer (prefer thermal POS printer or default)
          const thermalPrinter = printers.find(p => /tpl|td80|pos|thermal|receipt|xp-|rp-/i.test(p.name));
          const defaultPrinter = printers.find(p => p.isDefault);
          const targetPrinter = thermalPrinter || defaultPrinter || printers[0];

          debugLog(`[Silent Print] Target printer selected: ${targetPrinter?.name || 'System Default'}`);

          const printOptions = {
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' },
          };

          if (targetPrinter?.name) {
            printOptions.deviceName = targetPrinter.name;
          }

          printWindow.webContents.print(
            printOptions,
            (success, failureReason) => {
              try { printWindow.close(); } catch (e) {}
              if (!success) {
                debugLog('[Silent Print] Print skipped/failed gracefully: ' + failureReason);
              } else {
                debugLog(`[Silent Print] Print sent to ${targetPrinter?.name || 'default'} successfully.`);
              }
              resolve({ success, failureReason });
            }
          );
        })
        .catch((err) => {
          debugLog('[Silent Print] getPrintersAsync error: ' + err.message);
          try { printWindow.close(); } catch (e) {}
          resolve({ success: false, reason: err.message });
        });
    });
  } catch (err) {
    debugLog('[Silent Print Error] Handled safely: ' + err.message);
    return { success: false, error: err.message };
  }
});

// PDF Statement Export Handler (Offline Vector PDF Generator)
ipcMain.handle('save-statement-pdf', async (_event, { html, defaultFileName }) => {
  let pdfWindow = null;
  try {
    const filename = defaultFileName || `كشف_حساب_${new Date().toISOString().slice(0, 10)}.pdf`;
    const defaultSavePath = path.join(app.getPath('downloads'), filename);

    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'تصدير وحفظ كشف الحساب بصيغة PDF',
      defaultPath: defaultSavePath,
      filters: [{ name: 'مستند PDF (*.pdf)', extensions: ['pdf'] }],
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, canceled: true };
    }

    const targetFilePath = saveResult.filePath;

    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Give render tree a brief moment to stabilize CSS fonts and double borders
    await new Promise((resolve) => setTimeout(resolve, 300));

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        marginType: 'none',
      },
    });

    await fs.promises.writeFile(targetFilePath, pdfBuffer);
    debugLog(`[PDF Export] Statement saved successfully to: ${targetFilePath}`);

    // Reveal the saved file in Windows File Explorer
    try {
      shell.showItemInFolder(targetFilePath);
    } catch (e) {}

    return { success: true, filePath: targetFilePath };
  } catch (err) {
    debugLog('[PDF Export Error] ' + err.message);
    return { success: false, error: err.message };
  } finally {
    if (pdfWindow) {
      try {
        pdfWindow.close();
      } catch (e) {}
    }
  }
});

// 6. Application Lifecycle
app.whenReady().then(() => {
  startBackendServer();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (backendProcess) {
    debugLog('Terminating background Node process (PID: ' + backendProcess.pid + ')...');
    try {
      backendProcess.kill();
    } catch (e) {}
    backendProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
