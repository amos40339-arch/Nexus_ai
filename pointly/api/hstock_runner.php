<?php
// ============================================================
// POINTLY — hstock Auto-Sync Runner
// File: /public_html/api/hstock_runner.php
// Open in browser — runs all batches automatically, shows live progress
// ============================================================

define('SYNC_TOKEN', 'pL9mK2xQ7nR4wB8vT3');
define('BATCH_SIZE', 50);

$token = $_GET['token'] ?? '';
if (!hash_equals(SYNC_TOKEN, $token)) {
    http_response_code(403);
    echo 'Unauthorized';
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pointly — hstock Sync Runner</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f0f13; color: #e2e8f0; min-height: 100vh; padding: 24px 16px; }
  .wrap { max-width: 760px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 4px; }
  .sub { font-size: 13px; color: #64748b; margin-bottom: 28px; }

  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat { background: #1a1a24; border-radius: 12px; padding: 14px 16px; }
  .stat-val { font-size: 26px; font-weight: 800; color: #a78bfa; }
  .stat-lbl { font-size: 12px; color: #64748b; margin-top: 3px; }

  .progress-wrap { background: #1a1a24; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
  .progress-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
  .progress-bar-bg { background: #2d2d3d; border-radius: 999px; height: 10px; }
  .progress-bar { background: linear-gradient(90deg, #6A00DF, #a78bfa); border-radius: 999px; height: 10px; width: 0%; transition: width .4s ease; }

  .status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
  .status-badge.running  { background: rgba(106,0,223,.2); color: #a78bfa; }
  .status-badge.done     { background: rgba(16,185,129,.2); color: #34d399; }
  .status-badge.idle     { background: rgba(100,116,139,.2); color: #94a3b8; }
  .status-badge.error    { background: rgba(239,68,68,.2); color: #f87171; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .dot.pulse { animation: pulse .8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  .btn { height: 48px; padding: 0 28px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity .2s, transform .1s; }
  .btn:active { transform: scale(.97); }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn-start  { background: linear-gradient(135deg, #6A00DF, #8B3DFF); color: #fff; }
  .btn-stop   { background: #1a1a24; color: #f87171; border: 1.5px solid #f8717140; }
  .btn-row    { display: flex; gap: 10px; margin-bottom: 24px; }

  .log { background: #1a1a24; border-radius: 12px; padding: 14px 16px; max-height: 340px; overflow-y: auto; font-size: 12.5px; font-family: monospace; }
  .log-entry { padding: 4px 0; border-bottom: 1px solid #2d2d3d; display: flex; gap: 10px; }
  .log-entry:last-child { border-bottom: none; }
  .log-time  { color: #475569; flex-shrink: 0; }
  .log-msg   { color: #cbd5e1; flex: 1; word-break: break-all; }
  .log-msg.ok   { color: #34d399; }
  .log-msg.warn { color: #fbbf24; }
  .log-msg.err  { color: #f87171; }

  @media(max-width:540px) { .stat-row { grid-template-columns: repeat(2,1fr); } }
</style>
</head>
<body>
<div class="wrap">
  <h1>⚡ hstock Sync Runner</h1>
  <p class="sub">Automatically syncs all categories in batches — just press Start and leave it running.</p>

  <div class="stat-row">
    <div class="stat"><div class="stat-val" id="s-cats">—</div><div class="stat-lbl">Total Categories</div></div>
    <div class="stat"><div class="stat-val" id="s-done">0</div><div class="stat-lbl">Categories Done</div></div>
    <div class="stat"><div class="stat-val" id="s-inserted">0</div><div class="stat-lbl">Products Added</div></div>
    <div class="stat"><div class="stat-val" id="s-updated">0</div><div class="stat-lbl">Products Updated</div></div>
  </div>

  <div class="progress-wrap">
    <div class="progress-header">
      <span id="prog-label">Ready to start</span>
      <span id="prog-pct">0%</span>
    </div>
    <div class="progress-bar-bg"><div class="progress-bar" id="prog-bar"></div></div>
  </div>

  <div id="status-badge" class="status-badge idle"><div class="dot"></div> Idle</div>

  <div class="btn-row">
    <button class="btn btn-start" id="btn-start" onclick="startSync()">▶ Start Full Sync</button>
    <button class="btn btn-stop"  id="btn-stop"  onclick="stopSync()" disabled>■ Stop</button>
  </div>

  <div class="log" id="log"><div class="log-entry"><div class="log-time">—</div><div class="log-msg">Press Start to begin syncing all <?= BATCH_SIZE ?> categories per batch.</div></div></div>
</div>

<script>
const TOKEN      = '<?= SYNC_TOKEN ?>';
const BATCH_SIZE = <?= BATCH_SIZE ?>;
const BASE_URL   = 'hstock_sync.php';

let totalCats  = 0;
let offset     = 0;
let running    = false;
let inserted   = 0;
let updated    = 0;
let catsDone   = 0;

function log(msg, type = '') {
  const box  = document.getElementById('log');
  const now  = new Date().toLocaleTimeString();
  const el   = document.createElement('div');
  el.className = 'log-entry';
  el.innerHTML = `<div class="log-time">${now}</div><div class="log-msg ${type}">${msg}</div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function setStatus(label, type) {
  const b = document.getElementById('status-badge');
  b.className = 'status-badge ' + type;
  const pulse = type === 'running' ? ' pulse' : '';
  b.innerHTML = `<div class="dot${pulse}"></div> ${label}`;
}

function updateStats() {
  document.getElementById('s-inserted').textContent = inserted.toLocaleString();
  document.getElementById('s-updated').textContent  = updated.toLocaleString();
  document.getElementById('s-done').textContent     = catsDone.toLocaleString();
  if (totalCats > 0) {
    const pct = Math.round((catsDone / totalCats) * 100);
    document.getElementById('prog-bar').style.width   = pct + '%';
    document.getElementById('prog-pct').textContent   = pct + '%';
    document.getElementById('prog-label').textContent =
      `Batch ${Math.ceil(catsDone / BATCH_SIZE)} of ${Math.ceil(totalCats / BATCH_SIZE)} — category ${catsDone} / ${totalCats}`;
  }
}

async function fetchBatch(batchOffset) {
  const url = `${BASE_URL}?token=${TOKEN}&batch=${BATCH_SIZE}&offset=${batchOffset}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function fetchTotalCategories() {
  const res  = await fetch(`${BASE_URL}?token=${TOKEN}&list_categories=1`);
  const data = await res.json();
  return (data.categories_to_sync || []).length;
}

async function startSync() {
  if (running) return;
  running = true;
  offset = inserted = updated = catsDone = 0;

  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-stop').disabled  = false;
  setStatus('Loading categories...', 'running');
  log('Fetching category list from hstock...', '');

  try {
    totalCats = await fetchTotalCategories();
    document.getElementById('s-cats').textContent = totalCats.toLocaleString();
    log(`Found ${totalCats} categories to sync. Starting batches of ${BATCH_SIZE}...`, 'ok');
  } catch (e) {
    log('Failed to fetch category list: ' + e.message, 'err');
    setStatus('Error', 'error');
    running = false;
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled  = true;
    return;
  }

  setStatus('Syncing...', 'running');

  while (running && offset < totalCats) {
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalCats / BATCH_SIZE);
    log(`Running batch ${batchNum}/${totalBatches} (offset ${offset})...`);

    try {
      const data = await fetchBatch(offset);

      const batchInserted = data.stats?.products_inserted || 0;
      const batchUpdated  = data.stats?.products_updated  || 0;
      const batchFetched  = data.stats?.products_fetched  || 0;
      const batchCats     = Object.keys(data.stats?.per_category || {}).length;
      const errors        = data.stats?.errors || [];

      inserted  += batchInserted;
      updated   += batchUpdated;
      catsDone  += batchCats;
      offset    += BATCH_SIZE;

      updateStats();

      log(
        `✓ Batch ${batchNum}: fetched ${batchFetched}, +${batchInserted} new, ~${batchUpdated} updated`,
        'ok'
      );

      if (errors.length > 0) {
        log(`  ⚠ ${errors.length} error(s): ${errors[0]}`, 'warn');
      }

      // Small pause between batches to be kind to the server
      await new Promise(r => setTimeout(r, 1500));

    } catch (e) {
      log(`Batch ${batchNum} failed: ${e.message} — retrying in 10s...`, 'err');
      await new Promise(r => setTimeout(r, 10000));
      // Don't advance offset — retry same batch
    }
  }

  running = false;
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-stop').disabled  = true;

  if (offset >= totalCats) {
    setStatus('Sync Complete!', 'done');
    log(`🎉 All ${totalCats} categories synced! Total: +${inserted} added, ~${updated} updated.`, 'ok');
  } else {
    setStatus('Stopped', 'idle');
    log(`Sync stopped at offset ${offset} / ${totalCats}.`, 'warn');
  }
}

function stopSync() {
  running = false;
  log('Stop requested — finishing current batch...', 'warn');
}
</script>
</body>
</html>
