const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { startUploadServer, stopUploadServer, getUploadURL, getGeneralUploadURL, getLocalIP } = require('./uploadServer');

const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0F0F23',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, '..', 'resources', 'icon.ico'),
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
}

// ─── Window Controls ────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});
ipcMain.on('window:close', () => mainWindow?.close());

// ─── File Dialog ────────────────────────────────────────────
ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Dökümanlar', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'] },
            { name: 'Resimler', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'tiff'] },
            { name: 'Tüm Dosyalar', extensions: ['*'] },
        ],
    });
    if (result.canceled) return [];
    return result.filePaths.map((filePath) => ({
        path: filePath,
        name: path.basename(filePath),
        ext: path.extname(filePath).toLowerCase(),
        size: fs.statSync(filePath).size,
    }));
});

// ─── Printers ───────────────────────────────────────────────
ipcMain.handle('printers:getList', async () => {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map((p) => ({
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: p.isDefault,
        status: p.status,
    }));
});

// ─── Print File (Real Implementation) ───────────────────────
ipcMain.handle('print:file', async (_event, options) => {
    try {
        const { filePath, printerName, copies, color, orientation, paperSize, duplex } = options;
        const ext = path.extname(filePath).toLowerCase();

        // PDF files → use pdf-to-printer
        if (ext === '.pdf') {
            try {
                const pdfPrinter = require('pdf-to-printer');
                const printOptions = {};
                if (printerName) printOptions.printer = printerName;
                if (copies && copies > 1) printOptions.copies = copies;
                if (orientation === 'landscape') printOptions.orientation = 'landscape';
                if (paperSize) printOptions.paperSize = paperSize;
                if (duplex) printOptions.duplex = true;

                await pdfPrinter.print(filePath, printOptions);
                return { success: true, message: `${path.basename(filePath)} yazdırılıyor...` };
            } catch (pdfErr) {
                console.error('pdf-to-printer error:', pdfErr);
                // Fallback: open with system default
                await shell.openPath(filePath);
                return { success: true, message: `${path.basename(filePath)} sistem uygulamasıyla açıldı` };
            }
        }

        // Images → print via Electron's built-in
        if (['.png', '.jpg', '.jpeg', '.bmp', '.tiff'].includes(ext)) {
            const printWin = new BrowserWindow({ show: false });
            await printWin.loadFile(filePath);

            return new Promise((resolve) => {
                printWin.webContents.print(
                    {
                        silent: true,
                        deviceName: printerName || undefined,
                        copies: copies || 1,
                        landscape: orientation === 'landscape',
                        color: color !== false,
                    },
                    (success, failureReason) => {
                        printWin.close();
                        if (success) {
                            resolve({ success: true, message: `${path.basename(filePath)} yazdırıldı` });
                        } else {
                            resolve({ success: false, message: failureReason || 'Yazdırma hatası' });
                        }
                    }
                );
            });
        }

        // Word/Excel and others → open with system default to print
        await shell.openPath(filePath);
        return { success: true, message: `${path.basename(filePath)} sistem uygulamasıyla açıldı` };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// ─── Batch Print ────────────────────────────────────────────
ipcMain.handle('print:batch', async (_event, { files, printerName, defaultSettings }) => {
    const results = [];

    for (const file of files) {
        try {
            const settings = {
                filePath: file.path || file.nativePath,
                printerName,
                copies: file.copies || defaultSettings?.copies || 1,
                color: file.color !== undefined ? file.color : (defaultSettings?.color !== false),
                orientation: file.orientation || defaultSettings?.orientation || 'portrait',
                paperSize: file.paperSize || defaultSettings?.paperSize || 'A4',
                duplex: file.duplex !== undefined ? file.duplex : (defaultSettings?.duplex || false),
            };

            const result = await ipcMain.emit('print:file', null, settings);
            // Direct call instead of emit
            const ext = path.extname(settings.filePath).toLowerCase();

            if (ext === '.pdf') {
                try {
                    const pdfPrinter = require('pdf-to-printer');
                    const printOptions = {};
                    if (settings.printerName) printOptions.printer = settings.printerName;
                    if (settings.copies > 1) printOptions.copies = settings.copies;
                    if (settings.orientation === 'landscape') printOptions.orientation = 'landscape';

                    await pdfPrinter.print(settings.filePath, printOptions);
                    results.push({ fileName: file.name, success: true, message: 'Yazdırıldı' });
                } catch (err) {
                    await shell.openPath(settings.filePath);
                    results.push({ fileName: file.name, success: true, message: 'Sistem ile açıldı' });
                }
            } else {
                await shell.openPath(settings.filePath);
                results.push({ fileName: file.name, success: true, message: 'Sistem ile açıldı' });
            }
        } catch (err) {
            results.push({ fileName: file.name, success: false, message: err.message });
        }
    }

    return results;
});

// ─── File System Operations ─────────────────────────────────
ipcMain.handle('fs:readDir', async (_event, dirPath) => {
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        return entries.map((e) => ({
            name: e.name,
            isDirectory: e.isDirectory(),
            path: path.join(dirPath, e.name),
        }));
    } catch {
        return [];
    }
});

ipcMain.handle('fs:getFileInfo', async (_event, filePath) => {
    try {
        const stat = fs.statSync(filePath);
        return {
            name: path.basename(filePath),
            ext: path.extname(filePath).toLowerCase(),
            size: stat.size,
            modified: stat.mtime,
            path: filePath,
        };
    } catch {
        return null;
    }
});

ipcMain.handle('fs:openInExplorer', async (_event, folderPath) => {
    shell.openPath(folderPath);
});

// ─── Customer Folders ───────────────────────────────────────
const getCustomerBasePath = () => {
    const documentsPath = app.getPath('documents');
    const basePath = path.join(documentsPath, 'PıthCopy', 'Müşteriler');
    if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
    }
    return basePath;
};

ipcMain.handle('customers:getBasePath', () => getCustomerBasePath());

ipcMain.handle('customers:create', async (_event, customerName) => {
    const basePath = getCustomerBasePath();
    const customerPath = path.join(basePath, customerName);
    if (!fs.existsSync(customerPath)) {
        fs.mkdirSync(customerPath, { recursive: true });
    }
    return customerPath;
});

ipcMain.handle('customers:list', async () => {
    const basePath = getCustomerBasePath();
    try {
        const entries = fs.readdirSync(basePath, { withFileTypes: true });
        return entries
            .filter((e) => e.isDirectory())
            .map((e) => {
                const customerPath = path.join(basePath, e.name);
                const files = fs.readdirSync(customerPath);
                return {
                    name: e.name,
                    path: customerPath,
                    fileCount: files.length,
                    files: files.map((f) => ({
                        name: f,
                        path: path.join(customerPath, f),
                        ext: path.extname(f).toLowerCase(),
                        size: (() => {
                            try { return fs.statSync(path.join(customerPath, f)).size; } catch { return 0; }
                        })(),
                    })),
                };
            });
    } catch {
        return [];
    }
});

ipcMain.handle('customers:getFiles', async (_event, customerName) => {
    const basePath = getCustomerBasePath();
    const customerPath = path.join(basePath, customerName);
    try {
        const files = fs.readdirSync(customerPath);
        return files.map((f) => ({
            name: f,
            path: path.join(customerPath, f),
            ext: path.extname(f).toLowerCase(),
            size: (() => {
                try { return fs.statSync(path.join(customerPath, f)).size; } catch { return 0; }
            })(),
        }));
    } catch {
        return [];
    }
});

ipcMain.handle('customers:deleteFile', async (_event, filePath) => {
    try {
        fs.unlinkSync(filePath);
        return { success: true };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle('customers:copyFile', async (_event, { sourcePath, customerName }) => {
    const basePath = getCustomerBasePath();
    const customerPath = path.join(basePath, customerName);
    if (!fs.existsSync(customerPath)) {
        fs.mkdirSync(customerPath, { recursive: true });
    }
    const destPath = path.join(customerPath, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, destPath);
    return destPath;
});

// ─── QR / Upload Server ────────────────────────────────────
ipcMain.handle('upload:getURL', async (_event, customerName) => {
    return getUploadURL(customerName);
});

ipcMain.handle('upload:getGeneralURL', async () => {
    return getGeneralUploadURL();
});

ipcMain.handle('upload:getLocalIP', async () => {
    return getLocalIP();
});

// ─── App Lifecycle ──────────────────────────────────────────
app.whenReady().then(() => {
    createWindow();

    // Start upload server
    const basePath = getCustomerBasePath();
    startUploadServer(basePath, (uploadInfo) => {
        console.log(`File uploaded: ${uploadInfo.fileName} for customer ${uploadInfo.customerName}`);
        // Notify renderer about new file
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('upload:fileReceived', uploadInfo);
        }
    });
});

app.on('window-all-closed', () => {
    stopUploadServer();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
