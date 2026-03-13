const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),

    // File operations
    openFileDialog: () => ipcRenderer.invoke('dialog:openFiles'),
    getFileInfo: (filePath) => ipcRenderer.invoke('fs:getFileInfo', filePath),
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
    openInExplorer: (folderPath) => ipcRenderer.invoke('fs:openInExplorer', folderPath),

    // Printers
    getPrinters: () => ipcRenderer.invoke('printers:getList'),

    // Print
    printFile: (options) => ipcRenderer.invoke('print:file', options),
    printBatch: (options) => ipcRenderer.invoke('print:batch', options),

    // Customers
    getCustomerBasePath: () => ipcRenderer.invoke('customers:getBasePath'),
    createCustomer: (name) => ipcRenderer.invoke('customers:create', name),
    listCustomers: () => ipcRenderer.invoke('customers:list'),
    getCustomerFiles: (name) => ipcRenderer.invoke('customers:getFiles', name),
    deleteCustomerFile: (filePath) => ipcRenderer.invoke('customers:deleteFile', filePath),
    copyFileToCustomer: (sourcePath, customerName) =>
        ipcRenderer.invoke('customers:copyFile', { sourcePath, customerName }),

    // QR / Upload
    getUploadURL: (customerName) => ipcRenderer.invoke('upload:getURL', customerName),
    getGeneralUploadURL: () => ipcRenderer.invoke('upload:getGeneralURL'),
    getLocalIP: () => ipcRenderer.invoke('upload:getLocalIP'),
    getAccessCodeURL: () => ipcRenderer.invoke('upload:getAccessCodeURL'),
    getStatusCheckURL: () => ipcRenderer.invoke('upload:getStatusCheckURL'),

    // Listen for file uploads
    onFileReceived: (callback) => {
        ipcRenderer.on('upload:fileReceived', (_event, data) => callback(data));
    },
    removeFileReceivedListener: () => {
        ipcRenderer.removeAllListeners('upload:fileReceived');
    },

    // Jobs
    getAllJobs: () => ipcRenderer.invoke('jobs:getAll'),
    getPendingJobs: () => ipcRenderer.invoke('jobs:getPending'),
    getActiveJobs: () => ipcRenderer.invoke('jobs:getActive'),
    getJob: (jobId) => ipcRenderer.invoke('jobs:getJob', jobId),
    updateJobStatus: (jobId, status, assignedPrinter) =>
        ipcRenderer.invoke('jobs:updateStatus', { jobId, status, assignedPrinter }),
    updateJob: (jobId, updates) => ipcRenderer.invoke('jobs:update', { jobId, updates }),
    deleteJob: (jobId) => ipcRenderer.invoke('jobs:delete', jobId),
    approveAndPrint: (jobId, printerName) =>
        ipcRenderer.invoke('jobs:approveAndPrint', { jobId, printerName }),
    quickCreateJob: (data) => ipcRenderer.invoke('jobs:quickCreate', data),

    // Job events
    onNewJob: (callback) => {
        ipcRenderer.on('job:new', (_event, data) => callback(data));
    },
    removeNewJobListener: () => {
        ipcRenderer.removeAllListeners('job:new');
    },
    onJobUpdated: (callback) => {
        ipcRenderer.on('job:updated', (_event, data) => callback(data));
    },
    removeJobUpdatedListener: () => {
        ipcRenderer.removeAllListeners('job:updated');
    },

    // Price
    getPriceConfig: () => ipcRenderer.invoke('price:getConfig'),
    updatePriceConfig: (config) => ipcRenderer.invoke('price:updateConfig', config),
    estimatePrice: (settings) => ipcRenderer.invoke('price:estimate', settings),

    // Stats
    getStats: () => ipcRenderer.invoke('stats:get'),

    // Profiles
    getProfile: (name) => ipcRenderer.invoke('profiles:get', name),
    saveProfile: (name, profile) => ipcRenderer.invoke('profiles:save', { name, profile }),
    getAllProfiles: () => ipcRenderer.invoke('profiles:getAll'),
    deleteProfile: (name) => ipcRenderer.invoke('profiles:delete', name),

    // Access Code
    generateAccessCode: (customerName) => ipcRenderer.invoke('accessCode:generate', customerName),

    // Cleanup
    runCleanup: (maxAgeDays) => ipcRenderer.invoke('cleanup:run', maxAgeDays),

    // USB
    onUSBDetected: (callback) => {
        ipcRenderer.on('usb:detected', (_event, data) => callback(data));
    },
    removeUSBListener: () => {
        ipcRenderer.removeAllListeners('usb:detected');
    },
    importUSBFiles: (files, customerName) =>
        ipcRenderer.invoke('usb:importFiles', { files, customerName }),
});
