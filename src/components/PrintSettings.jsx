import React, { useState, useEffect } from 'react';
import { Settings, Printer as PrinterIcon } from 'lucide-react';

function PrintSettings({
    selectedFiles,
    files,
    updateBatchSettings,
    updateFileSettings,
    onPrint,
}) {
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [copies, setCopies] = useState(1);
    const [color, setColor] = useState(true);
    const [orientation, setOrientation] = useState('portrait');
    const [paperSize, setPaperSize] = useState('A4');
    const [duplex, setDuplex] = useState(false);

    useEffect(() => {
        // Load printers
        const loadPrinters = async () => {
            if (window.electronAPI) {
                try {
                    const printerList = await window.electronAPI.getPrinters();
                    setPrinters(printerList);
                    const defaultPrinter = printerList.find((p) => p.isDefault);
                    if (defaultPrinter) {
                        setSelectedPrinter(defaultPrinter.name);
                    } else if (printerList.length > 0) {
                        setSelectedPrinter(printerList[0].name);
                    }
                } catch (err) {
                    console.error('Yazıcı listesi alınamadı:', err);
                }
            } else {
                // Mock printers for dev
                setPrinters([
                    { name: 'Microsoft Print to PDF', displayName: 'Microsoft Print to PDF', isDefault: true },
                    { name: 'OneNote', displayName: 'Send to OneNote', isDefault: false },
                ]);
                setSelectedPrinter('Microsoft Print to PDF');
            }
        };
        loadPrinters();
    }, []);

    const applyToSelected = () => {
        updateBatchSettings({
            copies,
            color,
            orientation,
            paperSize,
            duplex,
        });
    };

    const handlePrint = () => {
        // Apply settings first, then print
        applyToSelected();
        if (onPrint) {
            onPrint({
                printerName: selectedPrinter,
                copies,
                color,
                orientation,
                paperSize,
                duplex,
            });
        }
    };

    const selectedCount = selectedFiles.size;

    return (
        <div className="print-settings">
            <div className="print-settings__title">
                <Settings size={18} />
                Yazdırma Ayarları
            </div>

            {/* Printer Selection */}
            <div className="print-settings__group">
                <label className="print-settings__label">Yazıcı</label>
                <select
                    className="print-settings__select"
                    value={selectedPrinter}
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                >
                    {printers.map((p) => (
                        <option key={p.name} value={p.name}>
                            {p.displayName} {p.isDefault ? '(Varsayılan)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Copies */}
            <div className="print-settings__group">
                <label className="print-settings__label">Kopya Sayısı</label>
                <input
                    type="number"
                    className="print-settings__input"
                    value={copies}
                    min={1}
                    max={999}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                />
            </div>

            {/* Paper Size & Orientation */}
            <div className="print-settings__group">
                <div className="print-settings__row">
                    <div>
                        <label className="print-settings__label">Kağıt Boyutu</label>
                        <select
                            className="print-settings__select"
                            value={paperSize}
                            onChange={(e) => setPaperSize(e.target.value)}
                        >
                            <option value="A4">A4</option>
                            <option value="A3">A3</option>
                            <option value="A5">A5</option>
                            <option value="Letter">Letter</option>
                            <option value="Legal">Legal</option>
                        </select>
                    </div>
                    <div>
                        <label className="print-settings__label">Yön</label>
                        <select
                            className="print-settings__select"
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value)}
                        >
                            <option value="portrait">Dikey</option>
                            <option value="landscape">Yatay</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Color Toggle */}
            <div className="print-settings__group">
                <div className="print-settings__toggle" onClick={() => setColor(!color)}>
                    <span className="print-settings__toggle-label">Renkli Baskı</span>
                    <div className={`toggle-switch ${color ? 'toggle-switch--active' : ''}`}>
                        <div className="toggle-switch__knob" />
                    </div>
                </div>
            </div>

            {/* Duplex Toggle */}
            <div className="print-settings__group">
                <div className="print-settings__toggle" onClick={() => setDuplex(!duplex)}>
                    <span className="print-settings__toggle-label">Çift Taraflı</span>
                    <div className={`toggle-switch ${duplex ? 'toggle-switch--active' : ''}`}>
                        <div className="toggle-switch__knob" />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <button
                    className="btn btn--secondary btn--lg"
                    onClick={applyToSelected}
                    disabled={selectedCount === 0}
                    style={{ width: '100%', opacity: selectedCount === 0 ? 0.5 : 1 }}
                >
                    <Settings size={16} />
                    Seçilenlere Uygula ({selectedCount})
                </button>

                <button
                    className="btn btn--primary btn--lg"
                    onClick={handlePrint}
                    disabled={selectedCount === 0}
                    style={{
                        width: '100%',
                        opacity: selectedCount === 0 ? 0.5 : 1,
                        fontSize: '15px',
                        padding: '14px',
                    }}
                >
                    <PrinterIcon size={18} />
                    YAZDIR ({selectedCount} dosya)
                </button>
            </div>
        </div>
    );
}

export default PrintSettings;
