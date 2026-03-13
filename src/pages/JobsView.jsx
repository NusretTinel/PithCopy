import React, { useState, useEffect, useCallback } from 'react';
import {
    ClipboardList, Printer, CheckCircle, Clock, Package, Trash2,
    ChevronDown, ChevronRight, FileText, Image, File, FileSpreadsheet,
    Volume2, RefreshCw, Settings, ArrowRight, Zap, Eye, MessageSquare,
    X, Hash,
} from 'lucide-react';

const statusConfig = {
    pending: { label: 'Bekliyor', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)', icon: Clock },
    approved: { label: 'Onaylandı', color: '#74B9FF', bg: 'rgba(116,185,255,0.12)', icon: CheckCircle },
    printing: { label: 'Yazdırılıyor', color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)', icon: Printer },
    ready: { label: 'Hazır', color: '#00B894', bg: 'rgba(0,184,148,0.12)', icon: CheckCircle },
    delivered: { label: 'Teslim Edildi', color: '#A0A0C0', bg: 'rgba(160,160,192,0.08)', icon: Package },
};

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

function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function JobsView({ onJobCountChange }) {
    const [jobs, setJobs] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [expandedJob, setExpandedJob] = useState(null);
    const [filter, setFilter] = useState('active'); // 'active', 'pending', 'all'
    const [notification, setNotification] = useState(null);

    // Load printers
    useEffect(() => {
        const loadPrinters = async () => {
            if (window.electronAPI) {
                try {
                    const list = await window.electronAPI.getPrinters();
                    setPrinters(list);
                    const def = list.find(p => p.isDefault);
                    setSelectedPrinter(def ? def.name : (list[0]?.name || ''));
                } catch (e) { console.error(e); }
            }
        };
        loadPrinters();
    }, []);

    // Load jobs
    const loadJobs = useCallback(async () => {
        if (window.electronAPI) {
            try {
                let jobList;
                if (filter === 'pending') jobList = await window.electronAPI.getPendingJobs();
                else if (filter === 'active') jobList = await window.electronAPI.getActiveJobs();
                else jobList = await window.electronAPI.getAllJobs();
                setJobs(jobList || []);
                if (onJobCountChange) onJobCountChange((jobList || []).filter(j => j.status === 'pending').length);
            } catch (e) { console.error(e); }
        }
    }, [filter, onJobCountChange]);

    useEffect(() => { loadJobs(); }, [loadJobs]);

    // Listen for new jobs
    useEffect(() => {
        if (window.electronAPI?.onNewJob) {
            window.electronAPI.onNewJob((job) => {
                showNotif(`🆕 Yeni iş: ${job.customerName} — #${job.queueNumber}`);
                playNotificationSound();
                loadJobs();
            });
        }
        if (window.electronAPI?.onJobUpdated) {
            window.electronAPI.onJobUpdated(() => loadJobs());
        }
        return () => {
            window.electronAPI?.removeNewJobListener?.();
            window.electronAPI?.removeJobUpdatedListener?.();
        };
    }, [loadJobs]);

    // Auto-refresh every 5s
    useEffect(() => {
        const interval = setInterval(loadJobs, 5000);
        return () => clearInterval(interval);
    }, [loadJobs]);

    const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 4000); };

    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.4);
        } catch (e) { /* fallback silent */ }
    };

    const handleApproveAndPrint = async (jobId) => {
        if (!selectedPrinter) { showNotif('⚠️ Yazıcı seçin'); return; }
        if (window.electronAPI) {
            showNotif('🖨️ Yazdırılıyor...');
            const result = await window.electronAPI.approveAndPrint(jobId, selectedPrinter);
            if (result.success) {
                showNotif('✅ Yazdırma tamamlandı!');
            } else {
                showNotif('❌ Hata: ' + (result.message || ''));
            }
            loadJobs();
        }
    };

    const handleStatusUpdate = async (jobId, status) => {
        if (window.electronAPI) {
            await window.electronAPI.updateJobStatus(jobId, status, selectedPrinter);
            loadJobs();
        }
    };

    const handleDeleteJob = async (jobId) => {
        if (window.electronAPI) {
            await window.electronAPI.deleteJob(jobId);
            loadJobs();
        }
    };

    const pendingCount = jobs.filter(j => j.status === 'pending').length;

    return (
        <>
            <div className="main-content__header">
                <div>
                    <h1 className="main-content__title">
                        <ClipboardList size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        Bekleyen İşler
                        {pendingCount > 0 && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 24, height: 24, borderRadius: '50%', background: '#FF6B6B', color: 'white',
                                fontSize: '12px', fontWeight: 700, marginLeft: '10px', verticalAlign: 'middle',
                                animation: 'pulse 2s infinite',
                            }}>{pendingCount}</span>
                        )}
                    </h1>
                    <p className="main-content__subtitle">QR ile gelen yazdırma talepleri — onayla ve yazdır</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Printer selector */}
                    <select className="print-settings__select" value={selectedPrinter}
                        onChange={(e) => setSelectedPrinter(e.target.value)}
                        style={{ minWidth: '180px' }}>
                        {printers.map(p => (
                            <option key={p.name} value={p.name}>{p.displayName} {p.isDefault ? '(Varsayılan)' : ''}</option>
                        ))}
                    </select>
                    {/* Filter */}
                    <div style={{ display: 'flex', background: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                        {[
                            { key: 'pending', label: 'Bekleyen' },
                            { key: 'active', label: 'Aktif' },
                            { key: 'all', label: 'Tümü' },
                        ].map(f => (
                            <button key={f.key}
                                className={`btn btn--ghost`}
                                style={{
                                    fontSize: '12px', padding: '6px 12px', borderRadius: '6px',
                                    background: filter === f.key ? 'var(--color-primary)' : 'transparent',
                                    color: filter === f.key ? 'white' : 'var(--color-text-secondary)',
                                }}
                                onClick={() => setFilter(f.key)}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn--secondary" onClick={loadJobs}><RefreshCw size={16} /></button>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', top: '52px', right: '24px', background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-primary)', borderRadius: '12px', padding: '12px 20px',
                    zIndex: 9999, boxShadow: '0 8px 32px rgba(108,92,231,0.3)', fontSize: '13px', fontWeight: 600,
                    maxWidth: '400px',
                }}>{notification}</div>
            )}

            <div className="main-content__body">
                {jobs.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardList size={48} style={{ opacity: 0.2 }} />
                        <div className="empty-state__text">Henüz bekleyen iş yok</div>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '300px' }}>
                            Müşteriler QR kodla dosya gönderdiğinde burada görünecek.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {jobs.map((job, index) => {
                            const status = statusConfig[job.status] || statusConfig.pending;
                            const StatusIcon = status.icon;
                            const isExpanded = expandedJob === job.jobId;
                            const settings = job.settings || {};

                            return (
                                <div key={job.jobId} className="animate-slide-in" style={{
                                    background: 'var(--color-bg-card)',
                                    border: `1px solid ${job.status === 'pending' ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                                    borderRadius: '14px', overflow: 'hidden',
                                    animationDelay: `${index * 40}ms`,
                                    boxShadow: job.status === 'pending' ? '0 0 20px rgba(108,92,231,0.15)' : 'none',
                                }}>
                                    {/* Job Header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                        cursor: 'pointer',
                                    }} onClick={() => setExpandedJob(isExpanded ? null : job.jobId)}>
                                        {/* Queue number */}
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '12px', background: status.bg,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexDirection: 'column', flexShrink: 0,
                                        }}>
                                            <Hash size={12} style={{ color: status.color, opacity: 0.6 }} />
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: status.color }}>{job.queueNumber}</span>
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                    {job.customerName}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                                                    background: status.bg, color: status.color,
                                                }}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                <span>{job.files?.length || 0} dosya</span>
                                                <span>•</span>
                                                <span>{settings.color !== false ? '🌈 Renkli' : '⬛ Siyah-Beyaz'}</span>
                                                <span>•</span>
                                                <span>{settings.copies || 1} kopya</span>
                                                <span>•</span>
                                                <span>{settings.paperSize || 'A4'}</span>
                                                {settings.duplex && <><span>•</span><span>↔ Çift Taraflı</span></>}
                                            </div>
                                        </div>

                                        {/* Price */}
                                        {job.totalPrice > 0 && (
                                            <div style={{
                                                fontSize: '16px', fontWeight: 800, color: '#00B894',
                                                background: 'rgba(0,184,148,0.08)', padding: '4px 12px', borderRadius: '8px',
                                            }}>
                                                {job.totalPrice.toFixed(2)} ₺
                                            </div>
                                        )}

                                        {/* Time */}
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0, textAlign: 'right' }}>
                                            <div>{formatTime(job.createdAt)}</div>
                                        </div>

                                        {/* Expand arrow */}
                                        {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                                            : <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
                                    </div>

                                    {/* Notes preview */}
                                    {job.notes && !isExpanded && (
                                        <div style={{
                                            padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: '6px',
                                            fontSize: '12px', color: '#FDCB6E',
                                        }}>
                                            <MessageSquare size={12} />
                                            <span style={{ fontStyle: 'italic' }}>{job.notes}</span>
                                        </div>
                                    )}

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border-light)' }}>
                                            {/* Files */}
                                            <div style={{ marginTop: '12px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                                                    Dosyalar
                                                </div>
                                                {(job.files || []).map((file, i) => {
                                                    const { Icon, className } = getFileIcon(file.ext);
                                                    return (
                                                        <div key={i} style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px',
                                                            padding: '8px 10px', background: 'var(--color-bg-tertiary)',
                                                            borderRadius: '8px', marginBottom: '4px',
                                                        }}>
                                                            <div className={`file-card__icon ${className}`} style={{ width: 28, height: 28 }}>
                                                                <Icon size={14} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                                    {formatFileSize(file.size)}
                                                                    {file.pageCount > 1 && ` · ${file.pageCount} sayfa`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Notes */}
                                            {job.notes && (
                                                <div style={{
                                                    marginTop: '12px', padding: '10px 12px',
                                                    background: 'rgba(253,203,110,0.06)', border: '1px solid rgba(253,203,110,0.2)',
                                                    borderRadius: '8px',
                                                }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#FDCB6E', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <MessageSquare size={12} /> Müşteri Notu
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{job.notes}</div>
                                                </div>
                                            )}

                                            {/* Finishing */}
                                            {job.finishing && (job.finishing.stapling || job.finishing.punching || job.finishing.binding) && (
                                                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {job.finishing.stapling && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(108,92,231,0.1)', color: '#A29BFE' }}>📎 Zımbalama</span>}
                                                    {job.finishing.punching && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(108,92,231,0.1)', color: '#A29BFE' }}>🕳️ Delme</span>}
                                                    {job.finishing.binding && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(108,92,231,0.1)', color: '#A29BFE' }}>📚 Ciltleme</span>}
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                                                {job.status === 'pending' && (
                                                    <button className="btn btn--primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                                                        onClick={(e) => { e.stopPropagation(); handleApproveAndPrint(job.jobId); }}>
                                                        <Zap size={16} /> ONAYLA & YAZDIR
                                                    </button>
                                                )}
                                                {job.status === 'printing' && (
                                                    <button className="btn btn--primary" style={{ flex: 1, background: '#00B894' }}
                                                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.jobId, 'ready'); }}>
                                                        <CheckCircle size={16} /> Hazır Olarak İşaretle
                                                    </button>
                                                )}
                                                {job.status === 'ready' && (
                                                    <button className="btn btn--secondary" style={{ flex: 1 }}
                                                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.jobId, 'delivered'); }}>
                                                        <Package size={16} /> Teslim Edildi
                                                    </button>
                                                )}
                                                <button className="btn btn--ghost btn--icon"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.jobId); }}
                                                    style={{ opacity: 0.5 }} title="İşi Sil">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick Action Bar for pending (non-expanded) */}
                                    {job.status === 'pending' && !isExpanded && (
                                        <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px' }}>
                                            <button className="btn btn--primary" style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                                                onClick={(e) => { e.stopPropagation(); handleApproveAndPrint(job.jobId); }}>
                                                <Zap size={14} /> ONAYLA & YAZDIR
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

export default JobsView;
