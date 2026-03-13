import React, { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, FileText, DollarSign, Clock, Users, RefreshCw,
} from 'lucide-react';

function StatsView() {
    const [stats, setStats] = useState(null);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        if (window.electronAPI) {
            try {
                const data = await window.electronAPI.getStats();
                setStats(data);
            } catch (e) { console.error(e); }
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const todayStats = stats?.days?.[today] || { jobCount: 0, totalPages: 0, totalRevenue: 0, hourBreakdown: {} };

    // Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayData = stats?.days?.[key] || { jobCount: 0, totalPages: 0, totalRevenue: 0 };
        last7Days.push({ date: key, label: d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }), ...dayData });
    }

    const maxJobs = Math.max(...last7Days.map(d => d.jobCount), 1);

    // Top customers
    const topCustomers = stats?.customers
        ? Object.entries(stats.customers)
            .sort((a, b) => b[1].jobCount - a[1].jobCount)
            .slice(0, 10)
        : [];

    // Peak hours
    const hourData = todayStats.hourBreakdown || {};
    const maxHourJobs = Math.max(...Object.values(hourData), 1);

    return (
        <>
            <div className="main-content__header">
                <div>
                    <h1 className="main-content__title">
                        <BarChart3 size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        İstatistikler
                    </h1>
                    <p className="main-content__subtitle">Günlük ve haftalık iş istatistikleri</p>
                </div>
                <button className="btn btn--secondary" onClick={loadStats}><RefreshCw size={16} /> Yenile</button>
            </div>

            <div className="main-content__body">
                {/* Today's Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'Bugünkü İşler', value: todayStats.jobCount, icon: FileText, color: '#6C5CE7' },
                        { label: 'Toplam Sayfa', value: todayStats.totalPages, icon: TrendingUp, color: '#00B894' },
                        { label: 'Tahmini Gelir', value: `${(todayStats.totalRevenue || 0).toFixed(2)} ₺`, icon: DollarSign, color: '#FDCB6E' },
                    ].map((card, i) => (
                        <div key={i} style={{
                            background: 'var(--color-bg-card)', borderRadius: '16px', padding: '20px',
                            border: '1px solid var(--color-border-light)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '10px',
                                    background: `${card.color}15`, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <card.icon size={18} style={{ color: card.color }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {card.label}
                                </span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{card.value}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Weekly Chart */}
                    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border-light)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                            📊 Son 7 Gün
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
                            {last7Days.map((day, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{day.jobCount}</span>
                                    <div style={{
                                        width: '100%', borderRadius: '6px 6px 0 0',
                                        background: day.date === today ? 'linear-gradient(180deg, #6C5CE7, #A29BFE)' : 'rgba(108,92,231,0.15)',
                                        height: `${Math.max(8, (day.jobCount / maxJobs) * 100)}px`,
                                        transition: 'height 0.3s',
                                    }} />
                                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Customers */}
                    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border-light)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={16} /> En Aktif Müşteriler
                        </h3>
                        {topCustomers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>Henüz veri yok</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {topCustomers.map(([name, data], i) => (
                                    <div key={name} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 10px', background: 'var(--color-bg-tertiary)', borderRadius: '8px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', width: '20px' }}>#{i + 1}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{name}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                            <span>{data.jobCount} iş</span>
                                            <span>{data.totalPages} sayfa</span>
                                            <span style={{ color: '#00B894', fontWeight: 600 }}>{data.totalRevenue?.toFixed(2) || '0.00'} ₺</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Hourly Breakdown */}
                    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border-light)', gridColumn: 'span 2' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} /> Bugünün Saat Dağılımı
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
                            {Array.from({ length: 14 }, (_, i) => i + 8).map((hour) => {
                                const count = hourData[String(hour)] || 0;
                                return (
                                    <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        {count > 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{count}</span>}
                                        <div style={{
                                            width: '100%', borderRadius: '4px 4px 0 0',
                                            background: count > 0 ? 'rgba(0,184,148,0.4)' : 'rgba(255,255,255,0.04)',
                                            height: `${Math.max(4, (count / maxHourJobs) * 60)}px`,
                                        }} />
                                        <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>{hour}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default StatsView;
