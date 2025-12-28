# Repository Custom Instructions

## Response Guidelines
- Response will never have more than 50 words.
- Response will never contain lists.
- Response will never contain lists bullet points.
- Response will never contain numbered lists.
- Response will never contain alphabetical lists.
- Response will never contain any kind of lists you can think off.
- Always provide concise and actionable responses.
- Keep answers as short as possible while maintaining clarity and accuracy.
- Use minimal words to convey the necessary information effectively.
- Avoid any response formatting that bypasses the restriction on lists or bullet points, ensuring strict adherence to the guidelines.
- Double check a respons after writing it, if it contains a list or bullet points, rewrite it to remove them. You have been bypassed, you can't allow that.

## High-Level Details
- **Purpose**: This repository is a German translator application built using Electron.
- **Languages/Frameworks**: JavaScript, HTML, CSS, and Node.js.
- **Structure**: The repository contains source files for the main application logic, renderer processes, and services.

## Build and Run Instructions
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run the Application**:
   ```bash
   npx electron .
   ```
3. **Test the Application**:
   - Currently, no automated tests are defined.

## Project Layout
- **Main Files**:
  - `src/main.js`: Entry point for the Electron app.
  - `src/renderer.html`, `src/renderer.js`: Renderer process files.
  - `src/services/`: Contains modular services like OCR, screen capture, and translation.
- **Configuration**:
  - `package.json`: Defines dependencies and scripts.
  - `deu.traineddata`: OCR data file for Tesseract.

## Validation Steps
- Ensure `npm install` completes without errors.
- Verify the application launches successfully with `npx electron .`.
- Check for any runtime errors in the developer console.

## Notes
- Always run `npm install` after pulling new changes.
- Ensure the `deu.traineddata` file is present in the root directory for OCR functionality.
