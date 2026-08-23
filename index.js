const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');

// 固定 UUID，可在此修改或通过环境变量覆盖
const UUID_STR = process.env.UUID || 'de0b29a6-ae3e-4b96-a513-e4c1404c0529';
const UUID = UUID_STR.replace(/-/g, '');
const PORT = process.env.PORT || 3000;

// 伪装 HTML 页面内容
const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Hub - Operational</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .card { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; text-align: center; }
        .status-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.1); color: #4ade80; padding: 6px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600; margin-bottom: 20px; border: 1px solid rgba(34, 197, 94, 0.2); }
        .status-dot { width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; color: #fff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #0f172a; padding: 16px; border-radius: 12px; text-align: left; font-size: 12px; color: #64748b; }
        .metrics div span { display: block; color: #f1f5f9; font-weight: 600; font-size: 14px; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="status-badge">
            <span class="status-dot"></span> Service Operational
        </div>
        <h1>Application Gateway</h1>
        <p>Node.js runtime environment is healthy and responding to traffic.</p>
        <div class="metrics">
            <div>Status<span>200 OK</span></div>
            <div>Protocol<span>HTTP/WS</span></div>
        </div>
    </div>
</body>
</html>`;

// HTTP 服务：响应伪装网页（通过平台健康检查）
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

// WebSocket 服务：响应 VLESS 代理流量
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    ws.once('message', (msg) => {
        if (msg.length < 18) return ws.close();
        const clientUuid = msg.subarray(1, 17).toString('hex');
        if (clientUuid !== UUID) return ws.close();

        const port = msg.readUInt16BE(18);
        const atype = msg[20];
        let host = '', offset = 21;

        if (atype === 1) { 
            host = msg.subarray(21, 25).join('.'); 
            offset = 25; 
        } else if (atype === 2) { 
            const len = msg[21]; 
            host = msg.subarray(22, 22 + len).toString(); 
            offset = 22 + len; 
        }

        const rawHeaderLen = offset;
        const socket = net.connect(port, host, () => {
            ws.send(Buffer.from([msg[0], 0]));
            if (msg.length > rawHeaderLen) socket.write(msg.subarray(rawHeaderLen));
            ws.on('message', (data) => socket.write(data));
            socket.on('data', (data) => ws.send(data));
        });

        socket.on('error', () => ws.close());
        ws.on('close', () => socket.destroy());
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
