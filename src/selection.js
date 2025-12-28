const { ipcRenderer } = require('electron');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const selection = document.getElementById('selection');
const hint = document.getElementById('hint');

let screenshotPath;
let isSelecting = false;
let startX, startY;
let imgWidth, imgHeight;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

ipcRenderer.on('screenshot-ready', (event, imagePath) => {
  screenshotPath = imagePath;
  const img = new Image();
  img.onload = () => {
    imgWidth = img.width;
    imgHeight = img.height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  img.src = imagePath + '?t=' + Date.now();
});

canvas.addEventListener('mousedown', (e) => {
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  selection.style.display = 'block';
  selection.style.left = startX + 'px';
  selection.style.top = startY + 'px';
  selection.style.width = '0px';
  selection.style.height = '0px';
  hint.style.display = 'none';
});

canvas.addEventListener('mousemove', (e) => {
  if (!isSelecting) return;
  
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  
  selection.style.left = left + 'px';
  selection.style.top = top + 'px';
  selection.style.width = width + 'px';
  selection.style.height = height + 'px';
});

canvas.addEventListener('mouseup', (e) => {
  if (!isSelecting) return;
  isSelecting = false;
  
  const endX = e.clientX;
  const endY = e.clientY;
  
  const displayWidth = canvas.offsetWidth;
  const displayHeight = canvas.offsetHeight;
  
  const scaleX = imgWidth / displayWidth;
  const scaleY = imgHeight / displayHeight;

  const bounds = {
    x: Math.round(Math.min(startX, endX) * scaleX),
    y: Math.round(Math.min(startY, endY) * scaleY),
    width: Math.round(Math.abs(endX - startX) * scaleX),
    height: Math.round(Math.abs(endY - startY) * scaleY),
    screenshotPath: screenshotPath
  };
  
  if (bounds.width > 10 && bounds.height > 10) {
    ipcRenderer.send('selection-complete', bounds);
  } else {
    ipcRenderer.send('selection-cancelled');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ipcRenderer.send('selection-cancelled');
  }
});
