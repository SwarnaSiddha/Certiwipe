// const { app, BrowserWindow } = require("electron");
// const path = require("path");

// let mainWindow;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1400,
//     height: 900,
//     webPreferences: {
//       nodeIntegration: false,
//     },
//   });

//   mainWindow.loadFile(
//     path.join(__dirname, "frontend", "dist", "index.html")
//   );
// }

// app.whenReady().then(() => {
//   createWindow();
// });

// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
  });

  win.loadFile(path.join(__dirname, "frontend/dist/index.html"));

  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);