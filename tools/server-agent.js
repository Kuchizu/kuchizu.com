const http = require('http');
const { execSync } = require('child_process');
const os = require('os');

const NAME = process.env.NAME || os.hostname();

http.createServer((req, res) => {
    if (req.url !== '/status') return res.end();

    let pm2 = [];
    try { pm2 = JSON.parse(execSync('pm2 jlist').toString()); } catch {}

    const processes = pm2.map(p => ({
        status: p.pm2_env?.status || 'unknown',
        cpu: p.monit?.cpu || 0,
        memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
        uptime: p.pm2_env?.pm_uptime ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 3600000) : 0
    }));

    const online = processes.filter(p => p.status === 'online');

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        name: NAME,
        uptime: Math.floor(os.uptime() / 86400),
        memory: Math.round((1 - os.freemem() / os.totalmem()) * 100),
        processes: {
            online: online.length,
            total: processes.length,
            cpu: Math.round(online.reduce((sum, p) => sum + p.cpu, 0) * 10) / 10,
            memory: online.reduce((sum, p) => sum + p.memory, 0)
        }
    }));
}).listen(9999);
