import React from 'react';
import { Minus, Square, X, Printer } from 'lucide-react';

function TitleBar() {
    const minimize = () => window.electronAPI?.minimizeWindow();
    const maximize = () => window.electronAPI?.maximizeWindow();
    const close = () => window.electronAPI?.closeWindow();

    return (
        <div className="titlebar">
            <div className="titlebar__logo">
                <Printer className="titlebar__logo-icon" />
                <span className="titlebar__logo-text">PıthCopy</span>
            </div>
            <div className="titlebar__controls">
                <button className="titlebar__btn" onClick={minimize} title="Simge Durumuna Küçült">
                    <Minus size={14} />
                </button>
                <button className="titlebar__btn" onClick={maximize} title="Ekranı Kapla">
                    <Square size={11} />
                </button>
                <button className="titlebar__btn titlebar__btn--close" onClick={close} title="Kapat">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}

export default TitleBar;
