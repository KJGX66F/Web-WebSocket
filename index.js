const express = require('express');
const app = express();

// livemy.app 会通过环境变量自动分配端口，若无则默认使用 3000
const PORT = process.env.PORT || 3000;
const NODE_SECRET = process.env.NODE_SECRET || 'default-secret-key';

app.use(express.json());

// 节点健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 节点数据处理或 API 服务
app.get('/api/node-info', (req, res) => {
  res.json({
    nodeStatus: 'active',
    timestamp: new Date().toISOString(),
    region: process.env.REGION || 'global'
  });
});

app.listen(PORT, () => {
  console.log(`Node running on port ${PORT}`);
});
