/**
 * PıthCopy — Mobile Upload Page Styles
 * Shared CSS for customer-specific and general upload pages
 */

const MOBILE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #0F0F23 0%, #1A1A35 50%, #252545 100%);
  color: #E8E8F0; min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; padding: 16px;
}
.container { max-width: 440px; width: 100%; }
.logo { text-align: center; margin-bottom: 20px; padding-top: 12px; }
.logo h1 {
  font-size: 26px; font-weight: 800;
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.logo p { color: #A0A0C0; font-size: 13px; margin-top: 2px; }

/* Customer Badge */
.customer-badge {
  background: rgba(108,92,231,0.12); border: 1px solid rgba(108,92,231,0.25);
  border-radius: 14px; padding: 14px; margin-bottom: 16px; text-align: center;
}
.customer-badge label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #A0A0C0; }
.customer-badge .name { font-size: 18px; font-weight: 700; color: #A29BFE; margin-top: 2px; }
.customer-badge .queue-num {
  display: inline-block; margin-top: 8px; background: rgba(0,184,148,0.15);
  border: 1px solid rgba(0,184,148,0.3); border-radius: 8px; padding: 4px 14px;
  font-size: 13px; font-weight: 700; color: #00B894;
}

/* Upload Zone */
.upload-zone {
  border: 2px dashed rgba(108,92,231,0.3); border-radius: 16px; padding: 28px 16px;
  text-align: center; cursor: pointer; transition: all 0.3s ease;
  background: rgba(26,26,53,0.6); margin-bottom: 16px;
}
.upload-zone:active, .upload-zone.dragging { border-color: #6C5CE7; background: rgba(108,92,231,0.08); transform: scale(0.98); }
.upload-zone svg { width: 40px; height: 40px; color: #6C5CE7; margin-bottom: 10px; }
.upload-zone h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.upload-zone p { font-size: 12px; color: #A0A0C0; }
.file-input { display: none; }

/* File List */
.file-list { margin-bottom: 16px; }
.file-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: rgba(26,26,53,0.8); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; margin-bottom: 6px; animation: slideIn 0.3s ease;
  position: relative;
}
.file-item .remove-btn {
  position: absolute; top: -6px; right: -6px; width: 22px; height: 22px;
  background: #FF6B6B; border: 2px solid #1A1A35; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 12px; font-weight: 700; color: white; line-height: 1;
}
@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.file-item .icon {
  width: 34px; height: 34px; border-radius: 8px; display: flex;
  align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0;
}
.file-item .icon.pdf { background: rgba(255,107,107,0.15); color: #FF6B6B; }
.file-item .icon.doc { background: rgba(116,185,255,0.15); color: #74B9FF; }
.file-item .icon.xls { background: rgba(0,184,148,0.15); color: #00B894; }
.file-item .icon.img { background: rgba(253,203,110,0.15); color: #FDCB6E; }
.file-item .icon.other { background: rgba(162,155,254,0.15); color: #A29BFE; }
.file-item .info { flex: 1; min-width: 0; }
.file-item .info .name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-item .info .size { font-size: 11px; color: #A0A0C0; }
.file-item .status { font-size: 14px; }
.status.pending { color: #FDCB6E; }
.status.uploading { color: #74B9FF; animation: pulse 1s infinite; }
.status.done { color: #00B894; }
.status.error { color: #FF6B6B; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

/* Settings Panel */
.settings-panel {
  background: rgba(26,26,53,0.8); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 16px; margin-bottom: 16px;
}
.settings-panel h3 {
  font-size: 14px; font-weight: 700; margin-bottom: 12px;
  display: flex; align-items: center; gap: 8px;
}
.settings-panel h3 svg { width: 18px; height: 18px; color: #6C5CE7; }
.setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.setting-row:last-child { border-bottom: none; }
.setting-row label { font-size: 13px; font-weight: 500; color: #C0C0D0; }
.setting-row .control { display: flex; align-items: center; gap: 8px; }

/* Stepper */
.stepper { display: flex; align-items: center; gap: 0; }
.stepper button {
  width: 32px; height: 32px; border: 1px solid rgba(108,92,231,0.3);
  background: rgba(108,92,231,0.1); color: #A29BFE; border-radius: 8px;
  font-size: 16px; font-weight: 700; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
}
.stepper button:active { background: rgba(108,92,231,0.3); }
.stepper .value {
  width: 40px; text-align: center; font-size: 15px; font-weight: 700; color: #E8E8F0;
}

/* Toggle */
.toggle { width: 44px; height: 24px; border-radius: 12px; background: rgba(255,255,255,0.1); cursor: pointer; position: relative; transition: background 0.3s; }
.toggle.active { background: #6C5CE7; }
.toggle .knob {
  width: 20px; height: 20px; border-radius: 50%; background: white;
  position: absolute; top: 2px; left: 2px; transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.toggle.active .knob { transform: translateX(20px); }

/* Select */
.custom-select {
  background: rgba(108,92,231,0.1); border: 1px solid rgba(108,92,231,0.3);
  color: #E8E8F0; border-radius: 8px; padding: 6px 10px; font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600; outline: none; cursor: pointer;
  -webkit-appearance: none; appearance: none;
}

/* Segmented Control */
.segmented { display: flex; background: rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; }
.segmented button {
  flex: 1; padding: 6px 12px; border: none; background: transparent;
  color: #A0A0C0; font-family: 'Inter', sans-serif; font-size: 12px;
  font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.segmented button.active { background: #6C5CE7; color: white; }

/* Page Range */
.page-range {
  display: flex; align-items: center; gap: 8px; margin-top: 8px;
}
.page-range input {
  width: 60px; padding: 6px 8px; background: rgba(108,92,231,0.1);
  border: 1px solid rgba(108,92,231,0.3); border-radius: 8px;
  color: #E8E8F0; font-family: 'Inter', sans-serif; font-size: 13px;
  font-weight: 600; text-align: center; outline: none;
}
.page-range input:focus { border-color: #6C5CE7; }
.page-range span { font-size: 12px; color: #A0A0C0; }

/* Notes */
.notes-area {
  width: 100%; padding: 10px 12px; background: rgba(26,26,53,0.8);
  border: 1px solid rgba(108,92,231,0.2); border-radius: 10px; color: #E8E8F0;
  font-family: 'Inter', sans-serif; font-size: 13px; outline: none;
  resize: vertical; min-height: 60px; margin-bottom: 16px;
}
.notes-area:focus { border-color: #6C5CE7; }
.notes-area::placeholder { color: #6C6C8A; }

/* Finishing Options */
.finishing-panel {
  background: rgba(26,26,53,0.6); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 12px; margin-bottom: 16px;
}
.finishing-panel h4 { font-size: 12px; font-weight: 600; color: #A0A0C0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
.finishing-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0;
}
.finishing-row label { font-size: 13px; color: #C0C0D0; display: flex; align-items: center; gap: 6px; }
.finishing-row .price { font-size: 11px; color: #A0A0C0; }

/* Price Display */
.price-display {
  background: linear-gradient(135deg, rgba(0,184,148,0.1), rgba(0,210,211,0.1));
  border: 1px solid rgba(0,184,148,0.25); border-radius: 14px;
  padding: 14px; margin-bottom: 16px; text-align: center;
}
.price-display .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #A0A0C0; }
.price-display .amount { font-size: 28px; font-weight: 800; color: #00B894; margin-top: 4px; }
.price-display .detail { font-size: 11px; color: #A0A0C0; margin-top: 4px; }

/* Button */
.btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, #6C5CE7, #5A4BD1);
  color: white; border: none; border-radius: 12px; font-family: 'Inter', sans-serif;
  font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(108,92,231,0.3);
}
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.done { background: linear-gradient(135deg, #00B894, #00A885); box-shadow: 0 4px 15px rgba(0,184,148,0.3); }
.btn.secondary { background: rgba(108,92,231,0.15); box-shadow: none; border: 1px solid rgba(108,92,231,0.3); }

/* Progress */
.progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 14px; overflow: hidden; display: none; }
.progress-bar.active { display: block; }
.progress-bar .fill { height: 100%; background: linear-gradient(90deg, #6C5CE7, #A29BFE); border-radius: 2px; transition: width 0.3s ease; width: 0%; }

/* Success */
.success-msg { text-align: center; padding: 28px 16px; display: none; }
.success-msg.show { display: block; }
.success-msg .check {
  width: 56px; height: 56px; border-radius: 50%; background: rgba(0,184,148,0.15);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px; font-size: 26px; color: #00B894;
}
.success-msg h2 { font-size: 18px; margin-bottom: 6px; }
.success-msg p { color: #A0A0C0; font-size: 13px; }

/* Status Tracker */
.status-tracker {
  background: rgba(26,26,53,0.8); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 16px; margin-top: 16px;
}
.status-tracker h3 { font-size: 14px; font-weight: 700; margin-bottom: 14px; text-align: center; }
.status-steps { display: flex; justify-content: space-between; position: relative; }
.status-steps::before {
  content: ''; position: absolute; top: 16px; left: 20%; right: 20%;
  height: 3px; background: rgba(255,255,255,0.1); z-index: 0;
}
.status-step { text-align: center; z-index: 1; flex: 1; }
.status-step .dot {
  width: 34px; height: 34px; border-radius: 50%; margin: 0 auto 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; transition: all 0.3s;
}
.status-step .dot.inactive { background: rgba(255,255,255,0.08); color: #6C6C8A; }
.status-step .dot.active { background: #6C5CE7; color: white; animation: pulse 2s infinite; }
.status-step .dot.ready { background: #00B894; color: white; box-shadow: 0 0 16px rgba(0,184,148,0.5); transform: scale(1.1); animation: none; }
.status-step .dot.completed { background: #00B894; color: white; }
.status-step .label { font-size: 10px; font-weight: 600; color: #A0A0C0; }
.status-step .label.active { color: #A29BFE; }
.status-step .label.ready { color: #00B894; font-weight: 700; }
.status-step .label.completed { color: #00B894; }

/* Name Input */
.name-input {
  width: 100%; padding: 14px 16px; background: rgba(26,26,53,0.8);
  border: 2px solid rgba(108,92,231,0.3); border-radius: 12px;
  color: #E8E8F0; font-family: 'Inter', sans-serif; font-size: 15px;
  outline: none; transition: border-color 0.3s; margin-bottom: 16px;
}
.name-input:focus { border-color: #6C5CE7; }
.name-input::placeholder { color: #6C6C8A; }
.name-step { text-align: center; }
.name-step h2 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.name-step p { font-size: 13px; color: #A0A0C0; margin-bottom: 20px; }

/* Thumbnail */
.thumb-preview { width: 34px; height: 34px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }

/* Rotate button */
.rotate-btn {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: #A0A0C0; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.rotate-btn:active { background: rgba(108,92,231,0.2); }

/* Per-file settings toggle */
.file-settings-toggle {
  font-size: 11px; color: #6C5CE7; cursor: pointer; text-decoration: underline;
  margin-top: 2px;
}
.per-file-settings {
  padding: 8px 10px; margin: 6px 0; background: rgba(108,92,231,0.06);
  border: 1px solid rgba(108,92,231,0.15); border-radius: 8px;
  display: none;
}
.per-file-settings.show { display: block; }
.per-file-settings .mini-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 0; font-size: 12px;
}
.per-file-settings .mini-row label { color: #A0A0C0; }
`;

module.exports = { MOBILE_STYLES };
