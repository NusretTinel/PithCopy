import React, { useState, useMemo } from 'react';
import {
    Printer, CheckCircle, AlertCircle, Loader, Layers,
    ChevronDown, ChevronRight, Check, Trash2,
} from 'lucide-react';
import FileDropZone from '../components/FileDropZone';
import PrintSettings from '../components/PrintSettings';
import PrintQueue from '../components/PrintQueue';

function getFileIcon(ext) {
    switch (ext) {
        case '.pdf': return { label: 'PDF', color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' };
        case '.doc': case '.docx': return { label: 'DOC', color: '#74B9FF', bg: 'rgba(116,185,255,0.12)' };
        case '.xls': case '.xlsx': return { label: 'XLS', color: '#00B894', bg: 'rgba(0,184,148,0.12)' };
        case '.png': case '.jpg': case '.jpeg': case '.bmp': case '.tiff':
            return { label: 'IMG', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)' };
        default: return { label: 'FILE', color: '#A29BFE', bg: 'rgba(162,155,254,0.12)' };
    }
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function PrintView({
    files, selectedFiles, printQueue, addFiles, removeFile, removeBatch,
    toggleFileSelection, toggleBatchSelection, selectAllFiles,
    updateFileSettings, updateBatchSettings,
    addToPrintQueue, clearPrintQueue,
}) {
    const [printStatus, setPrintStatus] = useState(null);
    const [collapsedBatches, setCollapsedBatches] = useState(new Set());

    // Group files by batchId
    const fileGroups = useMemo(() => {
        const groups = {};
        files.forEach((f) => {
            const key = f.batchId || 'ungrouped';
            if (!groups[key]) {
                groups[key] = { batchId: key, batchName: f.batchName || 'Dosyalar', files: [] };
            }
            groups[key].files.push(f);
        });
        return Object.values(groups);
    }, [files]);

    const toggleCollapse = (batchId) => {
        setCollapsedBatches((prev) => {
            const next = new Set(prev);
            next.has(batchId) ? next.delete(batchId) : next.add(batchId);
            return next;
        });
    };

    const handlePrint = async (settings) => {
        const filesToPrint = files.filter((f) => selectedFiles.has(f.id));
        if (filesToPrint.length === 0) return;

        addToPrintQueue();

        if (window.electronAPI) {
            setPrintStatus({ type: 'printing', message: `${filesToPrint.length} dosya yazdırılıyor...` });
            try {
                const results = await window.electronAPI.printBatch({
                    files: filesToPrint.map((f) => ({ ...f, path: f.path || f.nativePath })),
                    printerName: settings.printerName,
                    defaultSettings: { copies: settings.copies, color: settings.color, orientation: settings.orientation, paperSize: settings.paperSize, duplex: settings.duplex },
                });
                const ok = results.filter((r) => r.success).length;
                const fail = results.length - ok;
                setPrintStatus({ type: fail === 0 ? 'success' : 'warning', message: fail === 0 ? `✅ ${ok} dosya yazdırıldı!` : `${ok} yazdırıldı, ${fail} başarısız` });
            } catch (err) {
                setPrintStatus({ type: 'error', message: `Hata: ${err.message}` });
            }
            setTimeout(() => setPrintStatus(null), 5000);
        } else {
            setPrintStatus({ type: 'success', message: `🖨️ ${filesToPrint.length} dosya kuyruğa eklendi (demo)` });
            setTimeout(() => setPrintStatus(null), 3000);
        }
    };

    const getBatchSelectionState = (group) => {
        const selected = group.files.filter((f) => selectedFiles.has(f.id)).length;
        if (selected === 0) return 'none';
        if (selected === group.files.length) return 'all';
        return 'partial';
    };

    return (
        <>
            <div className="main-content__header">
                <div>
                    <h1 className="main-content__title">
                        <Printer size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        Yazdır
                    </h1>
                    <p className="main-content__subtitle">Dosyaları sürükleyin, grupla ayarlayın, tek tıkla yazdırın</p>
                </div>
                {files.length > 0 && (
                    <button className="btn btn--ghost" onClick={selectAllFiles} style={{ fontSize: '12px' }}>
                        {selectedFiles.size === files.length ? <><Check size={14} /> Seçimi Kaldır</> : <><Layers size={14} /> Tümünü Seç ({files.length})</>}
                    </button>
                )}
            </div>

            {/* Toast */}
            {printStatus && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', top: '52px', right: '24px',
                    background: printStatus.type === 'success' ? 'rgba(0,184,148,0.15)' : printStatus.type === 'error' ? 'rgba(255,107,107,0.15)' : 'rgba(116,185,255,0.15)',
                    border: `1px solid ${printStatus.type === 'success' ? 'var(--color-success)' : printStatus.type === 'error' ? 'var(--color-danger)' : 'var(--color-info)'}`,
                    borderRadius: '12px', padding: '14px 20px', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600, maxWidth: '400px',
                }}>
                    {printStatus.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />}
                    {printStatus.type === 'error' && <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />}
                    {printStatus.type === 'printing' && <Loader size={18} style={{ color: 'var(--color-info)', animation: 'pulse 1s infinite' }} />}
                    {printStatus.message}
                </div>
            )}

            <div className="main-content__body">
                <div className="two-column">
                    {/* Left: Drop + Grouped File List */}
                    <div className="two-column__left">
                        <FileDropZone onFilesAdded={addFiles} />

                        {fileGroups.length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                                {fileGroups.map((group) => {
                                    const isCollapsed = collapsedBatches.has(group.batchId);
                                    const selState = getBatchSelectionState(group);
                                    const totalSize = group.files.reduce((sum, f) => sum + (f.size || 0), 0);

                                    return (
                                        <div key={group.batchId} className="animate-fade-in" style={{
                                            background: 'var(--color-bg-card)', border: '1px solid var(--color-border-light)',
                                            borderRadius: '12px', marginBottom: '10px', overflow: 'hidden',
                                        }}>
                                            {/* Batch Header */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                                cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border-light)',
                                                background: selState === 'all' ? 'rgba(108,92,231,0.06)' : 'transparent',
                                            }}>
                                                <div onClick={() => toggleCollapse(group.batchId)} style={{ display: 'flex', alignItems: 'center' }}>
                                                    {isCollapsed ? <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />}
                                                </div>

                                                {/* Batch checkbox */}
                                                <div
                                                    onClick={() => toggleBatchSelection(group.batchId)}
                                                    className={`file-card__checkbox ${selState === 'all' ? 'file-card__checkbox--checked' : ''}`}
                                                    style={{ borderColor: selState === 'partial' ? 'var(--color-primary)' : undefined, background: selState === 'partial' ? 'rgba(108,92,231,0.3)' : undefined }}
                                                >
                                                    {selState === 'all' && <Check size={12} color="white" />}
                                                    {selState === 'partial' && <div style={{ width: 8, height: 2, background: 'white', borderRadius: 1 }} />}
                                                </div>

                                                <Layers size={16} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggleCollapse(group.batchId)}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                        {group.batchName}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                        {group.files.length} dosya · {formatFileSize(totalSize)}
                                                    </div>
                                                </div>

                                                <button className="btn btn--ghost btn--icon" onClick={() => removeBatch(group.batchId)} title="Grubu sil" style={{ opacity: 0.5, flexShrink: 0 }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Batch Files */}
                                            {!isCollapsed && (
                                                <div style={{ padding: '4px 8px 8px' }}>
                                                    {group.files.map((file) => {
                                                        const icon = getFileIcon(file.ext);
                                                        const isSelected = selectedFiles.has(file.id);
                                                        return (
                                                            <div key={file.id}
                                                                className={`file-card ${isSelected ? 'file-card--selected' : ''}`}
                                                                style={{ border: 'none', borderRadius: '8px', padding: '8px 10px', marginBottom: '2px' }}
                                                                onClick={() => toggleFileSelection(file.id)}
                                                            >
                                                                <div className={`file-card__checkbox ${isSelected ? 'file-card__checkbox--checked' : ''}`}>
                                                                    {isSelected && <Check size={12} color="white" />}
                                                                </div>
                                                                <div style={{ width: 32, height: 32, borderRadius: 6, background: icon.bg, color: icon.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                                                                    {icon.label}
                                                                </div>
                                                                <div className="file-card__info">
                                                                    <div className="file-card__name" style={{ fontSize: '12px' }}>{file.name}</div>
                                                                    <div className="file-card__meta">{formatFileSize(file.size)}</div>
                                                                </div>
                                                                <div className="file-card__actions">
                                                                    <button className="btn btn--ghost btn--icon" style={{ width: 28, height: 28 }}
                                                                        onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}>
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right: Settings + Queue */}
                    <div className="two-column__right">
                        <PrintSettings
                            selectedFiles={selectedFiles} files={files}
                            updateBatchSettings={updateBatchSettings} updateFileSettings={updateFileSettings}
                            onPrint={handlePrint}
                        />
                        <PrintQueue items={printQueue} onClear={clearPrintQueue} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default PrintView;
