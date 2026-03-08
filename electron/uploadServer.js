/**
 * PıthCopy — Local Upload Server
 * 
 * Runs a local HTTP server that serves mobile-friendly file upload pages.
 * Two modes:
 * 1. Customer-specific QR → files go to that customer's folder
 * 2. General QR → uploader enters their name → auto-creates folder
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

let server = null;
let uploadCallback = null;

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// ─── Common styles (shared between both pages) ─────────
const COMMON_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0F0F23 0%, #1A1A35 50%, #252545 100%);
      color: #E8E8F0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    .container { max-width: 420px; width: 100%; }
    .logo { text-align: center; margin-bottom: 24px; padding-top: 16px; }
    .logo h1 {
      font-size: 28px; font-weight: 800;
      background: linear-gradient(135deg, #6C5CE7, #A29BFE);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .logo p { color: #A0A0C0; font-size: 14px; margin-top: 4px; }
    .customer-badge {
      background: rgba(108, 92, 231, 0.15); border: 1px solid rgba(108, 92, 231, 0.3);
      border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: center;
    }
    .customer-badge label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #A0A0C0; }
    .customer-badge .name { font-size: 20px; font-weight: 700; color: #A29BFE; margin-top: 4px; }
    .upload-zone {
      border: 2px dashed rgba(108, 92, 231, 0.3); border-radius: 16px; padding: 36px 20px;
      text-align: center; cursor: pointer; transition: all 0.3s ease;
      background: rgba(26, 26, 53, 0.6); margin-bottom: 20px;
    }
    .upload-zone:active, .upload-zone.dragging { border-color: #6C5CE7; background: rgba(108, 92, 231, 0.08); transform: scale(0.98); }
    .upload-zone svg { width: 44px; height: 44px; color: #6C5CE7; margin-bottom: 12px; }
    .upload-zone h3 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .upload-zone p { font-size: 13px; color: #A0A0C0; }
    .file-input { display: none; }
    .file-list { margin-bottom: 20px; }
    .file-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: rgba(26, 26, 53, 0.8); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; margin-bottom: 6px; animation: slideIn 0.3s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .file-item .icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .file-item .icon.pdf { background: rgba(255,107,107,0.15); color: #FF6B6B; }
    .file-item .icon.doc { background: rgba(116,185,255,0.15); color: #74B9FF; }
    .file-item .icon.xls { background: rgba(0,184,148,0.15); color: #00B894; }
    .file-item .icon.img { background: rgba(253,203,110,0.15); color: #FDCB6E; }
    .file-item .icon.other { background: rgba(162,155,254,0.15); color: #A29BFE; }
    .file-item .info { flex: 1; min-width: 0; }
    .file-item .info .name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-item .info .size { font-size: 11px; color: #A0A0C0; }
    .file-item .status { font-size: 14px; }
    .status.pending { color: #FDCB6E; }
    .status.uploading { color: #74B9FF; animation: pulse 1s infinite; }
    .status.done { color: #00B894; }
    .status.error { color: #FF6B6B; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    .btn {
      width: 100%; padding: 14px; background: linear-gradient(135deg, #6C5CE7, #5A4BD1);
      color: white; border: none; border-radius: 12px; font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
    }
    .btn:active { transform: scale(0.97); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.done { background: linear-gradient(135deg, #00B894, #00A885); box-shadow: 0 4px 15px rgba(0,184,148,0.3); }
    .progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 14px; overflow: hidden; display: none; }
    .progress-bar.active { display: block; }
    .progress-bar .fill { height: 100%; background: linear-gradient(90deg, #6C5CE7, #A29BFE); border-radius: 2px; transition: width 0.3s ease; width: 0%; }
    .success-msg { text-align: center; padding: 36px 20px; display: none; }
    .success-msg.show { display: block; }
    .success-msg .check { width: 60px; height: 60px; border-radius: 50%; background: rgba(0,184,148,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 28px; color: #00B894; }
    .success-msg h2 { font-size: 20px; margin-bottom: 8px; }
    .success-msg p { color: #A0A0C0; font-size: 14px; }
    .name-input {
      width: 100%; padding: 14px 16px; background: rgba(26, 26, 53, 0.8);
      border: 2px solid rgba(108, 92, 231, 0.3); border-radius: 12px;
      color: #E8E8F0; font-family: 'Inter', sans-serif; font-size: 15px;
      outline: none; transition: border-color 0.3s; margin-bottom: 16px;
    }
    .name-input:focus { border-color: #6C5CE7; }
    .name-input::placeholder { color: #6C6C8A; }
`;

// ─── Upload page JS (shared) ───────────────────────────
const UPLOAD_JS = `
    let selectedFiles = [];
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const uploadBtn = document.getElementById('uploadBtn');
    const dropZone = document.getElementById('dropZone');

    fileInput.addEventListener('change', handleFiles);
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragging'); });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault(); dropZone.classList.remove('dragging');
      fileInput.files = e.dataTransfer.files; handleFiles();
    });

    function handleFiles() {
      const newFiles = Array.from(fileInput.files);
      selectedFiles = [...selectedFiles, ...newFiles];
      renderFileList();
      uploadBtn.disabled = selectedFiles.length === 0;
      uploadBtn.textContent = 'Dosyaları Gönder (' + selectedFiles.length + ')';
    }

    function getFileIconClass(name) {
      const ext = name.split('.').pop().toLowerCase();
      if (ext === 'pdf') return 'pdf';
      if (['doc','docx'].includes(ext)) return 'doc';
      if (['xls','xlsx'].includes(ext)) return 'xls';
      if (['png','jpg','jpeg','bmp','tiff'].includes(ext)) return 'img';
      return 'other';
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function renderFileList() {
      fileList.innerHTML = selectedFiles.map((f, i) =>
        '<div class="file-item">' +
        '  <div class="icon ' + getFileIconClass(f.name) + '">' + f.name.split('.').pop().toUpperCase().slice(0,4) + '</div>' +
        '  <div class="info"><div class="name">' + f.name + '</div><div class="size">' + formatSize(f.size) + '</div></div>' +
        '  <div class="status pending" id="status-' + i + '">⏳</div>' +
        '</div>'
      ).join('');
    }

    async function uploadFiles() {
      const customerName = getCustomerName();
      if (!customerName) { alert('Lütfen adınızı girin'); return; }

      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Yükleniyor...';
      const progressBar = document.getElementById('progressBar');
      const progressFill = document.getElementById('progressFill');
      progressBar.classList.add('active');
      let completed = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const statusEl = document.getElementById('status-' + i);
        statusEl.className = 'status uploading'; statusEl.textContent = '⬆';
        try {
          const formData = new FormData();
          formData.append('file', selectedFiles[i]);
          formData.append('customer', customerName);
          formData.append('session', SESSION_ID);
          const res = await fetch('/upload', { method: 'POST', body: formData });
          if (res.ok) { statusEl.className = 'status done'; statusEl.textContent = '✓'; }
          else throw new Error('fail');
        } catch { statusEl.className = 'status error'; statusEl.textContent = '✗'; }
        completed++;
        progressFill.style.width = ((completed / selectedFiles.length) * 100) + '%';
      }
      setTimeout(() => {
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('successMsg').classList.add('show');
      }, 500);
    }

    function resetForm() {
      selectedFiles = [];
      fileList.innerHTML = '';
      fileInput.value = '';
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Dosyaları Gönder';
      document.getElementById('progressBar').classList.remove('active');
      document.getElementById('progressFill').style.width = '0%';
      document.getElementById('uploadArea').style.display = 'block';
      document.getElementById('successMsg').classList.remove('show');
    }
`;

// ─── Customer-specific upload page ─────────────────────
function getCustomerUploadHTML(customerName, sessionId) {
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PıthCopy — ${customerName}</title>
<style>${COMMON_STYLES}</style></head><body>
<div class="container">
  <div class="logo"><h1>PıthCopy</h1><p>Dosya Yükleme</p></div>
  <div class="customer-badge"><label>Müşteri</label><div class="name">${customerName}</div></div>
  <div id="uploadArea">
    <div class="upload-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <h3>Dosyalarınızı Yükleyin</h3><p>Dokunun veya dosyaları sürükleyin</p>
    </div>
    <input type="file" id="fileInput" class="file-input" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.tiff">
    <div class="file-list" id="fileList"></div>
    <div class="progress-bar" id="progressBar"><div class="fill" id="progressFill"></div></div>
    <button class="btn" id="uploadBtn" onclick="uploadFiles()" disabled>Dosyaları Gönder</button>
  </div>
  <div class="success-msg" id="successMsg">
    <div class="check">✓</div><h2>Yükleme Tamamlandı!</h2><p>Dosyalarınız başarıyla gönderildi.</p>
    <button class="btn" style="margin-top:20px;" onclick="resetForm()">Yeni Dosya Yükle</button>
  </div>
</div>
<script>
const SESSION_ID = '${sessionId}';
const CUSTOMER = '${customerName}';
function getCustomerName() { return CUSTOMER; }
${UPLOAD_JS}
</script></body></html>`;
}

// ─── General upload page (asks for name) ───────────────
function getGeneralUploadHTML(sessionId) {
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PıthCopy — Dosya Gönder</title>
<style>${COMMON_STYLES}
.name-step { text-align: center; }
.name-step h2 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.name-step p { font-size: 13px; color: #A0A0C0; margin-bottom: 20px; }
</style></head><body>
<div class="container">
  <div class="logo"><h1>PıthCopy</h1><p>Dosya Gönderme</p></div>

  <!-- Step 1: Enter Name -->
  <div id="nameStep" class="name-step">
    <h2>👋 Hoş Geldiniz</h2>
    <p>Dosyalarınızın doğru kişiye ulaşması için adınızı girin</p>
    <input class="name-input" id="senderName" placeholder="Adınızı yazın..." autofocus>
    <button class="btn" id="continueBtn" onclick="goToUpload()">Devam Et</button>
  </div>

  <!-- Step 2: Upload files -->
  <div id="uploadStep" style="display:none;">
    <div class="customer-badge"><label>Gönderen</label><div class="name" id="displayName"></div></div>
    <div id="uploadArea">
      <div class="upload-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <h3>Dosyalarınızı Yükleyin</h3><p>Dokunun veya dosyaları sürükleyin</p>
      </div>
      <input type="file" id="fileInput" class="file-input" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.tiff">
      <div class="file-list" id="fileList"></div>
      <div class="progress-bar" id="progressBar"><div class="fill" id="progressFill"></div></div>
      <button class="btn" id="uploadBtn" onclick="uploadFiles()" disabled>Dosyaları Gönder</button>
    </div>
    <div class="success-msg" id="successMsg">
      <div class="check">✓</div><h2>Yükleme Tamamlandı!</h2><p>Dosyalarınız başarıyla gönderildi.</p>
      <button class="btn" style="margin-top:20px;" onclick="resetForm()">Yeni Dosya Yükle</button>
    </div>
  </div>
</div>
<script>
const SESSION_ID = '${sessionId}';
let senderNameValue = '';

function getCustomerName() { return senderNameValue; }

function goToUpload() {
  const nameInput = document.getElementById('senderName');
  const name = nameInput.value.trim();
  if (!name) { nameInput.style.borderColor = '#FF6B6B'; nameInput.focus(); return; }
  senderNameValue = name;
  document.getElementById('displayName').textContent = name;
  document.getElementById('nameStep').style.display = 'none';
  document.getElementById('uploadStep').style.display = 'block';
}

document.getElementById('senderName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') goToUpload();
  e.target.style.borderColor = 'rgba(108,92,231,0.3)';
});

${UPLOAD_JS}
</script></body></html>`;
}

// ─── Multipart parser ──────────────────────────────────
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length;
  while (start < buffer.length) {
    let end = buffer.indexOf(boundaryBuffer, start);
    if (end === -1) break;
    const part = buffer.slice(start, end);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = end + boundaryBuffer.length; continue; }
    const headerStr = part.slice(0, headerEnd).toString();
    const body = part.slice(headerEnd + 4, part.length - 2);
    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    if (nameMatch) {
      parts.push({ name: nameMatch[1], filename: filenameMatch ? filenameMatch[1] : null, data: body });
    }
    start = end + boundaryBuffer.length;
  }
  return parts;
}

// ─── Server ────────────────────────────────────────────
function startUploadServer(customerBasePath, onFileUploaded) {
  uploadCallback = onFileUploaded;
  const PORT = 3333;
  const localIP = getLocalIP();

  if (server) { server.close(); }

  server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // ─── General upload page (no customer name) ────
    if (req.method === 'GET' && url.pathname === '/g') {
      const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getGeneralUploadHTML(sessionId));
      return;
    }

    // ─── Customer-specific upload page ─────────────
    if (req.method === 'GET' && url.pathname.startsWith('/upload/')) {
      const parts = url.pathname.split('/');
      const sessionId = parts[2] || '';
      const customerName = decodeURIComponent(parts[3] || 'Müşteri');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getCustomerUploadHTML(customerName, sessionId));
      return;
    }

    // ─── Handle file upload ────────────────────────
    if (req.method === 'POST' && url.pathname === '/upload') {
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No boundary' }));
        return;
      }
      const boundary = boundaryMatch[1];
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const parts = parseMultipart(buffer, boundary);

          let customerName = 'Genel';
          let sessionId = '';
          let fileData = null;
          let fileName = null;

          for (const part of parts) {
            if (part.name === 'customer') customerName = part.data.toString().trim();
            else if (part.name === 'session') sessionId = part.data.toString().trim();
            else if (part.name === 'file' && part.filename) { fileData = part.data; fileName = part.filename; }
          }

          if (fileData && fileName) {
            const customerPath = path.join(customerBasePath, customerName);
            if (!fs.existsSync(customerPath)) fs.mkdirSync(customerPath, { recursive: true });

            let finalName = fileName;
            let counter = 1;
            while (fs.existsSync(path.join(customerPath, finalName))) {
              const ext = path.extname(fileName);
              const base = path.basename(fileName, ext);
              finalName = `${base}_${counter}${ext}`;
              counter++;
            }

            const filePath = path.join(customerPath, finalName);
            fs.writeFileSync(filePath, fileData);

            if (uploadCallback) {
              uploadCallback({ customerName, sessionId, fileName: finalName, filePath, fileSize: fileData.length, ext: path.extname(finalName).toLowerCase() });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, fileName: finalName }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No file' }));
          }
        } catch (err) {
          console.error('Upload error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // ─── Health check ──────────────────────────────
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ip: localIP, port: PORT }));
      return;
    }

    res.writeHead(404); res.end('Not Found');
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PıthCopy Upload Server running at http://${localIP}:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('Port 3333 in use, trying 3334...');
      server.listen(3334, '0.0.0.0');
    }
  });

  return { ip: localIP, port: PORT };
}

function stopUploadServer() {
  if (server) { server.close(); server = null; }
}

function getUploadURL(customerName) {
  const localIP = getLocalIP();
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    url: `http://${localIP}:3333/upload/${sessionId}/${encodeURIComponent(customerName)}`,
    sessionId,
    ip: localIP,
  };
}

function getGeneralUploadURL() {
  const localIP = getLocalIP();
  return {
    url: `http://${localIP}:3333/g`,
    ip: localIP,
  };
}

module.exports = { startUploadServer, stopUploadServer, getUploadURL, getGeneralUploadURL, getLocalIP };
