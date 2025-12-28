const path = require('path');
const fs = require('fs');
const { app, screen, desktopCapturer } = require('electron');

async function captureScreen() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const scaleFactor = primaryDisplay.scaleFactor;
  
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
  
  const primarySource = sources.find(s => s.display_id === String(primaryDisplay.id)) || sources[0];
  
  const thumbnail = primarySource.thumbnail;
  const imgBuffer = thumbnail.toPNG();
  
  const timestamp = Date.now();
  const tempPath = path.join(app.getPath('temp'), `screenshot-${timestamp}.png`);
  fs.writeFileSync(tempPath, imgBuffer);
  
  return tempPath;
}

function getPrimaryDisplayInfo() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  return {
    width,
    height,
    scaleFactor: primaryDisplay.scaleFactor
  };
}

module.exports = {
  captureScreen,
  getPrimaryDisplayInfo
};
