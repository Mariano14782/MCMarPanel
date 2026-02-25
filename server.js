const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');
const { Rcon } = require('rcon-client');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = parseInt(process.env.PORT) || 3007;
const RCON_HOST = process.env.RCON_HOST || '';
const RCON_PORT = parseInt(process.env.RCON_PORT) || 25575;
const RCON_PASSWORD = process.env.RCON_PASSWORD || '';
const MC_LOCAL_HOST = process.env.MC_LOCAL_HOST || '';
const MC_LOCAL_PORT = parseInt(process.env.MC_LOCAL_PORT) || 25565;
const MC_EXT_HOST = process.env.MC_EXT_HOST || '';
const MC_EXT_PORT = parseInt(process.env.MC_EXT_PORT) || 25565;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Persistent RCON ---
let rconClient = null;
let rconConnected = false;
let rconReconnectTimeout = null;
let lastConnected = null;

async function connectRcon() {
    if (rconClient) { try { await rconClient.end(); } catch (_) { } }
    rconClient = new Rcon({ host: RCON_HOST, port: RCON_PORT, password: RCON_PASSWORD, timeout: 5000 });
    rconClient.on('end', () => {
        rconConnected = false;
        clearTimeout(rconReconnectTimeout);
        rconReconnectTimeout = setTimeout(connectRcon, 5000);
    });
    rconClient.on('error', () => { rconConnected = false; });
    try {
        await rconClient.connect();
        rconConnected = true;
        lastConnected = new Date().toISOString();
        console.log(`[RCON] Connected to ${RCON_HOST}:${RCON_PORT}`);
        bcast({ event: 'rcon_status', connected: true, lastConnected });
    } catch (err) {
        rconConnected = false;
        console.error('[RCON] Error:', err.message);
        clearTimeout(rconReconnectTimeout);
        rconReconnectTimeout = setTimeout(connectRcon, 5000);
    }
}

async function rconCmd(command) {
    if (!rconConnected || !rconClient) return { ok: false, response: 'RCON not connected' };
    try {
        const response = await rconClient.send(command);
        lastConnected = new Date().toISOString();
        return { ok: true, response };
    } catch (err) {
        rconConnected = false;
        setTimeout(connectRcon, 1000);
        return { ok: false, response: err.message };
    }
}

// --- Log buffer ---
const LOG_BUF = 200;
const logBuffer = [];
function pushLog(type, text) {
    const entry = { type, text, time: new Date().toISOString() };
    logBuffer.push(entry);
    if (logBuffer.length > LOG_BUF) logBuffer.shift();
    bcast({ event: 'log', ...entry });
}
function bcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

// --- Smart player polling (only logs on change) ---
let currentPlayers = [];
let maxPlayers = 20;

async function pollPlayers() {
    if (!rconConnected) return;
    const result = await rconCmd('list');
    if (!result.ok) return;
    const match = result.response.match(/There are (\d+) of a max of (\d+) players online: ?(.*)/);
    if (!match) return;
    const newPlayers = match[3] ? match[3].split(', ').filter(Boolean) : [];
    maxPlayers = parseInt(match[2]);
    const prev = [...currentPlayers].sort().join(',');
    const curr = [...newPlayers].sort().join(',');
    if (prev !== curr) {
        newPlayers.filter(n => !currentPlayers.includes(n)).forEach(n => pushLog('info', `✦ ${n} joined`));
        currentPlayers.filter(n => !newPlayers.includes(n)).forEach(n => pushLog('info', `✧ ${n} left`));
        currentPlayers = newPlayers;
        bcast({ event: 'players', players: currentPlayers, maxPlayers });
    }
    bcast({ event: 'count', count: currentPlayers.length, maxPlayers, lastConnected });
}
setInterval(pollPlayers, 10000);

// --- TCP Ping ---
function tcpPing(host, port, timeout = 4000) {
    return new Promise(resolve => {
        const s = new net.Socket();
        let done = false;
        const fin = v => { if (!done) { done = true; s.destroy(); resolve(v); } };
        setTimeout(() => fin(false), timeout);
        s.connect(port, host, () => fin(true));
        s.on('error', () => fin(false));
    });
}

// --- API ---
app.get('/api/status', (req, res) => {
    res.json({ rconOnline: rconConnected, players: currentPlayers, maxPlayers, lastConnected });
});
app.get('/api/players', (req, res) => {
    res.json({ players: currentPlayers, maxPlayers });
});
app.post('/api/command', async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ ok: false });
    pushLog('command', '> ' + command);
    const r = await rconCmd(command);
    pushLog(r.ok ? 'response' : 'error', r.response || '(no response)');
    res.json(r);
});
app.get('/api/logs', (req, res) => res.json({ logs: logBuffer }));
app.get('/api/ping-servers', async (req, res) => {
    const [local, external] = await Promise.all([
        tcpPing(MC_LOCAL_HOST, MC_LOCAL_PORT),
        tcpPing(MC_EXT_HOST, MC_EXT_PORT),
    ]);
    res.json({
        local: { host: `${MC_LOCAL_HOST}:${MC_LOCAL_PORT}`, online: local },
        external: { host: MC_EXT_HOST, online: external },
    });
});
app.post('/api/restart', async (req, res) => {
    pushLog('command', '> stop [restarting service...]');
    const r = await rconCmd('stop');
    pushLog(r.ok ? 'info' : 'error', r.ok ? 'Server stopped. The service will restart automatically.' : r.response);
    res.json(r);
});
app.post('/api/tell', async (req, res) => {
    const { player, message } = req.body;
    if (!message) return res.status(400).json({ ok: false });
    const cmd = player && player !== '__all__' ? `tell ${player} ${message}` : `say ${message}`;
    pushLog('command', '> ' + cmd);
    const r = await rconCmd(cmd);
    pushLog(r.ok ? 'response' : 'error', r.response || '(sent)');
    res.json(r);
});

// --- WebSocket ---
wss.on('connection', ws => {
    ws.send(JSON.stringify({ event: 'history', logs: logBuffer }));
    ws.send(JSON.stringify({ event: 'players', players: currentPlayers, maxPlayers }));
    ws.send(JSON.stringify({ event: 'count', count: currentPlayers.length, maxPlayers, lastConnected }));
    ws.on('message', async raw => {
        try {
            const data = JSON.parse(raw);
            if (data.type === 'command') {
                pushLog('command', '> ' + data.command);
                const r = await rconCmd(data.command);
                pushLog(r.ok ? 'response' : 'error', r.response || '(no response)');
            }
        } catch (_) { }
    });
});

// --- Start ---
server.listen(PORT, async () => {
    console.log(`\n✅ MCMarPanel running at http://localhost:${PORT}`);
    console.log(`   RCON target: ${RCON_HOST}:${RCON_PORT}\n`);
    await connectRcon();
    pollPlayers();
});
