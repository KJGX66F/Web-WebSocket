FROM alpine:latest

# 安装 xray 和 envsubst
RUN apk add --no-co-cache curl bash gettext envsubst

# 下载并安装最新版 Xray
RUN bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install --beta

# 写入 Xray 配置文件模板
RUN echo $'{\n\
  "inbounds": [{\n\
    "port": 3000,\n\
    "protocol": "vless",\n\
    "settings": {\n\
      "clients": [{"id": "${UUID}"}],\n\
      "decryption": "none"\n\
    },\n\
    "streamSettings": {\n\
      "network": "ws",\n\
      "wsSettings": {"path": "${WSPATH}"}\n\
    }\n\
  }],\n\
  "outbounds": [{"protocol": "freedom"}]\n\
}' > /etc/xray/config.json.template

EXPOSE 3000

CMD envsubst < /etc/xray/config.json.template > /etc/xray/config.json && xray -config /etc/xray/config.json
