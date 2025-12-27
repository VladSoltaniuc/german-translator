const { app, BrowserWindow, globalShortcut, screen, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const https = require('https');

let mainWindow;
let selectionWindow;

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
}

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

  selectionWindow.loadFile(path.join(__dirname, 'selection.html'));
  selectionWindow.setFullScreen(true);
}

// Translate text using MyMemory (Free, No sign-up)
function translateText(text) {
  return new Promise((resolve, reject) => {
    // MyMemory has a 500 character limit per request
    const MAX_LENGTH = 500;
    let textToTranslate = text.trim();
    let wasTruncated = false;
    
    if (textToTranslate.length > MAX_LENGTH) {
      textToTranslate = textToTranslate.substring(0, MAX_LENGTH);
      wasTruncated = true;
    }
    
    const encodedText = encodeURIComponent(textToTranslate);
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
            
            // Check for API error messages
            if (response.responseData && response.responseData.translatedText) {
              let translation = response.responseData.translatedText;
              
              // Check if it's an error message from the API
              if (translation.includes('QUERY LENGTH LIMIT') || translation.includes('MYMEMORY WARNING')) {
                reject(new Error('The selected text is too long. Please select a shorter text area.'));
                return;
              }
              
              // Add note if text was truncated
              if (wasTruncated) {
                translation += '\n\n[Note: Only the first 500 characters were translated due to service limits]';
              }
              resolve(translation);
            } else if (response.responseStatus === 403) {
              reject(new Error('Daily translation limit reached. Please try again later.'));
            } else {
              reject(new Error('Unable to translate. Please try again.'));
            }
          } catch (err) {
            reject(new Error('Unable to translate. Please check your internet connection.'));
          }
        } else if (res.statusCode === 429) {
          reject(new Error('Too many requests. Please wait a moment and try again.'));
        } else if (res.statusCode === 403) {
          reject(new Error('Daily translation limit reached. Please try again tomorrow.'));
        } else {
          reject(new Error('Translation service unavailable. Please try again later.'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error('Cannot connect to translation service. Please check your internet connection.'));
    });

    req.end();
  });
}

// Promise
app.whenReady().then(() => {
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
      // Minimize main window before taking screenshot
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
      }
      
      // Small delay to let the window minimize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get primary display dimensions
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      const scaleFactor = primaryDisplay.scaleFactor;
      
      // Use Electron's desktopCapturer for reliable screen capture
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: Math.floor(width * scaleFactor), 
          height: Math.floor(height * scaleFactor) 
        }
      });
      
      if (sources.length === 0) {
        throw new Error('No screen sources found');
      }
      
      // Get the primary screen (first source, or find by display id)
      const primarySource = sources.find(s => s.display_id === String(primaryDisplay.id)) || sources[0];
      
      // Convert thumbnail to PNG buffer
      const thumbnail = primarySource.thumbnail;
      const imgBuffer = thumbnail.toPNG();
      
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
      // Restore main window on error
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.restore();
      }
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

  // Handle selection complete
  ipcMain.on('selection-complete', (event, bounds) => {
    console.log('Selection bounds:', bounds);
    
    // Close selection window
    if (selectionWindow && !selectionWindow.isDestroyed()) {
      selectionWindow.close();
      selectionWindow = null;
    }
    
    // Restore and focus main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.focus();
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
    
    // Restore main window when cancelled
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.focus();
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
  ipcMain.on('translate-text', async (event, text) => {
    console.log('Translating text with MyMemory');
    
    try {
      const translatedText = await translateText(text);
      // Use event.reply instead of mainWindow.webContents.send
      event.reply('translation-result', translatedText);
    } catch (error) {
      console.error('Translation error:', error);
      event.reply('translation-error', error.message);
    }
  });

//#endregion