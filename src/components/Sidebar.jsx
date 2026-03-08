import React from 'react';
import {
    LayoutDashboard,
    Printer,
    Users,
    QrCode,
    Settings,
    FolderOpen,
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard },
    { id: 'print', label: 'Yazdır', icon: Printer },
    { id: 'customers', label: 'Müşteriler', icon: Users },
];

function Sidebar({ currentPage, setCurrentPage, fileCount, queueCount, customerCount }) {
    const getBadge = (id) => {
        switch (id) {
            case 'print':
                return fileCount > 0 ? fileCount : null;
            case 'customers':
                return customerCount > 0 ? customerCount : null;
            default:
                return null;
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar__header">
                <div className="sidebar__title">Menü</div>
            </div>

            <nav className="sidebar__nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const badge = getBadge(item.id);
                    return (
                        <div
                            key={item.id}
                            className={`sidebar__nav-item ${currentPage === item.id ? 'sidebar__nav-item--active' : ''
                                }`}
                            onClick={() => setCurrentPage(item.id)}
                        >
                            <Icon className="sidebar__nav-icon" />
                            <span className="sidebar__nav-label">{item.label}</span>
                            {badge !== null && <span className="sidebar__nav-badge">{badge}</span>}
                        </div>
                    );
                })}

                <div className="sidebar__section-divider" />

                <div className="sidebar__nav-item" onClick={() => setCurrentPage('print')}>
                    <QrCode className="sidebar__nav-icon" />
                    <span className="sidebar__nav-label">QR ile Dosya Al</span>
                </div>

                <div className="sidebar__nav-item" onClick={() => setCurrentPage('print')}>
                    <FolderOpen className="sidebar__nav-icon" />
                    <span className="sidebar__nav-label">Dosya Gezgini</span>
                </div>
            </nav>

            {/* Footer: version info */}
            <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
            }}>
                PıthCopy v1.0.0
            </div>
        </aside>
    );
}

export default Sidebar;
