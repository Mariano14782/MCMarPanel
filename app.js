/* ============================================================
   MC Dashboard — App Logic (single-page, no sidebar)
   ============================================================ */
const API = '';
let ws = null;
let lastConnectedISO = null;

// ── Helpers ──
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
let _toast; function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(_toast); _toast = setTimeout(() => t.classList.remove('show'), 3000); }
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// Format last connection time
function fmtLastConn(iso) {
    if (!iso) return '—';
    const d = new Date(iso), now = new Date();
    const diffMs = now - d;
    if (diffMs < 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// ── WebSocket ──
function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}`);
    ws.onopen = () => { setTopStatus(true); };
    ws.onclose = () => { setTopStatus(false); setTimeout(connectWS, 5000); };
    ws.onerror = () => { };
    ws.onmessage = e => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.event === 'history') { msg.logs.forEach(l => appendLog(l.type, l.text, l.time)); }
            else if (msg.event === 'log') { appendLog(msg.type, msg.text, msg.time); }
            else if (msg.event === 'players') { renderPlayers(msg.players, msg.maxPlayers); }
            else if (msg.event === 'count') {
                document.getElementById('player-count').textContent = `${msg.count} / ${msg.maxPlayers}`;
                if (msg.lastConnected) { lastConnectedISO = msg.lastConnected; document.getElementById('last-conn').textContent = fmtLastConn(msg.lastConnected); }
            }
            else if (msg.event === 'rcon_status') {
                if (msg.lastConnected) { lastConnectedISO = msg.lastConnected; document.getElementById('last-conn').textContent = fmtLastConn(msg.lastConnected); }
            }
        } catch (_) { }
    };
}

// ── Top status pill ──
function setTopStatus(online) {
    const pill = document.getElementById('top-pill'), lbl = document.getElementById('top-label');
    pill.className = 'status-pill ' + (online ? 'online' : 'offline');
    lbl.textContent = online ? 'Online' : 'Offline';
}

// ── Players ──
function avatarUrl(name) { return `https://crafatar.com/avatars/${encodeURIComponent(name)}?size=32&default=MHF_Steve&overlay`; }
function renderPlayers(names, max) {
    document.getElementById('player-count').textContent = `${names.length} / ${max || 20}`;
    const list = document.getElementById('player-list');
    if (!names.length) { list.innerHTML = '<div class="empty-msg">No players online</div>'; }
    else {
        list.innerHTML = names.map(n => `
      <div class="player-item">
        <img src="${avatarUrl(n)}" alt="${esc(n)}" onerror="this.src='https://crafatar.com/avatars/MHF_Steve?size=32'"/>
        <span>${esc(n)}</span>
        <span class="player-online-dot"></span>
      </div>`).join('');
    }
    // Update message dropdown
    const sel = document.getElementById('msg-target');
    const cur = sel.value;
    sel.innerHTML = '<option value="__all__">All</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    if (names.includes(cur)) sel.value = cur;
}

// ── Activity log ──
function appendLog(type, text, time) {
    const el = document.getElementById('activity-log');
    const div = document.createElement('div');
    div.className = 'log-line ' + (type || 'system');
    const ts = time ? new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    div.innerHTML = `<span class="log-time">[${ts}]</span>${esc(text)}`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

// ── Send command (REST) ──
async function postCmd(command) {
    const r = await fetch(API + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) });
    return r.json();
}

// Quick send (no UI feedback, just toast)
async function sendCmd2(command) {
    const r = await postCmd(command);
    toast(r.ok ? `✓ ${command}` : `✗ ${r.response}`);
}

// Unified console
function clearConsole() { document.getElementById('activity-log').innerHTML = ''; toast('Console cleared'); }
async function sendCmdBox() {
    const inp = document.getElementById('cmd-input');
    const cmd = inp.value.trim(); if (!cmd) return;
    inp.value = '';
    appendLog('command', '> ' + cmd, new Date().toISOString());
    const r = await postCmd(cmd);
    appendLog(r.ok ? 'response' : 'error', r.response || '(no response)', new Date().toISOString());
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cmd-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendCmdBox(); });
    document.getElementById('msg-text').addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
    document.getElementById('target-player').addEventListener('keydown', e => { if (e.key === 'Enter') playerAct('kick'); });
});


// ── Player actions ──
async function playerAct(action) {
    const name = document.getElementById('target-player').value.trim();
    const fb = document.getElementById('player-act-fb');
    if (!name) { fb.textContent = '⚠ Enter a player name'; fb.style.color = 'var(--yellow)'; return; }
    let cmd = '';
    if (action === 'kick') cmd = `kick ${name}`;
    else if (action === 'ban') cmd = `ban ${name}`;
    else if (action === 'gamemode') { const m = document.getElementById('gamemode-sel').value; cmd = `gamemode ${m} ${name}`; }
    else if (action === 'tp') cmd = `tp ${name} 0 64 0`;
    const r = await postCmd(cmd);
    fb.textContent = (r.ok ? '✓ ' : '✗ ') + (r.response || cmd);
    fb.style.color = r.ok ? 'var(--green)' : 'var(--red)';
    toast(r.ok ? `✓ ${cmd}` : 'Error executing command');
}

// ── Global message ──
async function sendMsg() {
    const player = document.getElementById('msg-target').value;
    const message = document.getElementById('msg-text').value.trim();
    const fb = document.getElementById('msg-fb');
    if (!message) { fb.textContent = '⚠ Please type a message'; return; }
    const r = await fetch(API + '/api/tell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player, message }) });
    const data = await r.json();
    document.getElementById('msg-text').value = '';
    fb.textContent = data.ok ? '✓ Message sent' : '✗ ' + data.response;
    fb.style.color = data.ok ? 'var(--green)' : 'var(--red)';
    toast(data.ok ? '✓ Message sent' : 'Error sending message');
}

// ── Server controls ──
async function doStop() {
    closeModal('modal-stop');
    const r = await postCmd('stop');
    toast(r.ok ? '✓ Server stopped' : '✗ ' + r.response);
}
async function doRestart() {
    closeModal('modal-restart');
    const r = await fetch(API + '/api/restart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await r.json();
    toast(data.ok ? '🔄 Server restarting...' : '✗ ' + data.response);
}

// ── Server ping badges ──
async function refreshPing() {
    document.getElementById('local-badge').textContent = '···';
    document.getElementById('ext-badge').textContent = '···';
    try {
        const r = await fetch(API + '/api/ping-servers'); const d = await r.json();
        const lb = document.getElementById('local-badge'), eb = document.getElementById('ext-badge');
        const lh = document.getElementById('local-host'), eh = document.getElementById('ext-host');
        if (lh && d.local.host) lh.textContent = d.local.host.split(':')[0];
        if (eh && d.external.host) eh.textContent = d.external.host.split(':')[0];
        lb.textContent = d.local.online ? 'Online' : 'Offline';
        lb.className = 'srv-badge ' + (d.local.online ? 'online' : 'offline');
        eb.textContent = d.external.online ? 'Online' : 'Offline';
        eb.className = 'srv-badge ' + (d.external.online ? 'online' : 'offline');
    } catch (e) {
        document.getElementById('local-badge').textContent = 'Error';
        document.getElementById('ext-badge').textContent = 'Error';
    }
}

// ── Initial status ──
async function init() {
    try {
        const r = await fetch(API + '/api/status'); const d = await r.json();
        renderPlayers(d.players || [], d.maxPlayers || 20);
        if (d.lastConnected) { lastConnectedISO = d.lastConnected; document.getElementById('last-conn').textContent = fmtLastConn(d.lastConnected); }
    } catch (_) { setTopStatus(false); }
    refreshPing();
    connectWS();
    setInterval(refreshPing, 30000);
    // Refresh last-conn display every minute (for relative time accuracy)
    setInterval(() => { if (lastConnectedISO) document.getElementById('last-conn').textContent = fmtLastConn(lastConnectedISO); }, 60000);
}

init();
