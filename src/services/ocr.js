const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Tesseract = require('tesseract.js');

async function processOCR(imageDataUrl, onProgress) {
  const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  const tempImagePath = path.join(app.getPath('temp'), 'ocr-image.png');
  fs.writeFileSync(tempImagePath, imageBuffer);
  
  const localLangPath = path.join(__dirname, '..', '..', 'deu.traineddata');
  const langPath = fs.existsSync(localLangPath) ? path.dirname(localLangPath) : undefined;
  
  const workerOptions = langPath ? { langPath } : {};
  const result = await Tesseract.recognize(
    tempImagePath,
    'deu',
    {
      ...workerOptions,
      logger: (m) => {
        if (m.status && m.progress !== undefined && onProgress) {
          onProgress({
            status: m.status,
            progress: m.progress
          });
        }
      }
    }
  );
  
  fs.unlinkSync(tempImagePath);
  return result.data.text;
}

module.exports = {
  processOCR
};
