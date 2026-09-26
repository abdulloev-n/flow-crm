const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, Notification } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
app.disableHardwareAcceleration();

const portableRoot = process.env.PORTABLE_EXECUTABLE_DIR || null;
const portableFile = process.env.PORTABLE_EXECUTABLE_FILE || null;
const mode = portableRoot ? 'portable' : app.isPackaged ? 'installed' : 'development';
const portableConfigPath = portableRoot ? path.join(portableRoot, 'flow.crm-portable.json') : null;
const defaultDataPath = mode === 'portable'
  ? path.join(portableRoot, 'flow.crm-data')
  : mode === 'installed'
    ? path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'flow.crm')
    : path.join(__dirname, '..', '.flow-crm-dev-data');

let configuredDataPath = defaultDataPath;
if (portableConfigPath && fs.existsSync(portableConfigPath)) {
  try {
    const value = JSON.parse(fs.readFileSync(portableConfigPath, 'utf8'));
    if (typeof value.dataPath === 'string' && path.isAbsolute(value.dataPath)) configuredDataPath = value.dataPath;
  } catch (error) {
    dialog.showErrorBox('Storage settings', `Could not read portable storage settings.\n${error.message}`);
  }
}
fs.mkdirSync(configuredDataPath, { recursive: true });
app.setPath('userData', configuredDataPath);
const sessionPath = path.join(configuredDataPath, 'session');
fs.mkdirSync(sessionPath, { recursive: true });
app.setPath('sessionData', sessionPath);

let db;
let mainWindow;
let pendingState = null;
let saveTimer = null;
const dbPath = () => path.join(configuredDataPath, 'flow.crm.sqlite');

function openDb() {
  const instance = new Database(dbPath());
  instance.pragma('journal_mode = WAL');
  instance.pragma('synchronous = FULL');
  instance.exec('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, saved_at TEXT NOT NULL)');
  return instance;
}
function savedData() {
  const row = db.prepare('SELECT json FROM app_state WHERE id = 1').get();
  return row ? JSON.parse(row.json) : null;
}
function sendSaveStatus(status) {
  BrowserWindow.getAllWindows().forEach(win => { if (!win.isDestroyed()) win.webContents.send('state:status', status); });
}
function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!pendingState) return;
  const snapshot = pendingState;
  pendingState = null;
  try {
    const json = JSON.stringify(snapshot);
    db.prepare('INSERT INTO app_state (id, json, saved_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET json=excluded.json, saved_at=excluded.saved_at')
      .run(json, new Date().toISOString());
    sendSaveStatus('saved');
  } catch (error) {
    pendingState = snapshot;
    sendSaveStatus('error');
    console.error('Save failed:', error);
  }
}
function verifyDatabase(file) {
  const candidate = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const integrity = candidate.pragma('integrity_check', { simple: true });
    const row = candidate.prepare('SELECT json FROM app_state WHERE id = 1').get();
    if (integrity !== 'ok' || !row) throw new Error('The database has no valid flow.crm data.');
    const value = JSON.parse(row.json);
    if (value.schemaVersion !== 1 || !Array.isArray(value.projects)) throw new Error('This backup uses an unsupported data format.');
  } finally { candidate.close(); }
}
function createWindow() {
  let dark = nativeTheme.shouldUseDarkColors;
  try { const state = savedData(); if (state?.settings?.theme === 'dark') dark = true; if (state?.settings?.theme === 'light') dark = false; } catch (error) { console.error(error); }
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1000, minHeight: 650,
    backgroundColor: dark ? '#171717' : '#f7f6f3',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', flushSave);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  if (app.isPackaged) mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  else mainWindow.loadURL('http://127.0.0.1:5173');
}

app.whenReady().then(() => {
  db = openDb();
  ipcMain.handle('state:load', () => savedData());
  ipcMain.handle('state:save', (_event, value) => {
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.projects)) throw new Error('Invalid application data');
    pendingState = value;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 400);
  });
  ipcMain.handle('storage:info', () => ({
    mode, path: configuredDataPath, portableDefaultPath: portableRoot ? defaultDataPath : null,
    sizeBytes: fs.existsSync(dbPath()) ? fs.statSync(dbPath()).size : 0,
  }));
  ipcMain.handle('storage:open', () => shell.openPath(configuredDataPath));
  ipcMain.handle('storage:choose', async () => {
    if (mode !== 'portable') throw new Error('The installed version has a fixed storage location.');
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Choose a data folder', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return null;
    const selected = path.resolve(result.filePaths[0]);
    const probe = path.join(selected, `.flow-crm-write-test-${Date.now()}`);
    fs.writeFileSync(probe, 'ok'); fs.unlinkSync(probe);
    return { path: selected, hasData: fs.existsSync(path.join(selected, 'flow.crm.sqlite')) };
  });
  ipcMain.handle('storage:move', async (_event, destination, useExisting) => {
    if (mode !== 'portable') throw new Error('Only the portable version can change its data location.');
    if (typeof destination !== 'string' || !path.isAbsolute(destination)) throw new Error('Choose an absolute folder path.');
    const target = path.resolve(destination);
    if (target.toLowerCase() === configuredDataPath.toLowerCase()) return;
    fs.mkdirSync(target, { recursive: true });
    const targetDb = path.join(target, 'flow.crm.sqlite');
    flushSave();
    if (pendingState) throw new Error('The current changes could not be saved.');
    if (useExisting) {
      verifyDatabase(targetDb);
    } else {
      if (fs.existsSync(targetDb)) throw new Error('This folder already contains flow.crm data.');
      await db.backup(targetDb);
      verifyDatabase(targetDb);
    }
    fs.writeFileSync(portableConfigPath, JSON.stringify({ dataPath: target }, null, 2));
  });
  ipcMain.handle('backup:export', async () => {
    const result = await dialog.showSaveDialog(mainWindow, { title: 'Export flow.crm backup', defaultPath: `flow.crm-backup-${new Date().toISOString().slice(0, 10)}.sqlite`, filters: [{ name: 'flow.crm backup', extensions: ['sqlite'] }] });
    if (result.canceled || !result.filePath) return null;
    flushSave();
    if (pendingState) throw new Error('The current changes could not be saved.');
    if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    await db.backup(result.filePath);
    return result.filePath;
  });
  ipcMain.handle('backup:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Import flow.crm backup', properties: ['openFile'], filters: [{ name: 'flow.crm backup', extensions: ['sqlite'] }] });
    if (result.canceled || !result.filePaths[0]) return false;
    const source = result.filePaths[0];
    if (path.resolve(source).toLowerCase() === path.resolve(dbPath()).toLowerCase()) throw new Error('Select a different backup file.');
    verifyDatabase(source);
    flushSave();
    if (pendingState) throw new Error('The current changes could not be saved.');
    const safety = path.join(configuredDataPath, `before-import-${Date.now()}.sqlite`);
    await db.backup(safety);
    const staging = path.join(configuredDataPath, `import-${Date.now()}.sqlite`);
    const candidate = new Database(source, { readonly: true, fileMustExist: true });
    try { await candidate.backup(staging); } finally { candidate.close(); }
    try {
      verifyDatabase(staging);
      db.close();
      fs.copyFileSync(staging, dbPath());
      db = openDb();
    } catch (error) {
      if (!db?.open) { fs.copyFileSync(safety, dbPath()); db = openDb(); }
      throw error;
    } finally { if (fs.existsSync(staging)) fs.unlinkSync(staging); }
    return true;
  });
  ipcMain.handle('app:restart', async () => {
    if (portableFile) await shell.openPath(portableFile);
    else app.relaunch();
    app.quit();
  });
  ipcMain.handle('app:notify', (_event, title, body) => {
    if (Notification.isSupported()) new Notification({ title: String(title), body: String(body) }).show();
  });
  ipcMain.handle('app:version', () => app.getVersion());
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('before-quit', () => { flushSave(); if (db?.open) db.close(); });
app.on('window-all-closed', () => app.quit());
