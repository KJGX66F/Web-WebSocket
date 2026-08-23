# 选择轻量基础镜像
FROM node:18-alpine

WORKDIR /app

# 复制依赖定义并安装
COPY package*.json ./
RUN npm install --production

# 复制源码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动节点
CMD ["npm", "start"]
