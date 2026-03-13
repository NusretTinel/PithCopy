import React from 'react';
import {
    LayoutDashboard, Printer, Users, ClipboardList,
    BarChart3, Settings,
} from 'lucide-react';

const navItems = [
    { id: 'jobs', label: 'Bekleyen İşler', icon: ClipboardList, countKey: 'pendingJobCount' },
    { id: 'print', label: 'Yazdır', icon: Printer, countKey: 'fileCount' },
    { id: 'customers', label: 'Müşteriler', icon: Users, countKey: 'customerCount' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stats', label: 'İstatistikler', icon: BarChart3 },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
];

function Sidebar({ currentPage, setCurrentPage, fileCount, queueCount, customerCount, pendingJobCount }) {
    const counts = { fileCount, queueCount, customerCount, pendingJobCount };

    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <div className="sidebar__brand-icon">P</div>
                <span className="sidebar__brand-name">PıthCopy</span>
            </div>

            <nav className="sidebar__nav">
                {navItems.map((item) => {
                    const isActive = currentPage === item.id;
                    const count = item.countKey ? counts[item.countKey] : null;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
                            onClick={() => setCurrentPage(item.id)}
                        >
                            <Icon size={18} className="sidebar__nav-icon" />
                            <span className="sidebar__nav-label">{item.label}</span>
                            {count > 0 && (
                                <span className={`sidebar__nav-badge ${item.id === 'jobs' && count > 0 ? 'sidebar__nav-badge--alert' : ''}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar__footer">
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px' }}>
                    PıthCopy v2.0
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
