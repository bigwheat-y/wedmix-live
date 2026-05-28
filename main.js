const { app, BrowserWindow, shell, protocol, net } = require('electron');
const { pathToFileURL } = require('url');

// Keep a global reference to prevent garbage collection
let mainWindow;

// Register a custom protocol 'localfile://' that safely serves files from
// the user's filesystem without disabling webSecurity globally.
// This replaces the previous webSecurity: false workaround.
function registerLocalFileProtocol() {
  protocol.handle('localfile', (request) => {
    // Strip the protocol prefix to get the absolute file path
    const filePath = decodeURIComponent(request.url.slice('localfile://'.length));
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: 'WedMix Live - 婚礼现场专业调音控制台',
    // Use a default icon; replace with your own icon files if desired
    // icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      // Web Audio API and IndexedDB work fully with webSecurity enabled.
      // Local audio files are served via the custom 'localfile://' protocol
      // registered below, so webSecurity no longer needs to be disabled.
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#07070b',
    show: false, // Don't show until ready to avoid white flash
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window once content is ready (avoids white flash on startup)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the system browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS: re-create window when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  registerLocalFileProtocol();
  createWindow();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
