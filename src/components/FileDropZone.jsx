import React, { useState, useCallback } from 'react';
import { Upload, FileUp } from 'lucide-react';

function FileDropZone({ onFilesAdded }) {
    const [isDragging, setIsDragging] = useState(false);

    const getFileData = (file) => ({
        path: file.path || file.name,
        name: file.name,
        ext: '.' + file.name.split('.').pop().toLowerCase(),
        size: file.size,
        nativePath: file.path,
    });

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const droppedFiles = Array.from(e.dataTransfer.files);
            if (droppedFiles.length > 0) {
                const fileData = droppedFiles.map(getFileData);
                onFilesAdded(fileData);
            }
        },
        [onFilesAdded]
    );

    const handleClick = useCallback(async () => {
        if (window.electronAPI) {
            const files = await window.electronAPI.openFileDialog();
            if (files && files.length > 0) {
                onFilesAdded(files);
            }
        } else {
            // Fallback for browser dev mode
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.tiff';
            input.onchange = (e) => {
                const selectedFiles = Array.from(e.target.files);
                if (selectedFiles.length > 0) {
                    const fileData = selectedFiles.map(getFileData);
                    onFilesAdded(fileData);
                }
            };
            input.click();
        }
    }, [onFilesAdded]);

    return (
        <div
            className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            {isDragging ? (
                <FileUp className="dropzone__icon" style={{ color: 'var(--color-accent)' }} />
            ) : (
                <Upload className="dropzone__icon" />
            )}
            <div className="dropzone__text">
                {isDragging ? 'Dosyaları buraya bırakın!' : 'Dosyaları sürükleyip bırakın'}
            </div>
            <div className="dropzone__subtext">
                veya dosya seçmek için tıklayın
            </div>
            <div className="dropzone__formats">
                <span className="dropzone__format-tag dropzone__format-tag--pdf">PDF</span>
                <span className="dropzone__format-tag dropzone__format-tag--word">WORD</span>
                <span className="dropzone__format-tag dropzone__format-tag--excel">EXCEL</span>
                <span className="dropzone__format-tag dropzone__format-tag--image">RESIM</span>
            </div>
        </div>
    );
}

export default FileDropZone;
