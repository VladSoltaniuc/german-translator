const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');
const { processOCR } = require('./ocr');
const { translateText } = require('./translator');

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer.html'));
  mainWindow.removeMenu();
  
  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function minimizeMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
}

function restoreMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.restore();
    mainWindow.focus();
  }
}

function registerMainWindowHandlers() {
  ipcMain.on('process-ocr', async (event, imageDataUrl) => {
    try {
      const text = await processOCR(imageDataUrl, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ocr-progress', progress);
        }
      });
      
      event.reply('ocr-result', text);
    } catch (error) {
      event.reply('ocr-error', error.message);
    }
  });

  ipcMain.on('translate-text', async (event, text) => {
    try {
      const result = await translateText(text);
      event.reply('translation-result', result);
    } catch (error) {
      event.reply('translation-error', error.message);
    }
  });
}

module.exports = {
  createMainWindow,
  getMainWindow,
  minimizeMainWindow,
  restoreMainWindow,
  registerMainWindowHandlers
};
