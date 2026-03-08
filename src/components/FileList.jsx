import React from 'react';
import {
    FileText,
    FileSpreadsheet,
    Image,
    File,
    Trash2,
    Check,
    Copy,
} from 'lucide-react';

function getFileIcon(ext) {
    switch (ext) {
        case '.pdf':
            return { Icon: FileText, className: 'file-card__icon--pdf' };
        case '.doc':
        case '.docx':
            return { Icon: FileText, className: 'file-card__icon--word' };
        case '.xls':
        case '.xlsx':
            return { Icon: FileSpreadsheet, className: 'file-card__icon--excel' };
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.bmp':
        case '.tiff':
            return { Icon: Image, className: 'file-card__icon--image' };
        default:
            return { Icon: File, className: 'file-card__icon--pdf' };
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFormatLabel(ext) {
    const labels = {
        '.pdf': 'PDF',
        '.doc': 'Word',
        '.docx': 'Word',
        '.xls': 'Excel',
        '.xlsx': 'Excel',
        '.png': 'PNG',
        '.jpg': 'JPEG',
        '.jpeg': 'JPEG',
        '.bmp': 'BMP',
        '.tiff': 'TIFF',
    };
    return labels[ext] || ext.toUpperCase().replace('.', '');
}

function FileList({
    files,
    selectedFiles,
    toggleFileSelection,
    selectAllFiles,
    removeFile,
}) {
    if (files.length === 0) return null;

    const allSelected = files.length > 0 && selectedFiles.size === files.length;

    return (
        <div>
            {/* Toolbar */}
            <div className="toolbar" style={{ marginBottom: '12px' }}>
                <button
                    className="btn btn--ghost"
                    onClick={selectAllFiles}
                    style={{ fontSize: '12px' }}
                >
                    {allSelected ? (
                        <>
                            <Check size={14} /> Seçimi Kaldır
                        </>
                    ) : (
                        <>
                            <Copy size={14} /> Tümünü Seç
                        </>
                    )}
                </button>
                <div className="toolbar__divider" />
                {selectedFiles.size > 0 && (
                    <button
                        className="btn btn--danger"
                        style={{ fontSize: '12px' }}
                        onClick={() => {
                            selectedFiles.forEach((id) => removeFile(id));
                        }}
                    >
                        <Trash2 size={14} /> Seçilenleri Sil ({selectedFiles.size})
                    </button>
                )}
                <div className="toolbar__info">
                    {files.length} dosya · {selectedFiles.size} seçili
                </div>
            </div>

            {/* File Cards */}
            <div className="file-list">
                {files.map((file, index) => {
                    const { Icon, className } = getFileIcon(file.ext);
                    const isSelected = selectedFiles.has(file.id);

                    return (
                        <div
                            key={file.id}
                            className={`file-card ${isSelected ? 'file-card--selected' : ''}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => toggleFileSelection(file.id)}
                        >
                            <div
                                className={`file-card__checkbox ${isSelected ? 'file-card__checkbox--checked' : ''
                                    }`}
                            >
                                {isSelected && <Check size={12} color="white" />}
                            </div>

                            <div className={`file-card__icon ${className}`}>
                                <Icon size={20} />
                            </div>

                            <div className="file-card__info">
                                <div className="file-card__name">{file.name}</div>
                                <div className="file-card__meta">
                                    {getFormatLabel(file.ext)} · {formatFileSize(file.size)}
                                    {file.copies > 1 && ` · ${file.copies} kopya`}
                                </div>
                            </div>

                            <div className="file-card__actions">
                                <button
                                    className="btn btn--ghost btn--icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(file.id);
                                    }}
                                    title="Dosyayı sil"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default FileList;
