const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const screenshot = require('screenshot-desktop');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const https = require('https');

let mainWindow;
let selectionWindow;
let translationService = 'libretranslate';

// Path to store config
const configPath = path.join(app.getPath('userData'), 'config.json');

// Load translation service preference
function loadTranslationService() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      translationService = config.translationService || 'libretranslate';
      return translationService;
    }
  } catch (err) {
    console.error('Error loading translation service:', err);
  }
  return 'libretranslate';
}

// Save translation service preference
function saveTranslationService(service) {
  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    config.translationService = service;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    translationService = service;
    return true;
  } catch (err) {
    console.error('Error saving translation service:', err);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();
}

function createSelectionWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
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

  selectionWindow.loadFile(path.join(__dirname, 'selection.html'));
  selectionWindow.setFullScreen(true);
}

// Translate text using selected service
async function translateText(text, service) {
  if (service === 'libretranslate') {
    return translateWithLibreTranslate(text);
  } else if (service === 'mymemory') {
    return translateWithMyMemory(text);
  } else {
    throw new Error('Unknown translation service');
  }
}

// Translate with LibreTranslate (Free, Open Source)
function translateWithLibreTranslate(text) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      q: text,
      source: 'de',
      target: 'en',
      format: 'text'
    });
    
    const options = {
      hostname: 'libretranslate.com',
      path: '/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.translatedText) {
              resolve(response.translatedText);
            } else {
              reject(new Error('No translation returned'));
            }
          } catch (err) {
            reject(new Error('Failed to parse translation response'));
          }
        } else {
          reject(new Error(`Translation failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Translate with MyMemory (Free, No sign-up)
function translateWithMyMemory(text) {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const path = `/get?q=${encodedText}&langpair=de|en`;
    
    const options = {
      hostname: 'api.mymemory.translated.net',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.responseData && response.responseData.translatedText) {
              resolve(response.responseData.translatedText);
            } else {
              reject(new Error('No translation returned'));
            }
          } catch (err) {
            reject(new Error('Failed to parse translation response'));
          }
        } else {
          reject(new Error(`Translation failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });

    req.end();
  });
}

// Test translation service
async function testTranslationService(service) {
  try {
    const testText = 'Hallo';
    const result = await translateText(testText, service);
    if (result && result.length > 0) {
      return { success: true, message: `Service is working! Test: "${testText}" → "${result}"` };
    } else {
      return { success: false, message: 'Service returned empty result' };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Promise
app.whenReady().then(() => {
  // Load translation service on startup
  loadTranslationService();
  
  createWindow();

  // Register global shortcut Ctrl+Shift+T
  const ret = globalShortcut.register('CommandOrControl+Shift+T', async () => {
    console.log('Hotkey pressed!');
    
    // Don't create a new selection window if one already exists
    if (selectionWindow && !selectionWindow.isDestroyed()) {
      console.log('Selection window already open');
      selectionWindow.focus();
      return;
    }
    
    try {
      // Take screenshot first
      const imgBuffer = await screenshot({ format: 'png' });
      const tempPath = path.join(app.getPath('temp'), 'screenshot.png');
      fs.writeFileSync(tempPath, imgBuffer);
      
      // Show selection window
      createSelectionWindow();
      
      // Send screenshot to selection window
      selectionWindow.webContents.once('did-finish-load', () => {
        selectionWindow.webContents.send('screenshot-ready', tempPath);
      });
      
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  });

  if (!ret) {
    console.log('Hotkey registration failed');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

//#region  Event Listeners

  // Quit when all windows are closed
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  // Unregister all shortcuts on quit
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  // Handle translation service loading
  ipcMain.on('load-translation-service', (event) => {
    const service = loadTranslationService();
    event.reply('translation-service-loaded', service);
  });

  // Handle translation service setting
  ipcMain.on('set-translation-service', (event, service) => {
    saveTranslationService(service);
  });

  // Handle translation service testing
  ipcMain.on('test-translation-service', async (event, service) => {
    try {
      const result = await testTranslationService(service);
      if (result.success) {
        event.reply('service-test-result', true, result.message);
      } else {
        event.reply('service-test-result', false, result.message);
      }
    } catch (err) {
      event.reply('service-test-result', false, err.message);
    }
  });

  // Handle selection complete
  ipcMain.on('selection-complete', (event, bounds) => {
    console.log('Selection bounds:', bounds);
    
    // Close selection window
    if (selectionWindow && !selectionWindow.isDestroyed()) {
      selectionWindow.close();
      selectionWindow = null;
    }
    
    // Send bounds to main window for processing
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-selection', bounds);
    }
  });

  // Handle selection cancelled
  ipcMain.on('selection-cancelled', () => {
    console.log('Selection cancelled');
    if (selectionWindow && !selectionWindow.isDestroyed()) {
      selectionWindow.close();
      selectionWindow = null;
    }
  });

  // Handle OCR processing
  ipcMain.on('process-ocr', async (event, imageDataUrl) => {
    console.log('Starting OCR processing...');
    
    try {
      // Convert data URL to buffer
      const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Save temporarily for Tesseract
      const tempImagePath = path.join(app.getPath('temp'), 'ocr-image.png');
      fs.writeFileSync(tempImagePath, imageBuffer);
      
      // Check if local traineddata exists
      const localLangPath = path.join(__dirname, '..', 'deu.traineddata');
      const langPath = fs.existsSync(localLangPath) ? path.dirname(localLangPath) : undefined;
      
      console.log('Using language path:', langPath || 'default (downloading)');
      
      // Perform OCR with German language
      const workerOptions = langPath ? { langPath } : {};
      const result = await Tesseract.recognize(
        tempImagePath,
        'deu', // German language
        {
          ...workerOptions,
          logger: (m) => {
            console.log('OCR Progress:', m);
            // Send progress updates to renderer
            if (m.status && m.progress !== undefined) {
              // Check if window still exists before sending
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ocr-progress', {
                  status: m.status,
                  progress: m.progress
                });
              }
            }
          }
        }
      );
      
      console.log('OCR Result:', result.data.text);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempImagePath);
      } catch (e) {
        console.log('Could not delete temp file:', e);
      }
      
      // Use event.reply instead of mainWindow.webContents.send
      event.reply('ocr-result', result.data.text);
      
    } catch (error) {
      console.error('OCR Error:', error);
      event.reply('ocr-error', error.message);
    }
  });

  // Handle translation
  ipcMain.on('translate-text', async (event, data) => {
    const { text, service } = data;
    
    console.log('Translating text with service:', service);
    
    try {
      const translatedText = await translateText(text, service);
      // Use event.reply instead of mainWindow.webContents.send
      event.reply('translation-result', translatedText);
    } catch (error) {
      console.error('Translation error:', error);
      event.reply('translation-error', error.message);
    }
  });

//#endregion