/**
 * PıthCopy — Mobile Upload Page JavaScript
 * Client-side JS that runs in customer's mobile browser
 */

const MOBILE_JS = `
let selectedFiles = [];
let jobId = null;
let queueNumber = null;
let sseSource = null;
let priceConfig = null;

// Settings state
let globalSettings = {
  copies: 1, color: true, paperSize: 'A4', orientation: 'portrait', duplex: false,
  pageRangeType: 'all', pageFrom: 1, pageTo: 1,
  finishing: { stapling: false, punching: false, binding: false },
  notes: ''
};

const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const dropZone = document.getElementById('dropZone');

// Load price config from server
async function loadPriceConfig() {
  try {
    const res = await fetch('/api/price-config');
    if (res.ok) priceConfig = await res.json();
  } catch(e) { console.log('Price config not available'); }
}
loadPriceConfig();

// File handling
if (fileInput) fileInput.addEventListener('change', handleFiles);
if (dropZone) {
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
  dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragging'); });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragging');
    fileInput.files = e.dataTransfer.files; handleFiles();
  });
}

function handleFiles() {
  const newFiles = Array.from(fileInput.files);
  for (const f of newFiles) {
    selectedFiles.push({ file: f, settings: null, rotation: 0 });
  }
  renderFileList();
  updateUploadBtn();
  updatePrice();
  fileInput.value = '';
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
  updateUploadBtn();
  updatePrice();
}

function rotateFile(index) {
  selectedFiles[index].rotation = (selectedFiles[index].rotation + 90) % 360;
  renderFileList();
}

function updateUploadBtn() {
  if (uploadBtn) {
    uploadBtn.disabled = selectedFiles.length === 0;
    uploadBtn.textContent = selectedFiles.length > 0
      ? 'Gönder (' + selectedFiles.length + ' dosya)'
      : 'Dosyaları Gönder';
  }
}

function getFileIconClass(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc','docx'].includes(ext)) return 'doc';
  if (['xls','xlsx'].includes(ext)) return 'xls';
  if (['png','jpg','jpeg','bmp','tiff','gif','webp'].includes(ext)) return 'img';
  return 'other';
}

function isImageFile(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ['png','jpg','jpeg','bmp','tiff','gif','webp'].includes(ext);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function renderFileList() {
  if (!fileList) return;
  fileList.innerHTML = selectedFiles.map((item, i) => {
    const f = item.file;
    const isImg = isImageFile(f.name);
    let thumbHtml = '';
    if (isImg) {
      const url = URL.createObjectURL(f);
      const rot = item.rotation || 0;
      thumbHtml = '<img class="thumb-preview" src="' + url + '" style="transform:rotate('+rot+'deg)">';
    } else {
      thumbHml = '<div class="icon ' + getFileIconClass(f.name) + '">' + f.name.split('.').pop().toUpperCase().slice(0,4) + '</div>';
    }
    return '<div class="file-item">' +
      '<div class="remove-btn" onclick="removeFile(' + i + ')">×</div>' +
      (isImg ? thumbHtml : '<div class="icon ' + getFileIconClass(f.name) + '">' + f.name.split('.').pop().toUpperCase().slice(0,4) + '</div>') +
      '<div class="info"><div class="name">' + f.name + '</div><div class="size">' + formatSize(f.size) + '</div></div>' +
      (isImg ? '<div class="rotate-btn" onclick="event.stopPropagation();rotateFile(' + i + ')">↻</div>' : '') +
      '<div class="status pending" id="status-' + i + '">⏳</div>' +
    '</div>';
  }).join('');
}

// Settings UI interactions
function setCopies(val) {
  globalSettings.copies = Math.max(1, Math.min(999, val));
  const el = document.getElementById('copiesVal');
  if (el) el.textContent = globalSettings.copies;
  updatePrice();
}

function toggleColor() {
  globalSettings.color = !globalSettings.color;
  const el = document.getElementById('colorToggle');
  if (el) el.classList.toggle('active', globalSettings.color);
  const lbl = document.getElementById('colorLabel');
  if (lbl) lbl.textContent = globalSettings.color ? 'Renkli' : 'Siyah-Beyaz';
  updatePrice();
}

function setPaperSize(val) {
  globalSettings.paperSize = val;
  updatePrice();
}

function setOrientation(val) {
  globalSettings.orientation = val;
  document.querySelectorAll('.orient-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
}

function toggleDuplex() {
  globalSettings.duplex = !globalSettings.duplex;
  const el = document.getElementById('duplexToggle');
  if (el) el.classList.toggle('active', globalSettings.duplex);
  updatePrice();
}

function setPageRangeType(type) {
  globalSettings.pageRangeType = type;
  const rangeEl = document.getElementById('pageRangeInputs');
  if (rangeEl) rangeEl.style.display = type === 'range' ? 'flex' : 'none';
  document.querySelectorAll('.range-btn').forEach(b => b.classList.toggle('active', b.dataset.val === type));
  updatePrice();
}

function setPageFrom(val) { globalSettings.pageFrom = Math.max(1, parseInt(val) || 1); updatePrice(); }
function setPageTo(val) { globalSettings.pageTo = Math.max(1, parseInt(val) || 1); updatePrice(); }

function toggleFinishing(key) {
  globalSettings.finishing[key] = !globalSettings.finishing[key];
  const el = document.getElementById('finish-' + key);
  if (el) el.classList.toggle('active', globalSettings.finishing[key]);
  updatePrice();
}

// Price calculation
function updatePrice() {
  if (!priceConfig) return;
  const el = document.getElementById('priceAmount');
  const detailEl = document.getElementById('priceDetail');
  if (!el) return;

  let totalPages = 0;
  const fileCount = selectedFiles.length || 1;

  if (globalSettings.pageRangeType === 'range') {
    totalPages = Math.max(1, globalSettings.pageTo - globalSettings.pageFrom + 1);
  } else {
    totalPages = fileCount; // estimate 1 page per file if unknown
  }

  const isColor = globalSettings.color;
  const paper = globalSettings.paperSize;
  const key = 'perPage' + (isColor ? 'Color' : 'BW') + '_' + paper;
  const perPage = priceConfig[key] || 1;
  let total = perPage * totalPages * globalSettings.copies;

  if (globalSettings.duplex) total *= (1 - (priceConfig.duplexDiscount || 0));
  if (globalSettings.finishing.stapling) total += priceConfig.stapling || 0;
  if (globalSettings.finishing.punching) total += priceConfig.punching || 0;
  if (globalSettings.finishing.binding) total += priceConfig.binding || 0;

  el.textContent = total.toFixed(2) + ' ₺';
  if (detailEl) {
    detailEl.textContent = totalPages + ' sayfa × ' + globalSettings.copies + ' kopya × ' +
      perPage.toFixed(2) + ' ₺/' + (isColor ? 'renkli' : 'SB');
  }
}

// Upload
async function uploadFiles() {
  const customerName = getCustomerName();
  if (!customerName) { alert('Lütfen adınızı girin'); return; }

  const notesEl = document.getElementById('notesInput');
  if (notesEl) globalSettings.notes = notesEl.value;

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Yükleniyor...';
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  if (progressBar) progressBar.classList.add('active');
  let completed = 0;
  let uploadedFileNames = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    const statusEl = document.getElementById('status-' + i);
    if (statusEl) { statusEl.className = 'status uploading'; statusEl.textContent = '⬆'; }
    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[i].file);
      formData.append('customer', customerName);
      formData.append('session', SESSION_ID);
      formData.append('rotation', selectedFiles[i].rotation || 0);
      const res = await fetch('/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        uploadedFileNames.push(data.fileName);
        if (statusEl) { statusEl.className = 'status done'; statusEl.textContent = '✓'; }
      } else throw new Error('fail');
    } catch(e) {
      if (statusEl) { statusEl.className = 'status error'; statusEl.textContent = '✗'; }
    }
    completed++;
    if (progressFill) progressFill.style.width = ((completed / selectedFiles.length) * 100) + '%';
  }

  // Create job with settings
  try {
    const jobRes = await fetch('/api/create-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        fileNames: uploadedFileNames,
        settings: {
          copies: globalSettings.copies,
          color: globalSettings.color,
          paperSize: globalSettings.paperSize,
          orientation: globalSettings.orientation,
          duplex: globalSettings.duplex,
        },
        pageRange: globalSettings.pageRangeType === 'range'
          ? { from: globalSettings.pageFrom, to: globalSettings.pageTo } : null,
        notes: globalSettings.notes,
        finishing: globalSettings.finishing,
      }),
    });
    if (jobRes.ok) {
      const jobData = await jobRes.json();
      jobId = jobData.jobId;
      queueNumber = jobData.queueNumber;
    }
  } catch(e) { console.error('Job creation failed:', e); }

  setTimeout(() => {
    const uploadArea = document.getElementById('uploadArea');
    const successMsg = document.getElementById('successMsg');
    if (uploadArea) uploadArea.style.display = 'none';
    if (successMsg) {
      successMsg.classList.add('show');
      const qnEl = document.getElementById('queueNumDisplay');
      if (qnEl && queueNumber) qnEl.textContent = '#' + queueNumber;
      startStatusTracking();
    }
  }, 500);
}

// SSE Status Tracking
function startStatusTracking() {
  if (!jobId) return;
  const statusContainer = document.getElementById('statusTracker');
  if (statusContainer) statusContainer.style.display = 'block';

  const evtSource = new EventSource('/api/sse?jobId=' + jobId);
  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'job:updated' && data.job && data.job.jobId === jobId) {
        updateStatusDisplay(data.job.status);
      }
      if (data.type === 'init' && data.jobs) {
        const myJob = data.jobs.find(j => j.jobId === jobId);
        if (myJob) updateStatusDisplay(myJob.status);
      }
    } catch(e) {}
  };
  sseSource = evtSource;
}

function updateStatusDisplay(status) {
  const steps = ['pending', 'approved', 'printing', 'ready'];
  const currentIdx = steps.indexOf(status);
  steps.forEach((step, idx) => {
    const dot = document.getElementById('dot-' + step);
    const lbl = document.getElementById('lbl-' + step);
    if (!dot || !lbl) return;
    if (idx < currentIdx) {
      dot.className = 'dot completed';
      lbl.className = 'label completed';
    } else if (idx === currentIdx) {
      if (step === 'ready') {
        dot.className = 'dot ready';
        lbl.className = 'label ready';
      } else {
        dot.className = 'dot active';
        lbl.className = 'label active';
      }
    } else {
      dot.className = 'dot inactive';
      lbl.className = 'label';
    }
  });

  if (status === 'ready') {
    const readyMsg = document.getElementById('readyMessage');
    if (readyMsg) readyMsg.style.display = 'block';
    if (sseSource) sseSource.close();
    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
}

function resetForm() {
  selectedFiles = [];
  if (fileList) fileList.innerHTML = '';
  if (fileInput) fileInput.value = '';
  updateUploadBtn();
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  if (progressBar) progressBar.classList.remove('active');
  if (progressFill) progressFill.style.width = '0%';
  const uploadArea = document.getElementById('uploadArea');
  const successMsg = document.getElementById('successMsg');
  if (uploadArea) uploadArea.style.display = 'block';
  if (successMsg) successMsg.classList.remove('show');
  const statusTracker = document.getElementById('statusTracker');
  if (statusTracker) statusTracker.style.display = 'none';
  const readyMsg = document.getElementById('readyMessage');
  if (readyMsg) readyMsg.style.display = 'none';
  jobId = null; queueNumber = null;
  if (sseSource) { sseSource.close(); sseSource = null; }
  globalSettings.copies = 1;
  globalSettings.notes = '';
  const copiesEl = document.getElementById('copiesVal');
  if (copiesEl) copiesEl.textContent = '1';
  const notesEl = document.getElementById('notesInput');
  if (notesEl) notesEl.value = '';
}
`;

module.exports = { MOBILE_JS };
