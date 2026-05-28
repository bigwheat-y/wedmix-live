const { app, BrowserWindow, shell, protocol, net } = require('electron');
const { pathToFileURL } = require('url');

// Keep a global reference to prevent garbage collection
let mainWindow;

// Register a custom protocol 'localfile://' BEFORE app is ready (required by
// Electron's protocol.handle API). This safely serves local audio files without
// disabling webSecurity globally.
//
// Windows path note: pathToFileURL correctly converts both forward-slash and
// backslash paths (e.g. C:\Users\...) to file:/// URLs, so no manual
// normalization is needed.
function registerLocalFileProtocol() {
  protocol.handle('localfile', (request) => {
    // Decode percent-encoded characters, then strip the protocol prefix
    const rawPath = decodeURIComponent(request.url.slice('localfile://'.length));

    // Reject path traversal attempts (e.g. localfile://../../../etc/passwd)
    if (rawPath.includes('..')) {
      return new Response('Forbidden', { status: 403 });
    }

    let fileUrl;
    try {
      fileUrl = pathToFileURL(rawPath).toString();
    } catch (e) {
      return new Response('Bad Request', { status: 400 });
    }

    return net.fetch(fileUrl);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: 'WedMix Live - 婚礼现场专业调音控制台',
    // icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#07070b',
    show: false,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the system browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // On Windows, closing the window does NOT automatically release the
  // AudioContext or IndexedDB connections held by the renderer. Send a
  // message so the renderer can clean up before the process exits.
  mainWindow.on('close', (e) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-before-close');
    }
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

// protocol.handle must be called after app is ready
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
