import React from 'react';
import {
    Printer,
    FileText,
    Users,
    Clock,
    TrendingUp,
    Zap,
} from 'lucide-react';

function Dashboard({ fileCount, queueCount, customerCount }) {
    const stats = [
        {
            label: 'Mevcut Dosyalar',
            value: fileCount,
            icon: FileText,
            color: '#6C5CE7',
            bg: 'rgba(108, 92, 231, 0.12)',
        },
        {
            label: 'Yazdırma Kuyruğu',
            value: queueCount,
            icon: Clock,
            color: '#FDCB6E',
            bg: 'rgba(253, 203, 110, 0.12)',
        },
        {
            label: 'Müşteriler',
            value: customerCount,
            icon: Users,
            color: '#00D2D3',
            bg: 'rgba(0, 210, 211, 0.12)',
        },
        {
            label: 'Bugün Yazdırılan',
            value: 0,
            icon: Printer,
            color: '#00B894',
            bg: 'rgba(0, 184, 148, 0.12)',
        },
    ];

    return (
        <>
            <div className="main-content__header">
                <div>
                    <h1 className="main-content__title">Gösterge Paneli</h1>
                    <p className="main-content__subtitle">Hoş geldiniz, PıthCopy'ye!</p>
                </div>
            </div>

            <div className="main-content__body">
                {/* Stats Grid */}
                <div className="stats-grid">
                    {stats.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                                <div
                                    className="stat-card__icon"
                                    style={{ background: stat.bg, color: stat.color }}
                                >
                                    <Icon size={18} />
                                </div>
                                <div className="stat-card__value">{stat.value}</div>
                                <div className="stat-card__label">{stat.label}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div style={{ marginTop: '32px' }}>
                    <h2 style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <Zap size={18} style={{ color: 'var(--color-warning)' }} />
                        Hızlı İşlemler
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '12px',
                    }}>
                        {[
                            {
                                icon: Printer,
                                title: 'Hızlı Yazdır',
                                desc: 'Dosyaları sürükle, tek tıkla yazdır',
                                color: '#6C5CE7',
                                bg: 'rgba(108, 92, 231, 0.08)',
                            },
                            {
                                icon: Users,
                                title: 'Yeni Müşteri',
                                desc: 'Müşteri klasörü oluştur',
                                color: '#00D2D3',
                                bg: 'rgba(0, 210, 211, 0.08)',
                            },
                            {
                                icon: TrendingUp,
                                title: 'Günlük Rapor',
                                desc: 'Bugünün yazdırma istatistikleri',
                                color: '#00B894',
                                bg: 'rgba(0, 184, 148, 0.08)',
                            },
                        ].map((action, i) => {
                            const ActionIcon = action.icon;
                            return (
                                <div
                                    key={i}
                                    className="animate-fade-in"
                                    style={{
                                        animationDelay: `${(i + 4) * 100}ms`,
                                        background: action.bg,
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        borderRadius: '14px',
                                        padding: '20px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = `0 8px 24px ${action.bg}`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <ActionIcon size={24} style={{ color: action.color, marginBottom: '12px' }} />
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: 'var(--color-text-primary)',
                                        marginBottom: '4px',
                                    }}>
                                        {action.title}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--color-text-muted)',
                                    }}>
                                        {action.desc}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

export default Dashboard;
