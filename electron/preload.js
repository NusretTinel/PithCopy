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

    // Listen for file uploads from mobile
    onFileReceived: (callback) => {
        ipcRenderer.on('upload:fileReceived', (_event, data) => callback(data));
    },
    removeFileReceivedListener: () => {
        ipcRenderer.removeAllListeners('upload:fileReceived');
    },
});
