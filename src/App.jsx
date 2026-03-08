import React, { useState, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PrintView from './pages/PrintView';
import CustomersView from './pages/CustomersView';

function App() {
    const [currentPage, setCurrentPage] = useState('print');
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [customers, setCustomers] = useState([]);
    const [activeCustomer, setActiveCustomer] = useState(null);
    const [printQueue, setPrintQueue] = useState([]);

    // addFiles with automatic batch grouping — files dropped together get same batchId
    const addFiles = useCallback((newFiles, batchLabel) => {
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const batchName = batchLabel || `Grup ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

        const filesWithId = newFiles.map((f, i) => ({
            ...f,
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
            batchId,
            batchName,
            copies: 1,
            color: true,
            orientation: 'portrait',
            paperSize: 'A4',
            duplex: false,
            status: 'ready',
        }));
        setFiles((prev) => [...prev, ...filesWithId]);
    }, []);

    const removeFile = useCallback((fileId) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            next.delete(fileId);
            return next;
        });
    }, []);

    const removeBatch = useCallback((batchId) => {
        setFiles((prev) => {
            const remaining = prev.filter((f) => f.batchId !== batchId);
            return remaining;
        });
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            // Remove all files from this batch
            for (const id of prev) {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const toggleFileSelection = useCallback((fileId) => {
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    }, []);

    const toggleBatchSelection = useCallback((batchId) => {
        setFiles((prev) => {
            const batchFileIds = prev.filter((f) => f.batchId === batchId).map((f) => f.id);
            setSelectedFiles((sel) => {
                const next = new Set(sel);
                const allSelected = batchFileIds.every((id) => next.has(id));
                if (allSelected) {
                    batchFileIds.forEach((id) => next.delete(id));
                } else {
                    batchFileIds.forEach((id) => next.add(id));
                }
                return next;
            });
            return prev;
        });
    }, []);

    const selectAllFiles = useCallback(() => {
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(files.map((f) => f.id)));
        }
    }, [files, selectedFiles]);

    const updateFileSettings = useCallback((fileId, settings) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, ...settings } : f))
        );
    }, []);

    const updateBatchSettings = useCallback(
        (settings) => {
            setFiles((prev) =>
                prev.map((f) => (selectedFiles.has(f.id) ? { ...f, ...settings } : f))
            );
        },
        [selectedFiles]
    );

    const addToPrintQueue = useCallback(() => {
        const filesToPrint = files.filter((f) => selectedFiles.has(f.id));
        const queueItems = filesToPrint.map((f) => ({
            ...f,
            queueId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            status: 'waiting',
        }));
        setPrintQueue((prev) => [...prev, ...queueItems]);
        setFiles((prev) => prev.filter((f) => !selectedFiles.has(f.id)));
        setSelectedFiles(new Set());
    }, [files, selectedFiles]);

    const clearPrintQueue = useCallback(() => {
        setPrintQueue((prev) => prev.filter((item) => item.status === 'printing'));
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return (
                    <Dashboard
                        fileCount={files.length}
                        queueCount={printQueue.length}
                        customerCount={customers.length}
                    />
                );
            case 'print':
                return (
                    <PrintView
                        files={files}
                        selectedFiles={selectedFiles}
                        printQueue={printQueue}
                        addFiles={addFiles}
                        removeFile={removeFile}
                        removeBatch={removeBatch}
                        toggleFileSelection={toggleFileSelection}
                        toggleBatchSelection={toggleBatchSelection}
                        selectAllFiles={selectAllFiles}
                        updateFileSettings={updateFileSettings}
                        updateBatchSettings={updateBatchSettings}
                        addToPrintQueue={addToPrintQueue}
                        clearPrintQueue={clearPrintQueue}
                    />
                );
            case 'customers':
                return (
                    <CustomersView
                        customers={customers}
                        setCustomers={setCustomers}
                        activeCustomer={activeCustomer}
                        setActiveCustomer={setActiveCustomer}
                        addFiles={addFiles}
                        setCurrentPage={setCurrentPage}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            <TitleBar />
            <div className="app-layout">
                <Sidebar
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    fileCount={files.length}
                    queueCount={printQueue.length}
                    customerCount={customers.length}
                />
                <main className="main-content">{renderPage()}</main>
            </div>
        </>
    );
}

export default App;
