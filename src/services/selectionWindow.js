const path = require('path');
const { BrowserWindow, screen, ipcMain } = require('electron');
const { captureScreen } = require('./screenCapture');
const mainWindow = require('./mainWindow');

let selectionWindow = null;

function createSelectionWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  
  selectionWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  selectionWindow.loadFile(path.join(__dirname, '..', 'selection.html'));
  selectionWindow.setFullScreen(true);
  
  return selectionWindow;
}

function getSelectionWindow() {
  return selectionWindow;
}

function closeSelectionWindow() {
  if (selectionWindow && !selectionWindow.isDestroyed()) {
    selectionWindow.close();
    selectionWindow = null;
  }
}

function isSelectionWindowOpen() {
  return selectionWindow && !selectionWindow.isDestroyed();
}

async function spawnSelectionOverlay() {
  if (isSelectionWindowOpen()) {
    selectionWindow.focus();
    return;
  }
  
  mainWindow.minimizeMainWindow();
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const screenshotPath = await captureScreen();
  
  const window = createSelectionWindow();
  
  window.webContents.once('did-finish-load', () => {
    window.webContents.send('screenshot-ready', screenshotPath);
  });
}

function registerSelectionWindowHandlers() {
  ipcMain.on('selection-complete', (event, bounds) => {
    closeSelectionWindow();
    const main = mainWindow.getMainWindow();
    if (main && !main.isDestroyed()) {
      main.restore();
      main.focus();
      main.webContents.send('process-selection', bounds);
    }
  });

  ipcMain.on('selection-cancelled', () => {
    closeSelectionWindow();
    mainWindow.restoreMainWindow();
  });
}

module.exports = {
  createSelectionWindow,
  getSelectionWindow,
  closeSelectionWindow,
  isSelectionWindowOpen,
  spawnSelectionOverlay,
  registerSelectionWindowHandlers
};
