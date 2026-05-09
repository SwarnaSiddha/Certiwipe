// // const { app, BrowserWindow } = require("electron");
// // const path = require("path");

// // let mainWindow;

// // function createWindow() {
// //   mainWindow = new BrowserWindow({
// //     width: 1400,
// //     height: 900,
// //     webPreferences: {
// //       nodeIntegration: false,
// //     },
// //   });
// //   mainWindow.setMenuBarVisibility(false);
// //   mainWindow.loadFile(
// //     path.join(__dirname, "frontend", "dist", "index.html")
// //   );
// // }

// // app.whenReady().then(() => {
// //   createWindow();
// // });

// // app.on("window-all-closed", () => {
// //   if (process.platform !== "darwin") {
// //     app.quit();
// //   }
// // });

// const { app, BrowserWindow } = require("electron");
// const path = require("path");
// const { spawn } = require("child_process");

// let backend;

// function createWindow() {
//     const win = new BrowserWindow({
//         width: 1400,
//         height: 900,
//     });

//     win.setMenuBarVisibility(false);

//     win.loadFile(
//         path.join(__dirname, "frontend", "dist", "index.html")
//     );
// }

// app.whenReady().then(() => {

//     // const pythonPath = path.join(
//     //     __dirname,
//     //     "venv",
//     //     "Scripts",
//     //     "python.exe"
//     // );

//     // backend = spawn(pythonPath, ["backend/main.py"], {
//     //     shell: true
//     // });
//     backend = spawn("python", ["backend/main.py"], {
//     shell: true
// });

//     backend.stdout.on("data", (data) => {
//         console.log(`Backend: ${data}`);
//     });

//     backend.stderr.on("data", (data) => {
//         console.error(`Backend Error: ${data}`);
//     });

//     createWindow();
// });

// app.on("window-all-closed", () => {
//     if (backend) backend.kill();

//     if (process.platform !== "darwin") {
//         app.quit();
//     }
// });
const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let backend;

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
    });

    win.setMenuBarVisibility(false);

    win.loadFile(
        path.join(__dirname, "frontend", "dist", "index.html")
    );
}

app.whenReady().then(() => {

    const backendPath = path.join(
        process.resourcesPath,
        "backend",
        "main.py"
    );

    const { spawn } = require("child_process");

const backend = spawn(
  path.join(__dirname,process.resourcesPath, "main.exe"),
  [],
  {
    shell: true
  }
);

    backend.stdout.on("data", (data) => {
        console.log(`Backend: ${data}`);
    });

    backend.stderr.on("data", (data) => {
        console.error(`Backend Error: ${data}`);
    });

    createWindow();
});

app.on("window-all-closed", () => {
    if (backend) backend.kill();

    if (process.platform !== "darwin") {
        app.quit();
    }
});