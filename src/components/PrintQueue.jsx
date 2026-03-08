import React from 'react';
import { Clock, RotateCcw, Trash2, Check, AlertCircle, Loader } from 'lucide-react';

function getStatusInfo(status) {
    switch (status) {
        case 'waiting':
            return { label: 'Bekliyor', className: 'print-queue__item-status--waiting', Icon: Clock };
        case 'printing':
            return { label: 'Yazdırılıyor', className: 'print-queue__item-status--printing', Icon: Loader };
        case 'done':
            return { label: 'Tamamlandı', className: 'print-queue__item-status--done', Icon: Check };
        case 'error':
            return { label: 'Hata', className: 'print-queue__item-status--error', Icon: AlertCircle };
        default:
            return { label: 'Bilinmiyor', className: '', Icon: Clock };
    }
}

function PrintQueue({ items, onClear }) {
    if (items.length === 0) {
        return (
            <div className="print-queue">
                <div className="print-queue__header">
                    <span className="print-queue__title">Yazdırma Kuyruğu</span>
                </div>
                <div className="empty-state" style={{ padding: '24px' }}>
                    <Clock size={32} style={{ opacity: 0.3 }} />
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        Kuyrukta iş yok
                    </div>
                </div>
            </div>
        );
    }

    const doneCount = items.filter((i) => i.status === 'done').length;

    return (
        <div className="print-queue">
            <div className="print-queue__header">
                <span className="print-queue__title">
                    Yazdırma Kuyruğu ({items.length})
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {doneCount > 0 && (
                        <span style={{
                            fontSize: '11px',
                            color: 'var(--color-success)',
                            background: 'rgba(0, 184, 148, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 600,
                        }}>
                            {doneCount} tamamlandı
                        </span>
                    )}
                    <button
                        className="btn btn--ghost"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={onClear}
                    >
                        <Trash2 size={12} /> Temizle
                    </button>
                </div>
            </div>

            {items.map((item) => {
                const { label, className, Icon } = getStatusInfo(item.status);
                return (
                    <div key={item.queueId} className="print-queue__item">
                        <div className={`print-queue__item-status ${className}`} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: 'var(--color-text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                {label} · {item.copies} kopya
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default PrintQueue;
