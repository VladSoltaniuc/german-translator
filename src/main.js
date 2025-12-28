const { app, globalShortcut, BrowserWindow } = require('electron');
const mainWindow = require('./services/mainWindow');
const selectionWindow = require('./services/selectionWindow');

app.whenReady().then(() => {
  mainWindow.createMainWindow();
  mainWindow.registerMainWindowHandlers();
  selectionWindow.registerSelectionWindowHandlers();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow.createMainWindow();
    }
  });
});

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+T', selectionWindow.spawnSelectionOverlay);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});