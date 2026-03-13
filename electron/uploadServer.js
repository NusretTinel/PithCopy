/**
 * PıthCopy — Local Upload Server (Enhanced)
 * Full self-service system with job management, SSE, price API, and rich mobile pages.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');
const { MOBILE_STYLES } = require('./mobilePageStyles');
const { MOBILE_JS } = require('./mobilePageScript');

let server = null;
let uploadCallback = null;
let jobStoreRef = null; // reference to jobStore module

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

// ─── HTML Templates ──────────────────────────────────────────
function getSettingsHTML() {
  return `
  <!-- Print Settings -->
  <div class="settings-panel">
    <h3>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      Yazdırma Ayarları
    </h3>

    <!-- Copies -->
    <div class="setting-row">
      <label>Kopya Sayısı</label>
      <div class="stepper">
        <button onclick="setCopies(globalSettings.copies-1)">−</button>
        <div class="value" id="copiesVal">1</div>
        <button onclick="setCopies(globalSettings.copies+1)">+</button>
      </div>
    </div>

    <!-- Color -->
    <div class="setting-row">
      <label><span id="colorLabel">Renkli</span></label>
      <div class="toggle active" id="colorToggle" onclick="toggleColor()"><div class="knob"></div></div>
    </div>

    <!-- Paper Size -->
    <div class="setting-row">
      <label>Kağıt Boyutu</label>
      <select class="custom-select" onchange="setPaperSize(this.value)">
        <option value="A4">A4</option>
        <option value="A3">A3</option>
        <option value="A5">A5</option>
        <option value="Letter">Letter</option>
      </select>
    </div>

    <!-- Orientation -->
    <div class="setting-row">
      <label>Yön</label>
      <div class="segmented">
        <button class="orient-btn active" data-val="portrait" onclick="setOrientation('portrait')">Dikey</button>
        <button class="orient-btn" data-val="landscape" onclick="setOrientation('landscape')">Yatay</button>
      </div>
    </div>

    <!-- Duplex -->
    <div class="setting-row">
      <label>Çift Taraflı</label>
      <div class="toggle" id="duplexToggle" onclick="toggleDuplex()"><div class="knob"></div></div>
    </div>

    <!-- Page Range -->
    <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <label>Sayfa Aralığı</label>
        <div class="segmented">
          <button class="range-btn active" data-val="all" onclick="setPageRangeType('all')">Tümü</button>
          <button class="range-btn" data-val="range" onclick="setPageRangeType('range')">Aralık</button>
        </div>
      </div>
      <div class="page-range" id="pageRangeInputs" style="display:none;">
        <input type="number" placeholder="İlk" min="1" value="1" onchange="setPageFrom(this.value)" onfocus="this.select()">
        <span>—</span>
        <input type="number" placeholder="Son" min="1" value="1" onchange="setPageTo(this.value)" onfocus="this.select()">
        <span style="font-size:11px;color:#A0A0C0;">sayfa</span>
      </div>
    </div>
  </div>

  <!-- Finishing Options -->
  <div class="finishing-panel">
    <h4>Tamamlama Seçenekleri</h4>
    <div class="finishing-row">
      <label>📎 Zımbalama</label>
      <div class="toggle" id="finish-stapling" onclick="toggleFinishing('stapling')"><div class="knob"></div></div>
    </div>
    <div class="finishing-row">
      <label>🕳️ Delme</label>
      <div class="toggle" id="finish-punching" onclick="toggleFinishing('punching')"><div class="knob"></div></div>
    </div>
    <div class="finishing-row">
      <label>📚 Ciltleme</label>
      <div class="toggle" id="finish-binding" onclick="toggleFinishing('binding')"><div class="knob"></div></div>
    </div>
  </div>

  <!-- Notes -->
  <textarea class="notes-area" id="notesInput" placeholder="Özel talimatlarınız... (ör: sadece 3-7. sayfalar, arka arkaya basın, vs.)"></textarea>

  <!-- Price Estimate -->
  <div class="price-display">
    <div class="label">Tahmini Ücret</div>
    <div class="amount" id="priceAmount">—</div>
    <div class="detail" id="priceDetail"></div>
  </div>`;
}

function getStatusTrackerHTML() {
  return `
  <div class="status-tracker" id="statusTracker" style="display:none;">
    <h3>📋 İş Durumu</h3>
    <div class="status-steps">
      <div class="status-step">
        <div class="dot active" id="dot-pending">⏳</div>
        <div class="label active" id="lbl-pending">Bekliyor</div>
      </div>
      <div class="status-step">
        <div class="dot inactive" id="dot-approved">✓</div>
        <div class="label" id="lbl-approved">Onaylandı</div>
      </div>
      <div class="status-step">
        <div class="dot inactive" id="dot-printing">🖨</div>
        <div class="label" id="lbl-printing">Yazdırılıyor</div>
      </div>
      <div class="status-step">
        <div class="dot inactive" id="dot-ready">✅</div>
        <div class="label" id="lbl-ready">Hazır</div>
      </div>
    </div>
    <div id="readyMessage" style="display:none;text-align:center;margin-top:16px;padding:12px;background:rgba(0,184,148,0.12);border-radius:10px;">
      <div style="font-size:24px;margin-bottom:6px;">🎉</div>
      <div style="font-size:14px;font-weight:700;color:#00B894;">Dosyanız hazır!</div>
      <div style="font-size:12px;color:#A0A0C0;margin-top:4px;">Tezgahtan teslim alabilirsiniz</div>
    </div>
  </div>`;
}

// ─── Customer-specific upload page ──────────────────────────
function getCustomerUploadHTML(customerName, sessionId) {
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PıthCopy — ${customerName}</title>
<style>${MOBILE_STYLES}</style></head><body>
<div class="container">
  <div class="logo"><h1>PıthCopy</h1><p>Dosya Yükleme</p></div>
  <div class="customer-badge"><label>Müşteri</label><div class="name">${customerName}</div></div>
  <div id="uploadArea">
    <div class="upload-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <h3>Dosyalarınızı Yükleyin</h3><p>Dokunun veya dosyaları sürükleyin</p>
    </div>
    <input type="file" id="fileInput" class="file-input" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.tiff,.ppt,.pptx">
    <div class="file-list" id="fileList"></div>
    ${getSettingsHTML()}
    <div class="progress-bar" id="progressBar"><div class="fill" id="progressFill"></div></div>
    <button class="btn" id="uploadBtn" onclick="uploadFiles()" disabled>Dosyaları Gönder</button>
  </div>
  <div class="success-msg" id="successMsg">
    <div class="check">✓</div>
    <h2>Yükleme Tamamlandı!</h2>
    <p>Dosyalarınız başarıyla gönderildi.</p>
    <div class="customer-badge" style="margin-top:12px;"><label>Sıra Numaranız</label><div class="name" id="queueNumDisplay">—</div></div>
    ${getStatusTrackerHTML()}
    <button class="btn secondary" style="margin-top:16px;" onclick="resetForm()">Yeni Dosya Yükle</button>
  </div>
</div>
<script>
const SESSION_ID = '${sessionId}';
const CUSTOMER = '${customerName}';
function getCustomerName() { return CUSTOMER; }
${MOBILE_JS}
</script></body></html>`;
}

// ─── General upload page ────────────────────────────────────
function getGeneralUploadHTML(sessionId) {
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PıthCopy — Dosya Gönder</title>
<style>${MOBILE_STYLES}</style></head><body>
<div class="container">
  <div class="logo"><h1>PıthCopy</h1><p>Dosya Gönderme</p></div>
  <div id="nameStep" class="name-step">
    <h2>👋 Hoş Geldiniz</h2>
    <p>Dosyalarınızın doğru kişiye ulaşması için adınızı girin</p>
    <input class="name-input" id="senderName" placeholder="Adınızı yazın..." autofocus>
    <button class="btn" id="continueBtn" onclick="goToUpload()">Devam Et</button>
  </div>
  <div id="uploadStep" style="display:none;">
    <div class="customer-badge"><label>Gönderen</label><div class="name" id="displayName"></div></div>
    <div id="uploadArea">
      <div class="upload-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <h3>Dosyalarınızı Yükleyin</h3><p>Dokunun veya dosyaları sürükleyin</p>
      </div>
      <input type="file" id="fileInput" class="file-input" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.tiff,.ppt,.pptx">
      <div class="file-list" id="fileList"></div>
      ${getSettingsHTML()}
      <div class="progress-bar" id="progressBar"><div class="fill" id="progressFill"></div></div>
      <button class="btn" id="uploadBtn" onclick="uploadFiles()" disabled>Dosyaları Gönder</button>
    </div>
    <div class="success-msg" id="successMsg">
      <div class="check">✓</div>
      <h2>Yükleme Tamamlandı!</h2>
      <p>Dosyalarınız başarıyla gönderildi.</p>
      <div class="customer-badge" style="margin-top:12px;"><label>Sıra Numaranız</label><div class="name" id="queueNumDisplay">—</div></div>
      ${getStatusTrackerHTML()}
      <button class="btn secondary" style="margin-top:16px;" onclick="resetForm()">Yeni Dosya Yükle</button>
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
${MOBILE_JS}
</script></body></html>`;
}

// ─── Access code page ───────────────────────────────────────
function getAccessCodePageHTML() {
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PıthCopy — Erişim Kodu</title>
<style>${MOBILE_STYLES}</style></head><body>
<div class="container">
  <div class="logo"><h1>PıthCopy</h1><p>Hızlı Erişim</p></div>
  <div class="name-step">
    <h2>🔑 Erişim Kodu</h2>
    <p>Tezgahtan aldığınız 4 haneli kodu girin</p>
    <input class="name-input" id="accessCode" placeholder="Kodu girin..." maxlength="4" style="text-align:center;font-size:24px;letter-spacing:8px;" autofocus>
    <button class="btn" onclick="submitCode()">Giriş</button>
    <p id="codeError" style="color:#FF6B6B;margin-top:12px;display:none;font-size:13px;">Geçersiz kod. Lütfen tekrar deneyin.</p>
  </div>
</div>
<script>
document.getElementById('accessCode').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitCode();
});
async function submitCode() {
  const code = document.getElementById('accessCode').value.trim();
  if (code.length !== 4) return;
  try {
    const res = await fetch('/api/access-code/' + code);
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.redirectUrl;
    } else {
      document.getElementById('codeError').style.display = 'block';
    }
  } catch(e) { document.getElementById('codeError').style.display = 'block'; }
}
</script></body></html>`;
}

// ─── Status check page ──────────────────────────────────────
function getStatusCheckPageHTML() {
  return `<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>PıthCopy — Durum Sorgula</title>
<style>${MOBILE_STYLES}</style></head><body>
<div class="container">
  <div class="logo"><h1>PıthCopy</h1><p>İş Durumu Sorgulama</p></div>
  <div class="name-step">
    <h2>📋 Sıra Numarası</h2>
    <p>Sıra numaranızı girin (ör: 042)</p>
    <input class="name-input" id="queueInput" placeholder="Sıra numarası..." maxlength="3" style="text-align:center;font-size:24px;letter-spacing:4px;" autofocus>
    <button class="btn" onclick="checkStatus()">Sorgula</button>
    <div id="statusResult" style="display:none;margin-top:20px;"></div>
  </div>
</div>
<script>
document.getElementById('queueInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkStatus(); });
async function checkStatus() {
  const qn = document.getElementById('queueInput').value.trim();
  if (!qn) return;
  try {
    const res = await fetch('/api/job-status/' + qn);
    if (res.ok) {
      const job = await res.json();
      const statusLabels = { pending:'⏳ Bekliyor', approved:'✓ Onaylandı', printing:'🖨 Yazdırılıyor', ready:'✅ Hazır!', delivered:'📦 Teslim Edildi' };
      document.getElementById('statusResult').style.display = 'block';
      document.getElementById('statusResult').innerHTML =
        '<div class="customer-badge"><label>Sıra #' + job.queueNumber + ' — ' + job.customerName + '</label>' +
        '<div class="name" style="font-size:16px;">' + (statusLabels[job.status] || job.status) + '</div>' +
        '<div style="font-size:12px;color:#A0A0C0;margin-top:4px;">' + job.files.length + ' dosya</div></div>';
    } else {
      document.getElementById('statusResult').style.display = 'block';
      document.getElementById('statusResult').innerHTML = '<p style="color:#FF6B6B;text-align:center;">Bu numarada iş bulunamadı.</p>';
    }
  } catch(e) {
    document.getElementById('statusResult').style.display = 'block';
    document.getElementById('statusResult').innerHTML = '<p style="color:#FF6B6B;text-align:center;">Bağlantı hatası.</p>';
  }
}
</script></body></html>`;
}

// ─── Multipart parser ───────────────────────────────────────
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

// ─── PDF page count util ────────────────────────────────────
function getPDFPageCount(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('latin1');
    const matches = content.match(/\/Type[\s]*\/Page[^s]/g);
    return matches ? matches.length : 1;
  } catch (e) { return 1; }
}

// ─── Server ─────────────────────────────────────────────────
function startUploadServer(customerBasePath, onFileUploaded, jobStore) {
  uploadCallback = onFileUploaded;
  jobStoreRef = jobStore;
  const PORT = 3333;
  const localIP = getLocalIP();

  if (server) { server.close(); }

  server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // ─── Pages ─────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/g') {
      const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getGeneralUploadHTML(sessionId));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/code') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getAccessCodePageHTML());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getStatusCheckPageHTML());
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/upload/')) {
      const parts = url.pathname.split('/');
      const sessionId = parts[2] || '';
      const customerName = decodeURIComponent(parts[3] || 'Müşteri');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getCustomerUploadHTML(customerName, sessionId));
      return;
    }

    // ─── File Upload ───────────────────────────────
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
          const mparts = parseMultipart(buffer, boundary);

          let customerName = 'Genel';
          let sessionId = '';
          let fileData = null;
          let fileName = null;
          let rotation = 0;

          for (const part of mparts) {
            if (part.name === 'customer') customerName = part.data.toString().trim();
            else if (part.name === 'session') sessionId = part.data.toString().trim();
            else if (part.name === 'rotation') rotation = parseInt(part.data.toString().trim()) || 0;
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

            // Get page count for PDFs
            let pageCount = 1;
            const ext = path.extname(finalName).toLowerCase();
            if (ext === '.pdf') {
              pageCount = getPDFPageCount(filePath);
            }

            if (uploadCallback) {
              uploadCallback({
                customerName, sessionId, fileName: finalName, filePath,
                fileSize: fileData.length, ext, pageCount, rotation,
              });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, fileName: finalName, pageCount }));
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

    // ─── API: Create Job ───────────────────────────
    if (req.method === 'POST' && url.pathname === '/api/create-job') {
      let body = '';
      req.on('data', (d) => body += d);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const customerPath = path.join(customerBasePath, data.customerName || 'Genel');
          const files = (data.fileNames || []).map(name => {
            const fPath = path.join(customerPath, name);
            const ext = path.extname(name).toLowerCase();
            let pageCount = 1;
            if (ext === '.pdf' && fs.existsSync(fPath)) {
              pageCount = getPDFPageCount(fPath);
            }
            let size = 0;
            try { size = fs.statSync(fPath).size; } catch (e) { }
            return {
              name, path: fPath, ext, size, pageCount,
              settings: data.settings || null,
              pageRange: data.pageRange || null,
            };
          });

          if (jobStoreRef) {
            const job = jobStoreRef.createJob({
              customerName: data.customerName,
              files,
              settings: data.settings,
              notes: data.notes,
              finishing: data.finishing,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jobId: job.jobId, queueNumber: job.queueNumber, totalPrice: job.totalPrice }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Job store not available' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // ─── API: Price Config ─────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/price-config') {
      if (jobStoreRef) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jobStoreRef.getPriceConfig()));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
      }
      return;
    }

    // ─── API: Job Status by queue number ───────────
    if (req.method === 'GET' && url.pathname.startsWith('/api/job-status/')) {
      const qn = url.pathname.split('/').pop();
      if (jobStoreRef) {
        const job = jobStoreRef.getJobByQueueNumber(qn);
        if (job) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(job));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not available' }));
      }
      return;
    }

    // ─── API: SSE ──────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      const clientId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      if (jobStoreRef) {
        jobStoreRef.addSSEClient(clientId, res);
        req.on('close', () => jobStoreRef.removeSSEClient(clientId));
      }
      return;
    }

    // ─── API: Access Code ──────────────────────────
    if (req.method === 'GET' && url.pathname.startsWith('/api/access-code/')) {
      const code = url.pathname.split('/').pop();
      if (jobStoreRef) {
        const codeInfo = jobStoreRef.getAccessCode(code);
        if (codeInfo) {
          const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          let redirectUrl;
          if (codeInfo.customerName) {
            redirectUrl = `/upload/${sessionId}/${encodeURIComponent(codeInfo.customerName)}`;
          } else {
            redirectUrl = '/g';
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ redirectUrl }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid code' }));
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not available' }));
      }
      return;
    }

    // ─── API: Serve file thumbnail ─────────────────
    if (req.method === 'GET' && url.pathname.startsWith('/api/thumb/')) {
      const filePath = decodeURIComponent(url.pathname.replace('/api/thumb/', ''));
      const fullPath = path.join(customerBasePath, filePath);
      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.bmp': 'image/bmp', '.gif': 'image/gif', '.webp': 'image/webp' };
        if (mimeTypes[ext]) {
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] });
          fs.createReadStream(fullPath).pipe(res);
        } else {
          res.writeHead(404); res.end('Not an image');
        }
      } else {
        res.writeHead(404); res.end('Not found');
      }
      return;
    }

    // ─── Health ────────────────────────────────────
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
  return { url: `http://${localIP}:3333/upload/${sessionId}/${encodeURIComponent(customerName)}`, sessionId, ip: localIP };
}

function getGeneralUploadURL() {
  const localIP = getLocalIP();
  return { url: `http://${localIP}:3333/g`, ip: localIP };
}

function getAccessCodeURL() {
  const localIP = getLocalIP();
  return { url: `http://${localIP}:3333/code`, ip: localIP };
}

function getStatusCheckURL() {
  const localIP = getLocalIP();
  return { url: `http://${localIP}:3333/status`, ip: localIP };
}

module.exports = { startUploadServer, stopUploadServer, getUploadURL, getGeneralUploadURL, getAccessCodeURL, getStatusCheckURL, getLocalIP };
