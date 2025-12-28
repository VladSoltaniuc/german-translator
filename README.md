# German Translator

Desktop application built with Electron for translating German text from screen captures using OCR technology.

## Features

Use the global hotkey `Ctrl+Shift+T` (or `Cmd+Shift+T` on macOS) to capture any screen region, extract German text via OCR, and get instant translation.

## Installation

Install dependencies with `npm install` and ensure `deu.traineddata` is in the root directory for Tesseract OCR.

## Usage

Start the application with `npm start` or `npx electron .` then press `Ctrl+Shift+T` to activate screen capture mode, select text region, and view translation results.

## Technology Stack

Built with Electron, Tesseract.js for OCR recognition, and integration with translation API services.

## License

MIT License