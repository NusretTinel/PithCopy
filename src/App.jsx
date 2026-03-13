import React, { useState, useCallback, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PrintView from './pages/PrintView';
import CustomersView from './pages/CustomersView';
import JobsView from './pages/JobsView';
import SettingsView from './pages/SettingsView';
import StatsView from './pages/StatsView';

function App() {
    const [currentPage, setCurrentPage] = useState('jobs');
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [customers, setCustomers] = useState([]);
    const [activeCustomer, setActiveCustomer] = useState(null);
    const [printQueue, setPrintQueue] = useState([]);
    const [pendingJobCount, setPendingJobCount] = useState(0);
    const [usbNotification, setUsbNotification] = useState(null);

    // Listen for USB detection
    useEffect(() => {
        if (window.electronAPI?.onUSBDetected) {
            window.electronAPI.onUSBDetected((data) => {
                setUsbNotification(data);
                setTimeout(() => setUsbNotification(null), 15000);
            });
        }
        return () => { window.electronAPI?.removeUSBListener?.(); };
    }, []);

    // addFiles with automatic batch grouping
    const addFiles = useCallback((newFiles, batchLabel) => {
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const batchName = batchLabel || `Grup ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
        const filesWithId = newFiles.map((f, i) => ({
            ...f,
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
            batchId, batchName,
            copies: 1, color: true, orientation: 'portrait', paperSize: 'A4', duplex: false, status: 'ready',
        }));
        setFiles((prev) => [...prev, ...filesWithId]);
    }, []);

    const removeFile = useCallback((fileId) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setSelectedFiles((prev) => { const next = new Set(prev); next.delete(fileId); return next; });
    }, []);

    const removeBatch = useCallback((batchId) => {
        setFiles((prev) => prev.filter((f) => f.batchId !== batchId));
        setSelectedFiles(new Set());
    }, []);

    const toggleFileSelection = useCallback((fileId) => {
        setSelectedFiles((prev) => { const next = new Set(prev); next.has(fileId) ? next.delete(fileId) : next.add(fileId); return next; });
    }, []);

    const toggleBatchSelection = useCallback((batchId) => {
        setFiles((prev) => {
            const batchFileIds = prev.filter((f) => f.batchId === batchId).map((f) => f.id);
            setSelectedFiles((sel) => {
                const next = new Set(sel);
                const allSelected = batchFileIds.every((id) => next.has(id));
                if (allSelected) batchFileIds.forEach((id) => next.delete(id));
                else batchFileIds.forEach((id) => next.add(id));
                return next;
            });
            return prev;
        });
    }, []);

    const selectAllFiles = useCallback(() => {
        if (selectedFiles.size === files.length) setSelectedFiles(new Set());
        else setSelectedFiles(new Set(files.map((f) => f.id)));
    }, [files, selectedFiles]);

    const updateFileSettings = useCallback((fileId, settings) => {
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...settings } : f)));
    }, []);

    const updateBatchSettings = useCallback((settings) => {
        setFiles((prev) => prev.map((f) => (selectedFiles.has(f.id) ? { ...f, ...settings } : f)));
    }, [selectedFiles]);

    const addToPrintQueue = useCallback(() => {
        const filesToPrint = files.filter((f) => selectedFiles.has(f.id));
        const queueItems = filesToPrint.map((f) => ({
            ...f, queueId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, status: 'waiting',
        }));
        setPrintQueue((prev) => [...prev, ...queueItems]);
        setFiles((prev) => prev.filter((f) => !selectedFiles.has(f.id)));
        setSelectedFiles(new Set());
    }, [files, selectedFiles]);

    const clearPrintQueue = useCallback(() => {
        setPrintQueue((prev) => prev.filter((item) => item.status === 'printing'));
    }, []);

    const handleUSBImport = async (customerName) => {
        if (!usbNotification || !window.electronAPI) return;
        await window.electronAPI.importUSBFiles(usbNotification.files, customerName);
        setUsbNotification(null);
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard fileCount={files.length} queueCount={printQueue.length} customerCount={customers.length} />;
            case 'jobs':
                return <JobsView onJobCountChange={setPendingJobCount} />;
            case 'print':
                return (
                    <PrintView
                        files={files} selectedFiles={selectedFiles} printQueue={printQueue}
                        addFiles={addFiles} removeFile={removeFile} removeBatch={removeBatch}
                        toggleFileSelection={toggleFileSelection} toggleBatchSelection={toggleBatchSelection}
                        selectAllFiles={selectAllFiles} updateFileSettings={updateFileSettings}
                        updateBatchSettings={updateBatchSettings} addToPrintQueue={addToPrintQueue}
                        clearPrintQueue={clearPrintQueue}
                    />
                );
            case 'customers':
                return (
                    <CustomersView
                        customers={customers} setCustomers={setCustomers}
                        activeCustomer={activeCustomer} setActiveCustomer={setActiveCustomer}
                        addFiles={addFiles} setCurrentPage={setCurrentPage}
                    />
                );
            case 'settings':
                return <SettingsView />;
            case 'stats':
                return <StatsView />;
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
                    pendingJobCount={pendingJobCount}
                />
                <main className="main-content">{renderPage()}</main>
            </div>

            {/* USB Detection Toast */}
            {usbNotification && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', bottom: '24px', right: '24px', background: 'var(--color-bg-secondary)',
                    border: '1px solid #FDCB6E', borderRadius: '16px', padding: '16px 20px',
                    zIndex: 9999, boxShadow: '0 8px 32px rgba(253,203,110,0.3)', maxWidth: '380px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>💾</span>
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>USB Algılandı</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                        {usbNotification.drive} sürücüsünde {usbNotification.files.length} dosya bulundu
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn--primary" style={{ fontSize: '12px', padding: '8px 14px' }}
                            onClick={() => { addFiles(usbNotification.files, 'USB'); setUsbNotification(null); }}>
                            Yazdır Ekranına Ekle
                        </button>
                        <button className="btn btn--ghost" style={{ fontSize: '12px', padding: '8px 14px' }}
                            onClick={() => setUsbNotification(null)}>Kapat</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default App;
