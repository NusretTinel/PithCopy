const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { startUploadServer, stopUploadServer, getUploadURL, getGeneralUploadURL, getAccessCodeURL, getStatusCheckURL, getLocalIP } = require('./uploadServer');
const jobStore = require('./jobStore');

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
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

// ─── File Dialog ────────────────────────────────────────────
ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Dökümanlar', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'] },
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

// ─── Print File ─────────────────────────────────────────────
ipcMain.handle('print:file', async (_event, options) => {
    try {
        const { filePath, printerName, copies, color, orientation, paperSize, duplex } = options;
        const ext = path.extname(filePath).toLowerCase();

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
                await shell.openPath(filePath);
                return { success: true, message: `${path.basename(filePath)} sistem uygulamasıyla açıldı` };
            }
        }

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
                        if (success) resolve({ success: true, message: `${path.basename(filePath)} yazdırıldı` });
                        else resolve({ success: false, message: failureReason || 'Yazdırma hatası' });
                    }
                );
            });
        }

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
        return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(dirPath, e.name) }));
    } catch { return []; }
});

ipcMain.handle('fs:getFileInfo', async (_event, filePath) => {
    try {
        const stat = fs.statSync(filePath);
        return { name: path.basename(filePath), ext: path.extname(filePath).toLowerCase(), size: stat.size, modified: stat.mtime, path: filePath };
    } catch { return null; }
});

ipcMain.handle('fs:openInExplorer', async (_event, folderPath) => { shell.openPath(folderPath); });

// ─── Customer Folders ───────────────────────────────────────
const getCustomerBasePath = () => {
    const documentsPath = app.getPath('documents');
    const basePath = path.join(documentsPath, 'PıthCopy', 'Müşteriler');
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    return basePath;
};

ipcMain.handle('customers:getBasePath', () => getCustomerBasePath());

ipcMain.handle('customers:create', async (_event, customerName) => {
    const basePath = getCustomerBasePath();
    const customerPath = path.join(basePath, customerName);
    if (!fs.existsSync(customerPath)) fs.mkdirSync(customerPath, { recursive: true });
    return customerPath;
});

ipcMain.handle('customers:list', async () => {
    const basePath = getCustomerBasePath();
    try {
        const entries = fs.readdirSync(basePath, { withFileTypes: true });
        return entries.filter((e) => e.isDirectory()).map((e) => {
            const customerPath = path.join(basePath, e.name);
            const files = fs.readdirSync(customerPath);
            return {
                name: e.name, path: customerPath, fileCount: files.length,
                files: files.map((f) => ({
                    name: f, path: path.join(customerPath, f), ext: path.extname(f).toLowerCase(),
                    size: (() => { try { return fs.statSync(path.join(customerPath, f)).size; } catch { return 0; } })(),
                })),
            };
        });
    } catch { return []; }
});

ipcMain.handle('customers:getFiles', async (_event, customerName) => {
    const basePath = getCustomerBasePath();
    const customerPath = path.join(basePath, customerName);
    try {
        const files = fs.readdirSync(customerPath);
        return files.map((f) => ({
            name: f, path: path.join(customerPath, f), ext: path.extname(f).toLowerCase(),
            size: (() => { try { return fs.statSync(path.join(customerPath, f)).size; } catch { return 0; } })(),
        }));
    } catch { return []; }
});

ipcMain.handle('customers:deleteFile', async (_event, filePath) => {
    try { fs.unlinkSync(filePath); return { success: true }; }
    catch (err) { return { success: false, message: err.message }; }
});

ipcMain.handle('customers:copyFile', async (_event, { sourcePath, customerName }) => {
    const basePath = getCustomerBasePath();
    const customerPath = path.join(basePath, customerName);
    if (!fs.existsSync(customerPath)) fs.mkdirSync(customerPath, { recursive: true });
    const destPath = path.join(customerPath, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, destPath);
    return destPath;
});

// ─── QR / Upload Server ────────────────────────────────────
ipcMain.handle('upload:getURL', async (_event, customerName) => getUploadURL(customerName));
ipcMain.handle('upload:getGeneralURL', async () => getGeneralUploadURL());
ipcMain.handle('upload:getLocalIP', async () => getLocalIP());
ipcMain.handle('upload:getAccessCodeURL', async () => getAccessCodeURL());
ipcMain.handle('upload:getStatusCheckURL', async () => getStatusCheckURL());

// ─── Job Management ────────────────────────────────────────
ipcMain.handle('jobs:getAll', async () => jobStore.getAllJobs());
ipcMain.handle('jobs:getPending', async () => jobStore.getPendingJobs());
ipcMain.handle('jobs:getActive', async () => jobStore.getActiveJobs());
ipcMain.handle('jobs:getJob', async (_event, jobId) => jobStore.getJob(jobId));

ipcMain.handle('jobs:updateStatus', async (_event, { jobId, status, assignedPrinter }) => {
    const job = jobStore.updateJobStatus(jobId, status, assignedPrinter);
    if (job && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('job:updated', job);
    }
    return job;
});

ipcMain.handle('jobs:update', async (_event, { jobId, updates }) => {
    return jobStore.updateJob(jobId, updates);
});

ipcMain.handle('jobs:delete', async (_event, jobId) => {
    jobStore.deleteJob(jobId);
    return { success: true };
});

ipcMain.handle('jobs:approveAndPrint', async (_event, { jobId, printerName }) => {
    const job = jobStore.getJob(jobId);
    if (!job) return { success: false, message: 'Job not found' };

    // Update status to printing
    jobStore.updateJobStatus(jobId, 'printing', printerName);

    // Print all files
    const results = [];
    for (const file of job.files) {
        try {
            const settings = file.settings || job.settings || {};
            const ext = path.extname(file.path).toLowerCase();

            if (ext === '.pdf') {
                try {
                    const pdfPrinter = require('pdf-to-printer');
                    const printOptions = {};
                    if (printerName) printOptions.printer = printerName;
                    if (settings.copies > 1) printOptions.copies = settings.copies;
                    if (settings.orientation === 'landscape') printOptions.orientation = 'landscape';
                    if (settings.duplex) printOptions.duplex = true;
                    await pdfPrinter.print(file.path, printOptions);
                    results.push({ fileName: file.name, success: true });
                } catch (err) {
                    await shell.openPath(file.path);
                    results.push({ fileName: file.name, success: true, message: 'Sistem ile açıldı' });
                }
            } else {
                await shell.openPath(file.path);
                results.push({ fileName: file.name, success: true, message: 'Sistem ile açıldı' });
            }
        } catch (err) {
            results.push({ fileName: file.name, success: false, message: err.message });
        }
    }

    // Mark as ready
    jobStore.updateJobStatus(jobId, 'ready');
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('job:updated', jobStore.getJob(jobId));
    }

    return { success: true, results };
});

// ─── Price Config ───────────────────────────────────────────
ipcMain.handle('price:getConfig', async () => jobStore.getPriceConfig());
ipcMain.handle('price:updateConfig', async (_event, newConfig) => jobStore.updatePriceConfig(newConfig));
ipcMain.handle('price:estimate', async (_event, settings) => jobStore.calculatePriceEstimate(settings));

// ─── Statistics ─────────────────────────────────────────────
ipcMain.handle('stats:get', async () => jobStore.getStats());

// ─── Customer Profiles ──────────────────────────────────────
ipcMain.handle('profiles:get', async (_event, name) => jobStore.getProfile(name));
ipcMain.handle('profiles:save', async (_event, { name, profile }) => { jobStore.saveProfile(name, profile); return { success: true }; });
ipcMain.handle('profiles:getAll', async () => jobStore.getAllProfiles());
ipcMain.handle('profiles:delete', async (_event, name) => { jobStore.deleteProfile(name); return { success: true }; });

// ─── Access Code ────────────────────────────────────────────
ipcMain.handle('accessCode:generate', async (_event, customerName) => {
    const code = jobStore.generateAccessCode(customerName);
    return { code };
});

// ─── Cleanup ────────────────────────────────────────────────
ipcMain.handle('cleanup:run', async (_event, maxAgeDays) => {
    const basePath = getCustomerBasePath();
    const cleaned = jobStore.cleanupOldFiles(basePath, maxAgeDays || 7);
    jobStore.cleanupOldJobs();
    return { cleaned };
});

// ─── USB Detection ──────────────────────────────────────────
let lastDrives = new Set();

function checkUSBDrives() {
    try {
        const drives = [];
        // Check drives D: through Z:
        for (let i = 68; i <= 90; i++) {
            const d = String.fromCharCode(i) + ':\\';
            try {
                fs.accessSync(d, fs.constants.R_OK);
                drives.push(d);
            } catch { /* not accessible */ }
        }
        const currentDrives = new Set(drives);

        // Find newly added drives
        for (const drive of currentDrives) {
            if (!lastDrives.has(drive)) {
                // New drive detected
                if (mainWindow && !mainWindow.isDestroyed()) {
                    // List files on this drive
                    try {
                        const files = fs.readdirSync(drive).filter(f => {
                            const ext = path.extname(f).toLowerCase();
                            return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.ppt', '.pptx'].includes(ext);
                        }).map(f => ({
                            name: f,
                            path: path.join(drive, f),
                            ext: path.extname(f).toLowerCase(),
                            size: (() => { try { return fs.statSync(path.join(drive, f)).size; } catch { return 0; } })(),
                        }));

                        if (files.length > 0) {
                            mainWindow.webContents.send('usb:detected', { drive, files });
                        }
                    } catch { /* skip */ }
                }
            }
        }
        lastDrives = currentDrives;
    } catch { /* skip */ }
}

ipcMain.handle('usb:importFiles', async (_event, { files, customerName }) => {
    const basePath = getCustomerBasePath();
    const customerPath = path.join(basePath, customerName);
    if (!fs.existsSync(customerPath)) fs.mkdirSync(customerPath, { recursive: true });

    const imported = [];
    for (const file of files) {
        try {
            const destPath = path.join(customerPath, path.basename(file.path));
            fs.copyFileSync(file.path, destPath);
            imported.push({ name: path.basename(file.path), path: destPath, success: true });
        } catch (err) {
            imported.push({ name: path.basename(file.path), success: false, message: err.message });
        }
    }
    return imported;
});

// ─── Quick Job (no QR) ──────────────────────────────────────
ipcMain.handle('jobs:quickCreate', async (_event, { customerName, files, printerName }) => {
    // Create job and immediately print
    const jobFiles = files.map(f => ({
        name: f.name, path: f.path, ext: f.ext, size: f.size, pageCount: f.pageCount || 1,
        settings: { copies: 1, color: true, paperSize: 'A4', orientation: 'portrait', duplex: false },
    }));

    const job = jobStore.createJob({
        customerName: customerName || 'Hızlı İş',
        files: jobFiles,
        settings: { copies: 1, color: true, paperSize: 'A4', orientation: 'portrait', duplex: false },
        notes: 'Hızlı iş — doğrudan yazdırma',
    });

    // Immediately approve and print
    jobStore.updateJobStatus(job.jobId, 'printing', printerName);

    for (const file of jobFiles) {
        try {
            const ext = path.extname(file.path).toLowerCase();
            if (ext === '.pdf') {
                const pdfPrinter = require('pdf-to-printer');
                const opts = {};
                if (printerName) opts.printer = printerName;
                await pdfPrinter.print(file.path, opts);
            } else {
                await shell.openPath(file.path);
            }
        } catch { /* continue */ }
    }

    jobStore.updateJobStatus(job.jobId, 'ready');
    return job;
});

// ─── App Lifecycle ──────────────────────────────────────────
app.whenReady().then(() => {
    createWindow();

    // Init job store
    jobStore.init();

    // Start upload server with job store reference
    const basePath = getCustomerBasePath();
    startUploadServer(basePath, (uploadInfo) => {
        console.log(`File uploaded: ${uploadInfo.fileName} for customer ${uploadInfo.customerName}`);
        // Notify renderer about new file
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('upload:fileReceived', uploadInfo);
        }
    }, jobStore);

    // Job change listener — sound + desktop notification
    jobStore.onJobChange((action, job) => {
        if (action === 'created' && mainWindow && !mainWindow.isDestroyed()) {
            // Send to renderer for sound + visual notification
            mainWindow.webContents.send('job:new', job);

            // Windows desktop notification
            if (Notification.isSupported()) {
                const notif = new Notification({
                    title: '🖨️ Yeni Yazdırma İşi',
                    body: `${job.customerName} — ${job.files.length} dosya (Sıra #${job.queueNumber})`,
                    icon: path.join(__dirname, '..', 'resources', 'icon.ico'),
                    silent: false,
                });
                notif.show();
                notif.on('click', () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                });
            }
        }
    });

    // USB check every 3 seconds
    setInterval(checkUSBDrives, 3000);
});

app.on('window-all-closed', () => {
    stopUploadServer();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
