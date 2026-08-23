const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');

// ==================== UUID 位置 ====================
// 下面这行就是你的 UUID，你可以直接在这里修改，或者在 Livemy 的环境变量里设置 UUID
const UUID_STR = process.env.UUID || 'de0b29a6-ae3e-4b96-a513-e4c1404c0529';
// ===================================================

const UUID = UUID_STR.replace(/-/g, '');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World');
});

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
    console.log(`VLESS Node running on port ${PORT}`);
    console.log(`Node UUID: ${UUID_STR}`);
});
