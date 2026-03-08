import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Plus, FolderOpen, FileText, FileSpreadsheet, Image, File,
    Trash2, QrCode, X, UserPlus, Printer, RefreshCw, Download, Check,
    Copy, ExternalLink, Wifi, Settings, Globe,
} from 'lucide-react';

const avatarColors = [
    { bg: 'rgba(108, 92, 231, 0.2)', color: '#6C5CE7' },
    { bg: 'rgba(0, 210, 211, 0.2)', color: '#00D2D3' },
    { bg: 'rgba(255, 107, 107, 0.2)', color: '#FF6B6B' },
    { bg: 'rgba(0, 184, 148, 0.2)', color: '#00B894' },
    { bg: 'rgba(253, 203, 110, 0.2)', color: '#FDCB6E' },
    { bg: 'rgba(116, 185, 255, 0.2)', color: '#74B9FF' },
    { bg: 'rgba(162, 155, 254, 0.2)', color: '#A29BFE' },
    { bg: 'rgba(85, 239, 196, 0.2)', color: '#55EFC4' },
];

function getFileIcon(ext) {
    switch (ext) {
        case '.pdf': return { Icon: FileText, className: 'file-card__icon--pdf' };
        case '.doc': case '.docx': return { Icon: FileText, className: 'file-card__icon--word' };
        case '.xls': case '.xlsx': return { Icon: FileSpreadsheet, className: 'file-card__icon--excel' };
        case '.png': case '.jpg': case '.jpeg': case '.bmp': case '.tiff':
            return { Icon: Image, className: 'file-card__icon--image' };
        default: return { Icon: File, className: 'file-card__icon--pdf' };
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function CustomersView({ customers, setCustomers, activeCustomer, setActiveCustomer, addFiles, setCurrentPage }) {
    const [showModal, setShowModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [showQR, setShowQR] = useState(null);
    const [showGeneralQR, setShowGeneralQR] = useState(null);
    const [customerFiles, setCustomerFiles] = useState([]);
    const [selectedCustomerFiles, setSelectedCustomerFiles] = useState(new Set());
    const [notification, setNotification] = useState(null);

    // Inline print settings
    const [copies, setCopies] = useState(1);
    const [color, setColor] = useState(true);
    const [orientation, setOrientation] = useState('portrait');
    const [paperSize, setPaperSize] = useState('A4');
    const [duplex, setDuplex] = useState(false);

    // Load customers
    const loadCustomers = useCallback(async () => {
        if (window.electronAPI) {
            try {
                const list = await window.electronAPI.listCustomers();
                setCustomers(list.map((c, i) => ({ ...c, id: c.name, colorIndex: i % avatarColors.length })));
            } catch (err) {
                console.error('Müşteri listesi alınamadı:', err);
            }
        }
    }, [setCustomers]);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    // Listen for uploads
    useEffect(() => {
        if (window.electronAPI?.onFileReceived) {
            window.electronAPI.onFileReceived((data) => {
                showNotif(`📁 ${data.customerName}: ${data.fileName} yüklendi!`);
                loadCustomers();
                if (activeCustomer === data.customerName) loadCustomerFiles(data.customerName);
            });
        }
        return () => { window.electronAPI?.removeFileReceivedListener?.(); };
    }, [activeCustomer, loadCustomers]);

    const loadCustomerFiles = useCallback(async (customerName) => {
        if (window.electronAPI) {
            try {
                const files = await window.electronAPI.getCustomerFiles(customerName);
                setCustomerFiles(files);
            } catch { setCustomerFiles([]); }
        } else { setCustomerFiles([]); }
    }, []);

    useEffect(() => {
        if (activeCustomer) loadCustomerFiles(activeCustomer);
        else setCustomerFiles([]);
        setSelectedCustomerFiles(new Set());
    }, [activeCustomer, loadCustomerFiles]);

    const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 4000); };

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) return;
        const name = newCustomerName.trim();
        if (window.electronAPI) await window.electronAPI.createCustomer(name);
        setCustomers((prev) => [...prev, { id: name, name, path: '', fileCount: 0, files: [], colorIndex: prev.length % avatarColors.length }]);
        setNewCustomerName('');
        setShowModal(false);
        showNotif(`✅ "${name}" müşterisi oluşturuldu`);
    };

    // QR for specific customer
    const handleShowQR = async (customerName) => {
        let url = '';
        if (window.electronAPI) {
            const info = await window.electronAPI.getUploadURL(customerName);
            url = info.url;
        } else {
            url = `http://192.168.1.100:3333/upload/abc123/${encodeURIComponent(customerName)}`;
        }
        const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&color=6C5CE7&bgcolor=FFFFFF`;
        setShowQR({ customerName, url, qrDataUrl });
    };

    // General QR
    const handleShowGeneralQR = async () => {
        let url = '';
        if (window.electronAPI) {
            const info = await window.electronAPI.getGeneralUploadURL();
            url = info.url;
        } else {
            url = `http://192.168.1.100:3333/g`;
        }
        const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&color=00D2D3&bgcolor=FFFFFF`;
        setShowGeneralQR({ url, qrDataUrl });
    };

    const toggleFileSelect = (fileName) => {
        setSelectedCustomerFiles((prev) => {
            const next = new Set(prev);
            next.has(fileName) ? next.delete(fileName) : next.add(fileName);
            return next;
        });
    };

    const selectAllCustomerFiles = () => {
        selectedCustomerFiles.size === customerFiles.length
            ? setSelectedCustomerFiles(new Set())
            : setSelectedCustomerFiles(new Set(customerFiles.map((f) => f.name)));
    };

    // Send to print view with label
    const sendToPrint = () => {
        const filesToSend = customerFiles.filter((f) => selectedCustomerFiles.has(f.name));
        addFiles(filesToSend, activeCustomer);
        setCurrentPage('print');
        showNotif(`🖨️ ${filesToSend.length} dosya yazdır ekranına gönderildi`);
        setSelectedCustomerFiles(new Set());
    };

    // Direct print with inline settings
    const printDirectly = async () => {
        const filesToPrint = customerFiles.filter((f) => selectedCustomerFiles.has(f.name));
        if (window.electronAPI) {
            showNotif(`🖨️ ${filesToPrint.length} dosya yazdırılıyor...`);
            const results = await window.electronAPI.printBatch({
                files: filesToPrint,
                defaultSettings: { copies, color, orientation, paperSize, duplex },
            });
            const ok = results.filter((r) => r.success).length;
            showNotif(`✅ ${ok}/${filesToPrint.length} dosya yazdırıldı`);
        } else {
            showNotif(`🖨️ ${filesToPrint.length} dosya yazdırma kuyruğuna eklendi (demo)`);
        }
        setSelectedCustomerFiles(new Set());
    };

    const openFolder = async (customerPath) => {
        if (window.electronAPI) await window.electronAPI.openInExplorer(customerPath);
    };

    const getInitials = (name) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            <div className="main-content__header">
                <div>
                    <h1 className="main-content__title">
                        <Users size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        Müşteriler
                    </h1>
                    <p className="main-content__subtitle">Dosyaları müşterilere göre gruplandırın, QR ile dosya alın</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn--secondary" onClick={handleShowGeneralQR} title="Herkese açık QR — adını girip dosya yükler">
                        <Globe size={16} /> Genel QR
                    </button>
                    <button className="btn btn--secondary" onClick={loadCustomers}><RefreshCw size={16} /> Yenile</button>
                    <button className="btn btn--primary" onClick={() => setShowModal(true)}><UserPlus size={16} /> Yeni Müşteri</button>
                </div>
            </div>

            <div className="main-content__body">
                {notification && (
                    <div className="animate-fade-in" style={{
                        position: 'fixed', top: '52px', right: '24px', background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-primary)', borderRadius: '12px', padding: '12px 20px',
                        zIndex: 9999, boxShadow: '0 8px 32px rgba(108,92,231,0.3)', fontSize: '13px', fontWeight: 600, maxWidth: '350px',
                    }}>{notification}</div>
                )}

                {customers.length === 0 ? (
                    <div className="empty-state">
                        <FolderOpen className="empty-state__icon" />
                        <div className="empty-state__text">Henüz müşteri eklenmemiş</div>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '300px' }}>
                            Müşteri klasörleri oluşturarak dosyaları düzenli tutun. QR kod ile telefondan dosya alın.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <button className="btn btn--primary" onClick={() => setShowModal(true)}><Plus size={16} /> İlk Müşteriyi Ekle</button>
                            <button className="btn btn--secondary" onClick={handleShowGeneralQR}><Globe size={16} /> Genel QR</button>
                        </div>
                    </div>
                ) : (
                    <div className="two-column" style={{ gridTemplateColumns: '300px 1fr' }}>
                        {/* Left: Customer List */}
                        <div className="two-column__left" style={{ gap: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--color-text-muted)', marginBottom: '4px', paddingLeft: '4px' }}>
                                Müşteriler ({customers.length})
                            </div>
                            {customers.map((customer, index) => {
                                const colors = avatarColors[customer.colorIndex || 0];
                                const isActive = activeCustomer === customer.id;
                                return (
                                    <div key={customer.id}
                                        className={`customer-card animate-slide-in ${isActive ? 'customer-card--active' : ''}`}
                                        style={{ animationDelay: `${index * 40}ms` }}
                                        onClick={() => setActiveCustomer(customer.id)}
                                    >
                                        <div className="customer-card__avatar" style={{ background: colors.bg, color: colors.color }}>
                                            {getInitials(customer.name)}
                                        </div>
                                        <div className="customer-card__info">
                                            <div className="customer-card__name">{customer.name}</div>
                                            <div className="customer-card__files">{customer.fileCount || 0} dosya</div>
                                        </div>
                                        <button className="btn btn--ghost btn--icon" style={{ opacity: 0.5 }}
                                            onClick={(e) => { e.stopPropagation(); handleShowQR(customer.name); }} title="QR Kod">
                                            <QrCode size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right: Customer Files + Inline Print Settings */}
                        <div className="two-column__right">
                            {!activeCustomer ? (
                                <div className="empty-state" style={{ height: '100%' }}>
                                    <Users size={48} style={{ opacity: 0.2 }} />
                                    <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Dosyalarını görmek için bir müşteri seçin</div>
                                </div>
                            ) : (
                                <>
                                    {/* Customer Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{activeCustomer}</h2>
                                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{customerFiles.length} dosya</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn--secondary" onClick={() => handleShowQR(activeCustomer)}><QrCode size={14} /> QR</button>
                                            <button className="btn btn--secondary" onClick={() => {
                                                const c = customers.find((c) => c.id === activeCustomer);
                                                if (c?.path) openFolder(c.path);
                                            }}><FolderOpen size={14} /> Klasör</button>
                                        </div>
                                    </div>

                                    {customerFiles.length === 0 ? (
                                        <div className="empty-state">
                                            <Download size={48} style={{ opacity: 0.2 }} />
                                            <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Bu müşterinin henüz dosyası yok</div>
                                            <button className="btn btn--primary" style={{ marginTop: '12px' }} onClick={() => handleShowQR(activeCustomer)}>
                                                <QrCode size={14} /> QR Kod Oluştur
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px' }}>
                                            {/* File List */}
                                            <div>
                                                {/* Toolbar */}
                                                <div className="toolbar" style={{ marginBottom: '10px' }}>
                                                    <button className="btn btn--ghost" onClick={selectAllCustomerFiles} style={{ fontSize: '12px' }}>
                                                        {selectedCustomerFiles.size === customerFiles.length
                                                            ? <><Check size={14} /> Seçimi Kaldır</>
                                                            : <><Copy size={14} /> Tümünü Seç</>}
                                                    </button>
                                                    <div className="toolbar__info">{selectedCustomerFiles.size} / {customerFiles.length} seçili</div>
                                                </div>

                                                <div className="file-list">
                                                    {customerFiles.map((file, index) => {
                                                        const { Icon, className } = getFileIcon(file.ext);
                                                        const isSelected = selectedCustomerFiles.has(file.name);
                                                        return (
                                                            <div key={file.name}
                                                                className={`file-card animate-slide-in ${isSelected ? 'file-card--selected' : ''}`}
                                                                style={{ animationDelay: `${index * 30}ms` }}
                                                                onClick={() => toggleFileSelect(file.name)}
                                                            >
                                                                <div className={`file-card__checkbox ${isSelected ? 'file-card__checkbox--checked' : ''}`}>
                                                                    {isSelected && <Check size={12} color="white" />}
                                                                </div>
                                                                <div className={`file-card__icon ${className}`}><Icon size={20} /></div>
                                                                <div className="file-card__info">
                                                                    <div className="file-card__name">{file.name}</div>
                                                                    <div className="file-card__meta">{file.ext?.replace('.', '').toUpperCase()} · {formatFileSize(file.size)}</div>
                                                                </div>
                                                                <div className="file-card__actions">
                                                                    <button className="btn btn--ghost btn--icon" onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.electronAPI?.deleteCustomerFile(file.path).then(() => { loadCustomerFiles(activeCustomer); loadCustomers(); });
                                                                    }} title="Sil"><Trash2 size={14} /></button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Inline Print Settings */}
                                            <div className="print-settings" style={{ height: 'fit-content' }}>
                                                <div className="print-settings__title"><Settings size={16} /> Yazdırma Ayarları</div>

                                                <div className="print-settings__group">
                                                    <label className="print-settings__label">Kopya</label>
                                                    <input type="number" className="print-settings__input" value={copies} min={1} max={999}
                                                        onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))} />
                                                </div>

                                                <div className="print-settings__group">
                                                    <div className="print-settings__row">
                                                        <div>
                                                            <label className="print-settings__label">Kağıt</label>
                                                            <select className="print-settings__select" value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                                                                <option value="A4">A4</option><option value="A3">A3</option><option value="A5">A5</option>
                                                                <option value="Letter">Letter</option><option value="Legal">Legal</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="print-settings__label">Yön</label>
                                                            <select className="print-settings__select" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                                                                <option value="portrait">Dikey</option><option value="landscape">Yatay</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="print-settings__group">
                                                    <div className="print-settings__toggle" onClick={() => setColor(!color)}>
                                                        <span className="print-settings__toggle-label">Renkli</span>
                                                        <div className={`toggle-switch ${color ? 'toggle-switch--active' : ''}`}><div className="toggle-switch__knob" /></div>
                                                    </div>
                                                </div>

                                                <div className="print-settings__group">
                                                    <div className="print-settings__toggle" onClick={() => setDuplex(!duplex)}>
                                                        <span className="print-settings__toggle-label">Çift Taraflı</span>
                                                        <div className={`toggle-switch ${duplex ? 'toggle-switch--active' : ''}`}><div className="toggle-switch__knob" /></div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <button className="btn btn--primary btn--lg" onClick={printDirectly}
                                                        disabled={selectedCustomerFiles.size === 0}
                                                        style={{ width: '100%', opacity: selectedCustomerFiles.size === 0 ? 0.5 : 1, fontSize: '14px', padding: '12px' }}>
                                                        <Printer size={16} /> YAZDIR ({selectedCustomerFiles.size})
                                                    </button>
                                                    <button className="btn btn--secondary" onClick={sendToPrint}
                                                        disabled={selectedCustomerFiles.size === 0}
                                                        style={{ width: '100%', opacity: selectedCustomerFiles.size === 0 ? 0.5 : 1, fontSize: '12px' }}>
                                                        <ExternalLink size={14} /> Yazdır Ekranına Gönder
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* New Customer Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 className="modal__title" style={{ margin: 0 }}>Yeni Müşteri</h2>
                            <button className="btn btn--ghost btn--icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <input className="modal__input" placeholder="Müşteri adı..." value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomer(); }} autoFocus />
                        <div className="modal__actions">
                            <button className="btn btn--secondary" onClick={() => setShowModal(false)}>İptal</button>
                            <button className="btn btn--primary" onClick={handleCreateCustomer} disabled={!newCustomerName.trim()}
                                style={{ opacity: newCustomerName.trim() ? 1 : 0.5 }}><Plus size={16} /> Oluştur</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer QR Modal */}
            {showQR && (
                <div className="modal-overlay" onClick={() => setShowQR(null)}>
                    <div className="modal animate-fade-in" style={{ width: '460px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className="modal__title" style={{ margin: 0 }}><QrCode size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />{showQR.customerName}</h2>
                            <button className="btn btn--ghost btn--icon" onClick={() => setShowQR(null)}><X size={18} /></button>
                        </div>
                        <div className="qr-panel">
                            <div className="qr-panel__code" style={{ padding: '16px', borderRadius: '16px' }}>
                                <img src={showQR.qrDataUrl} alt="QR" style={{ width: '200px', height: '200px', display: 'block' }} />
                            </div>
                            <div style={{ background: 'rgba(108,92,231,0.08)', borderRadius: '12px', padding: '14px', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <Wifi size={14} style={{ color: 'var(--color-accent)' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Nasıl Kullanılır?</span>
                                </div>
                                <ol style={{ fontSize: '11px', color: 'var(--color-text-secondary)', paddingLeft: '16px', lineHeight: '2' }}>
                                    <li>Aynı WiFi ağında olun</li>
                                    <li>QR kodu telefonla taratın</li>
                                    <li>Dosyaları yükleyin → otomatik düşer ✅</li>
                                </ol>
                            </div>
                            <div style={{ width: '100%', background: 'var(--color-bg-tertiary)', borderRadius: '8px', padding: '8px 12px', fontSize: '10px', color: 'var(--color-text-muted)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                {showQR.url}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* General QR Modal */}
            {showGeneralQR && (
                <div className="modal-overlay" onClick={() => setShowGeneralQR(null)}>
                    <div className="modal animate-fade-in" style={{ width: '460px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className="modal__title" style={{ margin: 0 }}>
                                <Globe size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--color-accent)' }} />
                                Genel QR Kod
                            </h2>
                            <button className="btn btn--ghost btn--icon" onClick={() => setShowGeneralQR(null)}><X size={18} /></button>
                        </div>
                        <div className="qr-panel">
                            <div className="qr-panel__code" style={{ padding: '16px', borderRadius: '16px' }}>
                                <img src={showGeneralQR.qrDataUrl} alt="QR" style={{ width: '200px', height: '200px', display: 'block' }} />
                            </div>
                            <div style={{ background: 'rgba(0,210,211,0.08)', borderRadius: '12px', padding: '14px', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <Globe size={14} style={{ color: 'var(--color-accent)' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Genel Dosya Alma</span>
                                </div>
                                <ul style={{ fontSize: '11px', color: 'var(--color-text-secondary)', paddingLeft: '16px', lineHeight: '2' }}>
                                    <li>Bu QR'ı tezgaha veya duvara asın</li>
                                    <li>Gelen müşteri telefonuyla taratır</li>
                                    <li>Kendi adını girer → dosyalarını yükler</li>
                                    <li>Her kişi ayrı klasöre otomatik ayrılır ✅</li>
                                    <li>Çalışan hiçbir şey yapmaz, rahat eder 😎</li>
                                </ul>
                            </div>
                            <div style={{ width: '100%', background: 'var(--color-bg-tertiary)', borderRadius: '8px', padding: '8px 12px', fontSize: '10px', color: 'var(--color-text-muted)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                {showGeneralQR.url}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default CustomersView;
