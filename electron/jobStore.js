/**
 * PıthCopy — Job Store
 * 
 * In-memory + disk-persisted job/order management system.
 * Each job = a customer's print request with files, settings, status, queue number.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// ─── State ──────────────────────────────────────────────────
let jobs = new Map();            // jobId → job
let dailyCounter = 0;           // resets daily
let lastResetDate = '';          // 'YYYY-MM-DD'
let sseClients = new Map();     // clientId → response objects
let priceConfig = null;
let statsData = null;
let customerProfiles = new Map(); // customerName → { defaultSettings }
let onJobChangeCallback = null;

// ─── Paths ──────────────────────────────────────────────────
function getDataDir() {
    const documentsPath = app ? app.getPath('documents') : require('os').homedir();
    const dir = path.join(documentsPath, 'PıthCopy', 'Data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getJobsPath() { return path.join(getDataDir(), 'jobs.json'); }
function getPricePath() { return path.join(getDataDir(), 'priceConfig.json'); }
function getStatsPath() { return path.join(getDataDir(), 'stats.json'); }
function getProfilesPath() { return path.join(getDataDir(), 'customerProfiles.json'); }

// ─── Persistence ────────────────────────────────────────────
function saveJobs() {
    try {
        const data = {
            jobs: Array.from(jobs.entries()),
            dailyCounter,
            lastResetDate,
        };
        fs.writeFileSync(getJobsPath(), JSON.stringify(data, null, 2), 'utf8');
    } catch (e) { console.error('Job save error:', e); }
}

function loadJobs() {
    try {
        if (fs.existsSync(getJobsPath())) {
            const raw = JSON.parse(fs.readFileSync(getJobsPath(), 'utf8'));
            jobs = new Map(raw.jobs || []);
            dailyCounter = raw.dailyCounter || 0;
            lastResetDate = raw.lastResetDate || '';
        }
    } catch (e) { console.error('Job load error:', e); }
}

// ─── Price Config ───────────────────────────────────────────
const DEFAULT_PRICE_CONFIG = {
    perPageBW_A4: 1.00,
    perPageColor_A4: 3.00,
    perPageBW_A3: 2.00,
    perPageColor_A3: 5.00,
    perPageBW_A5: 0.75,
    perPageColor_A5: 2.00,
    duplexDiscount: 0.20,  // 20% discount for duplex
    // Finishing prices
    stapling: 1.00,
    punching: 1.00,
    binding: 10.00,
};

function loadPriceConfig() {
    try {
        if (fs.existsSync(getPricePath())) {
            priceConfig = JSON.parse(fs.readFileSync(getPricePath(), 'utf8'));
        } else {
            priceConfig = { ...DEFAULT_PRICE_CONFIG };
            savePriceConfig();
        }
    } catch (e) {
        priceConfig = { ...DEFAULT_PRICE_CONFIG };
    }
    return priceConfig;
}

function savePriceConfig() {
    try {
        fs.writeFileSync(getPricePath(), JSON.stringify(priceConfig, null, 2), 'utf8');
    } catch (e) { console.error('Price config save error:', e); }
}

function getPriceConfig() {
    if (!priceConfig) loadPriceConfig();
    return priceConfig;
}

function updatePriceConfig(newConfig) {
    priceConfig = { ...priceConfig, ...newConfig };
    savePriceConfig();
    return priceConfig;
}

// ─── Stats ──────────────────────────────────────────────────
function loadStats() {
    try {
        if (fs.existsSync(getStatsPath())) {
            statsData = JSON.parse(fs.readFileSync(getStatsPath(), 'utf8'));
        } else {
            statsData = { days: {} };
        }
    } catch (e) {
        statsData = { days: {} };
    }
    return statsData;
}

function saveStats() {
    try {
        fs.writeFileSync(getStatsPath(), JSON.stringify(statsData, null, 2), 'utf8');
    } catch (e) { console.error('Stats save error:', e); }
}

function recordJobStats(job) {
    if (!statsData) loadStats();
    const today = new Date().toISOString().split('T')[0];
    if (!statsData.days[today]) {
        statsData.days[today] = { jobCount: 0, totalPages: 0, totalRevenue: 0, hourBreakdown: {} };
    }
    const day = statsData.days[today];
    day.jobCount++;
    const totalPages = (job.files || []).reduce((sum, f) => {
        const pages = f.pageCount || 1;
        const copies = (f.settings?.copies) || (job.settings?.copies) || 1;
        return sum + (pages * copies);
    }, 0);
    day.totalPages += totalPages;
    if (job.totalPrice) day.totalRevenue += job.totalPrice;

    // Hour breakdown
    const hour = new Date().getHours().toString();
    day.hourBreakdown[hour] = (day.hourBreakdown[hour] || 0) + 1;

    // Customer history
    if (!statsData.customers) statsData.customers = {};
    const custName = job.customerName || 'Anonim';
    if (!statsData.customers[custName]) {
        statsData.customers[custName] = { jobCount: 0, totalPages: 0, totalRevenue: 0, lastVisit: '' };
    }
    statsData.customers[custName].jobCount++;
    statsData.customers[custName].totalPages += totalPages;
    if (job.totalPrice) statsData.customers[custName].totalRevenue += job.totalPrice;
    statsData.customers[custName].lastVisit = new Date().toISOString();

    saveStats();
}

function getStats() {
    if (!statsData) loadStats();
    return statsData;
}

// ─── Customer Profiles ──────────────────────────────────────
function loadProfiles() {
    try {
        if (fs.existsSync(getProfilesPath())) {
            const data = JSON.parse(fs.readFileSync(getProfilesPath(), 'utf8'));
            customerProfiles = new Map(Object.entries(data));
        }
    } catch (e) { console.error('Profile load error:', e); }
}

function saveProfiles() {
    try {
        const obj = Object.fromEntries(customerProfiles);
        fs.writeFileSync(getProfilesPath(), JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) { console.error('Profile save error:', e); }
}

function getProfile(customerName) {
    return customerProfiles.get(customerName) || null;
}

function saveProfile(customerName, profile) {
    customerProfiles.set(customerName, { ...profile, updatedAt: new Date().toISOString() });
    saveProfiles();
}

function getAllProfiles() {
    return Object.fromEntries(customerProfiles);
}

function deleteProfile(customerName) {
    customerProfiles.delete(customerName);
    saveProfiles();
}

// ─── Queue Number ───────────────────────────────────────────
function getNextQueueNumber() {
    const today = new Date().toISOString().split('T')[0];
    if (lastResetDate !== today) {
        dailyCounter = 0;
        lastResetDate = today;
    }
    dailyCounter++;
    return String(dailyCounter).padStart(3, '0');
}

// ─── Job CRUD ───────────────────────────────────────────────
function createJob({ customerName, files, settings, notes, pageRanges, finishing }) {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queueNumber = getNextQueueNumber();

    const job = {
        jobId,
        queueNumber,
        customerName: customerName || 'Anonim',
        files: files || [],         // [{ name, path, ext, size, pageCount, settings, pageRange }]
        settings: settings || {     // default/global settings
            copies: 1,
            color: true,
            paperSize: 'A4',
            orientation: 'portrait',
            duplex: false,
        },
        notes: notes || '',
        pageRanges: pageRanges || null,
        finishing: finishing || {     // finishing options
            stapling: false,
            punching: false,
            binding: false,
        },
        status: 'pending',          // pending → approved → printing → ready → delivered
        totalPrice: 0,
        assignedPrinter: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [{ status: 'pending', at: new Date().toISOString() }],
    };

    // Calculate price
    job.totalPrice = calculateJobPrice(job);

    jobs.set(jobId, job);
    saveJobs();
    notifySSEClients({ type: 'job:created', job });
    if (onJobChangeCallback) onJobChangeCallback('created', job);
    return job;
}

function getJob(jobId) {
    return jobs.get(jobId) || null;
}

function getJobByQueueNumber(queueNumber) {
    for (const job of jobs.values()) {
        if (job.queueNumber === queueNumber) return job;
    }
    return null;
}

function getAllJobs() {
    return Array.from(jobs.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getPendingJobs() {
    return getAllJobs().filter(j => j.status === 'pending' || j.status === 'approved');
}

function getActiveJobs() {
    return getAllJobs().filter(j => j.status !== 'delivered');
}

function updateJobStatus(jobId, status, assignedPrinter) {
    const job = jobs.get(jobId);
    if (!job) return null;

    job.status = status;
    job.updatedAt = new Date().toISOString();
    job.statusHistory.push({ status, at: new Date().toISOString() });
    if (assignedPrinter) job.assignedPrinter = assignedPrinter;

    // Record stats when moving to 'ready'
    if (status === 'ready') {
        recordJobStats(job);
    }

    jobs.set(jobId, job);
    saveJobs();
    notifySSEClients({ type: 'job:updated', job });
    if (onJobChangeCallback) onJobChangeCallback('updated', job);
    return job;
}

function updateJob(jobId, updates) {
    const job = jobs.get(jobId);
    if (!job) return null;

    Object.assign(job, updates);
    job.updatedAt = new Date().toISOString();
    // Recalculate price
    job.totalPrice = calculateJobPrice(job);

    jobs.set(jobId, job);
    saveJobs();
    notifySSEClients({ type: 'job:updated', job });
    if (onJobChangeCallback) onJobChangeCallback('updated', job);
    return job;
}

function deleteJob(jobId) {
    const job = jobs.get(jobId);
    jobs.delete(jobId);
    saveJobs();
    if (job) {
        notifySSEClients({ type: 'job:deleted', jobId });
        if (onJobChangeCallback) onJobChangeCallback('deleted', job);
    }
}

function addFileToJob(jobId, file) {
    const job = jobs.get(jobId);
    if (!job) return null;
    job.files.push(file);
    job.updatedAt = new Date().toISOString();
    job.totalPrice = calculateJobPrice(job);
    jobs.set(jobId, job);
    saveJobs();
    notifySSEClients({ type: 'job:updated', job });
    return job;
}

function removeFileFromJob(jobId, fileName) {
    const job = jobs.get(jobId);
    if (!job) return null;
    job.files = job.files.filter(f => f.name !== fileName);
    job.updatedAt = new Date().toISOString();
    job.totalPrice = calculateJobPrice(job);
    jobs.set(jobId, job);
    saveJobs();
    notifySSEClients({ type: 'job:updated', job });
    return job;
}

// ─── Price Calculation ──────────────────────────────────────
function calculateJobPrice(job) {
    const cfg = getPriceConfig();
    let total = 0;

    for (const file of (job.files || [])) {
        const fSettings = file.settings || job.settings || {};
        const copies = fSettings.copies || 1;
        const isColor = fSettings.color !== false;
        const paper = fSettings.paperSize || 'A4';
        const isDuplex = fSettings.duplex || false;

        let pageCount = file.pageCount || 1;

        // If page range is set, calculate actual pages
        if (file.pageRange && file.pageRange.from && file.pageRange.to) {
            pageCount = Math.max(1, file.pageRange.to - file.pageRange.from + 1);
        }

        // Get per-page price
        let priceKey = `perPage${isColor ? 'Color' : 'BW'}_${paper}`;
        let perPage = cfg[priceKey] || cfg.perPageBW_A4 || 1;

        let fileTotal = perPage * pageCount * copies;

        // Duplex discount
        if (isDuplex) {
            fileTotal *= (1 - (cfg.duplexDiscount || 0));
        }

        total += fileTotal;
    }

    // Finishing costs
    const finishing = job.finishing || {};
    if (finishing.stapling) total += cfg.stapling || 0;
    if (finishing.punching) total += cfg.punching || 0;
    if (finishing.binding) total += cfg.binding || 0;

    return Math.round(total * 100) / 100;
}

function calculatePriceEstimate(settings) {
    // For quick price estimates from the mobile page
    const cfg = getPriceConfig();
    const {
        copies = 1,
        color = true,
        paperSize = 'A4',
        duplex = false,
        pageCount = 1,
        finishing = {},
    } = settings;

    const priceKey = `perPage${color ? 'Color' : 'BW'}_${paperSize}`;
    let perPage = cfg[priceKey] || cfg.perPageBW_A4 || 1;
    let total = perPage * pageCount * copies;

    if (duplex) total *= (1 - (cfg.duplexDiscount || 0));
    if (finishing.stapling) total += cfg.stapling || 0;
    if (finishing.punching) total += cfg.punching || 0;
    if (finishing.binding) total += cfg.binding || 0;

    return Math.round(total * 100) / 100;
}

// ─── SSE ────────────────────────────────────────────────────
function addSSEClient(clientId, res) {
    sseClients.set(clientId, res);
    // Send current state
    const currentJobs = getAllJobs();
    res.write(`data: ${JSON.stringify({ type: 'init', jobs: currentJobs })}\n\n`);
}

function removeSSEClient(clientId) {
    sseClients.delete(clientId);
}

function notifySSEClients(data) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    for (const [clientId, res] of sseClients.entries()) {
        try {
            res.write(msg);
        } catch (e) {
            sseClients.delete(clientId);
        }
    }
}

// ─── Access Code System ─────────────────────────────────────
let accessCodes = new Map(); // code → { type, customerName, createdAt }

function generateAccessCode(customerName) {
    // Generate unique 4-digit code
    let code;
    do {
        code = String(Math.floor(1000 + Math.random() * 9000));
    } while (accessCodes.has(code));

    accessCodes.set(code, {
        type: customerName ? 'customer' : 'general',
        customerName: customerName || null,
        createdAt: new Date().toISOString(),
    });

    // Expire after 24 hours
    setTimeout(() => accessCodes.delete(code), 24 * 60 * 60 * 1000);

    return code;
}

function getAccessCode(code) {
    return accessCodes.get(code) || null;
}

// ─── Auto Cleanup ───────────────────────────────────────────
function cleanupOldFiles(customerBasePath, maxAgeDays = 7) {
    try {
        const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
        const entries = fs.readdirSync(customerBasePath, { withFileTypes: true });
        let cleaned = 0;
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const dirPath = path.join(customerBasePath, entry.name);
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    try {
                        const stat = fs.statSync(filePath);
                        if (stat.mtimeMs < cutoff) {
                            fs.unlinkSync(filePath);
                            cleaned++;
                        }
                    } catch (e) { /* skip */ }
                }
                // Remove empty dirs
                const remaining = fs.readdirSync(dirPath);
                if (remaining.length === 0) {
                    fs.rmdirSync(dirPath);
                }
            }
        }
        return cleaned;
    } catch (e) {
        console.error('Cleanup error:', e);
        return 0;
    }
}

// Clean delivered jobs older than 24 hours
function cleanupOldJobs() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [jobId, job] of jobs.entries()) {
        if (job.status === 'delivered' && new Date(job.updatedAt).getTime() < cutoff) {
            jobs.delete(jobId);
        }
    }
    saveJobs();
}

// ─── Callbacks ──────────────────────────────────────────────
function onJobChange(callback) {
    onJobChangeCallback = callback;
}

// ─── Init ───────────────────────────────────────────────────
function init() {
    loadJobs();
    loadPriceConfig();
    loadStats();
    loadProfiles();

    // Cleanup every hour
    setInterval(() => {
        cleanupOldJobs();
    }, 60 * 60 * 1000);
}

module.exports = {
    init,
    // Jobs
    createJob,
    getJob,
    getJobByQueueNumber,
    getAllJobs,
    getPendingJobs,
    getActiveJobs,
    updateJobStatus,
    updateJob,
    deleteJob,
    addFileToJob,
    removeFileFromJob,
    // Price
    getPriceConfig,
    updatePriceConfig,
    calculateJobPrice,
    calculatePriceEstimate,
    // SSE
    addSSEClient,
    removeSSEClient,
    notifySSEClients,
    // Stats
    getStats,
    recordJobStats,
    // Profiles
    getProfile,
    saveProfile,
    getAllProfiles,
    deleteProfile,
    // Access Code
    generateAccessCode,
    getAccessCode,
    // Cleanup
    cleanupOldFiles,
    cleanupOldJobs,
    // Queue
    getNextQueueNumber,
    // Callback
    onJobChange,
};
