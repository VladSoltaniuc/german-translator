const { ipcRenderer } = require('electron');

const img = document.getElementById('screenshot');
const imageContainer = document.getElementById('imageContainer');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const warningMessage = document.getElementById('warningMessage');
const status = document.getElementById('status');
const ocrText = document.getElementById('ocrText');
const translatedText = document.getElementById('translatedText');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');

ipcRenderer.on('process-selection', (event, bounds) => {
  ocrText.textContent = 'Processing...';
  ocrText.className = 'loading';
  translatedText.textContent = 'Waiting for OCR...';
  translatedText.className = 'loading';
  warningMessage.classList.remove('show');
  progress.style.display = 'block';
  progressBar.style.width = '0%';
  progressBar.textContent = '0%';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const fullImg = new Image();
  fullImg.onload = () => {
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    
    ctx.drawImage(
      fullImg,
      bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, bounds.width, bounds.height
    );
    
    const croppedDataUrl = canvas.toDataURL();
    img.src = croppedDataUrl;
    imageContainer.style.display = 'flex';
    imagePlaceholder.style.display = 'none';
    
    status.innerHTML = 'Processing OCR...';
    
    ipcRenderer.send('process-ocr', croppedDataUrl);
  };
  fullImg.src = bounds.screenshotPath;
});

ipcRenderer.on('ocr-progress', (event, progressData) => {
  const percent = Math.round(progressData.progress * 100);
  progressBar.style.width = percent + '%';
  progressBar.textContent = percent + '%';
  status.innerHTML = `OCR Progress: ${progressData.status}...`;
});

ipcRenderer.on('ocr-result', (event, text) => {
  progress.style.display = 'none';
  
  if (text && text.trim()) {
    ocrText.textContent = text;
    ocrText.className = '';
    status.innerHTML = 'OCR Complete! Translating...';
    
    translatedText.textContent = 'Translating...';
    translatedText.className = 'loading';
    ipcRenderer.send('translate-text', text);
  } else {
    ocrText.textContent = 'No text detected in the selected region.';
    ocrText.className = 'error';
    status.innerHTML = 'No text found. Press <strong>Ctrl+Shift+T</strong> to try again.';
  }
});

ipcRenderer.on('translation-result', (event, data) => {
  const { text, wasTruncated } = data;
  translatedText.textContent = text;
  translatedText.className = '';
  
  if (wasTruncated) {
    warningMessage.classList.add('show');
  } else {
    warningMessage.classList.remove('show');
  }
  
  status.innerHTML = `Translation complete! Press <strong>Ctrl+Shift+T</strong> for another.`;
});

ipcRenderer.on('translation-error', (event, error) => {
  translatedText.textContent = error;
  translatedText.className = 'error';
  status.innerHTML = `Translation failed. Press <strong>Ctrl+Shift+T</strong> to try again.`;
});

ipcRenderer.on('ocr-error', (event, error) => {
  progress.style.display = 'none';
  ocrText.textContent = `Error: ${error}`;
  ocrText.className = 'error';
  status.innerHTML = `OCR failed. Press <strong>Ctrl+Shift+T</strong> to try again.`;
});
