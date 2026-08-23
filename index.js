const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');

// 固定 UUID，可直接使用或在 Livemy 环境变量中覆盖
const UUID_STR = process.env.UUID || 'de0b29a6-ae3e-4b96-a513-e4c1404c0529';
const UUID = UUID_STR.replace(/-/g, '');
const PORT = process.env.PORT || 3000;

// HTTP 服务：专门应对 Livemy 平台的健康检查
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server is active');
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
    console.log(`Server listening on port ${PORT}`);
    console.log(`Node UUID: ${UUID_STR}`);
});
