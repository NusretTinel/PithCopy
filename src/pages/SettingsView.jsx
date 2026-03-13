import React, { useState, useEffect } from 'react';
import {
    Settings, DollarSign, Users, Trash2, Save, RefreshCw,
    Shield, Clock, UserCheck, Key, X, Plus,
} from 'lucide-react';

function SettingsView() {
    const [priceConfig, setPriceConfig] = useState(null);
    const [profiles, setProfiles] = useState({});
    const [notification, setNotification] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileSettings, setNewProfileSettings] = useState({
        copies: 1, color: true, paperSize: 'A4', orientation: 'portrait', duplex: false,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (window.electronAPI) {
            try {
                const pc = await window.electronAPI.getPriceConfig();
                setPriceConfig(pc);
                const pr = await window.electronAPI.getAllProfiles();
                setProfiles(pr || {});
            } catch (e) { console.error(e); }
        }
    };

    const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

    const handleSavePrice = async () => {
        if (window.electronAPI && priceConfig) {
            await window.electronAPI.updatePriceConfig(priceConfig);
            showNotif('✅ Fiyatlar kaydedildi');
        }
    };

    const handleCleanup = async () => {
        if (window.electronAPI) {
            const result = await window.electronAPI.runCleanup(7);
            showNotif(`🗑️ ${result.cleaned} eski dosya temizlendi`);
        }
    };

    const handleSaveProfile = async () => {
        if (!newProfileName.trim()) return;
        if (window.electronAPI) {
            await window.electronAPI.saveProfile(newProfileName.trim(), newProfileSettings);
            showNotif(`✅ "${newProfileName}" profili kaydedildi`);
            setShowProfileModal(false);
            setNewProfileName('');
            loadData();
        }
    };

    const handleDeleteProfile = async (name) => {
        if (window.electronAPI) {
            await window.electronAPI.deleteProfile(name);
            showNotif(`🗑️ "${name}" profili silindi`);
            loadData();
        }
    };

    const updatePrice = (key, value) => {
        setPriceConfig(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    };

    if (!priceConfig) return <div className="empty-state"><RefreshCw className="empty-state__icon" style={{ animation: 'pulse 1s infinite' }} /><div>Yükleniyor...</div></div>;

    const priceFields = [
        { key: 'perPageBW_A4', label: 'Siyah-Beyaz A4 (sayfa)' },
        { key: 'perPageColor_A4', label: 'Renkli A4 (sayfa)' },
        { key: 'perPageBW_A3', label: 'Siyah-Beyaz A3 (sayfa)' },
        { key: 'perPageColor_A3', label: 'Renkli A3 (sayfa)' },
        { key: 'perPageBW_A5', label: 'Siyah-Beyaz A5 (sayfa)' },
        { key: 'perPageColor_A5', label: 'Renkli A5 (sayfa)' },
        { key: 'stapling', label: 'Zımbalama' },
        { key: 'punching', label: 'Delme' },
        { key: 'binding', label: 'Ciltleme' },
    ];

    return (
        <>
            <div className="main-content__header">
                <div>
                    <h1 className="main-content__title">
                        <Settings size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        Ayarlar
                    </h1>
                    <p className="main-content__subtitle">Fiyatlar, müşteri profilleri ve sistem ayarları</p>
                </div>
            </div>

            {notification && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', top: '52px', right: '24px', background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-primary)', borderRadius: '12px', padding: '12px 20px',
                    zIndex: 9999, boxShadow: '0 8px 32px rgba(108,92,231,0.3)', fontSize: '13px', fontWeight: 600,
                }}>{notification}</div>
            )}

            <div className="main-content__body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Price Config */}
                    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <DollarSign size={18} style={{ color: '#00B894' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Fiyatlandırma</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {priceFields.map(({ key, label }) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input type="number" step="0.25" min="0"
                                            value={priceConfig[key] || 0}
                                            onChange={(e) => updatePrice(key, e.target.value)}
                                            style={{
                                                width: '80px', padding: '6px 8px', background: 'var(--color-bg-tertiary)',
                                                border: '1px solid var(--color-border-light)', borderRadius: '8px',
                                                color: 'var(--color-text-primary)', fontSize: '13px', textAlign: 'right',
                                                fontWeight: 600, outline: 'none',
                                            }} />
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>₺</span>
                                    </div>
                                </div>
                            ))}
                            {/* Duplex discount */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Çift Taraflı İndirimi</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="number" step="0.05" min="0" max="1"
                                        value={priceConfig.duplexDiscount || 0}
                                        onChange={(e) => updatePrice('duplexDiscount', e.target.value)}
                                        style={{
                                            width: '80px', padding: '6px 8px', background: 'var(--color-bg-tertiary)',
                                            border: '1px solid var(--color-border-light)', borderRadius: '8px',
                                            color: 'var(--color-text-primary)', fontSize: '13px', textAlign: 'right',
                                            fontWeight: 600, outline: 'none',
                                        }} />
                                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>%</span>
                                </div>
                            </div>
                        </div>
                        <button className="btn btn--primary" onClick={handleSavePrice} style={{ width: '100%', marginTop: '16px', padding: '10px' }}>
                            <Save size={14} /> Fiyatları Kaydet
                        </button>
                    </div>

                    {/* Customer Profiles */}
                    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserCheck size={18} style={{ color: '#6C5CE7' }} />
                                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Müşteri Profilleri</h2>
                            </div>
                            <button className="btn btn--secondary" onClick={() => setShowProfileModal(true)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                <Plus size={14} /> Yeni Profil
                            </button>
                        </div>
                        {Object.keys(profiles).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                                Henüz profil yok. Düzenli müşterileriniz için varsayılan ayarlar belirleyin.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {Object.entries(profiles).map(([name, profile]) => (
                                    <div key={name} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', background: 'var(--color-bg-tertiary)', borderRadius: '10px',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                {profile.color !== false ? 'Renkli' : 'SB'} · {profile.paperSize || 'A4'} · {profile.copies || 1} kopya
                                                {profile.duplex && ' · Çift taraflı'}
                                            </div>
                                        </div>
                                        <button className="btn btn--ghost btn--icon" onClick={() => handleDeleteProfile(name)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* System Tools */}
                    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border-light)', gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Shield size={18} style={{ color: '#FF6B6B' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Sistem Araçları</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn--secondary" onClick={handleCleanup} style={{ padding: '10px 16px' }}>
                                <Trash2 size={14} /> Eski Dosyaları Temizle (7+ gün)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 className="modal__title" style={{ margin: 0 }}>Yeni Müşteri Profili</h2>
                            <button className="btn btn--ghost btn--icon" onClick={() => setShowProfileModal(false)}><X size={18} /></button>
                        </div>
                        <input className="modal__input" placeholder="Müşteri adı..." value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)} autoFocus />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '13px' }}>Kopya</label>
                                <input type="number" min="1" value={newProfileSettings.copies}
                                    onChange={(e) => setNewProfileSettings(p => ({ ...p, copies: parseInt(e.target.value) || 1 }))}
                                    style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-border-light)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', textAlign: 'center' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '13px' }}>Kağıt</label>
                                <select value={newProfileSettings.paperSize} onChange={(e) => setNewProfileSettings(p => ({ ...p, paperSize: e.target.value }))}
                                    className="print-settings__select" style={{ width: '100px' }}>
                                    <option value="A4">A4</option><option value="A3">A3</option><option value="A5">A5</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '13px' }}>Renkli</label>
                                <div className={`toggle-switch ${newProfileSettings.color ? 'toggle-switch--active' : ''}`}
                                    onClick={() => setNewProfileSettings(p => ({ ...p, color: !p.color }))}>
                                    <div className="toggle-switch__knob" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '13px' }}>Çift Taraflı</label>
                                <div className={`toggle-switch ${newProfileSettings.duplex ? 'toggle-switch--active' : ''}`}
                                    onClick={() => setNewProfileSettings(p => ({ ...p, duplex: !p.duplex }))}>
                                    <div className="toggle-switch__knob" />
                                </div>
                            </div>
                        </div>
                        <div className="modal__actions" style={{ marginTop: '20px' }}>
                            <button className="btn btn--secondary" onClick={() => setShowProfileModal(false)}>İptal</button>
                            <button className="btn btn--primary" onClick={handleSaveProfile} disabled={!newProfileName.trim()}>
                                <Save size={14} /> Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default SettingsView;
