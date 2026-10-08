# Copyright (C) 2026 stremio-linux fork. GPL-2.0.
FROM node:26-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY db.js seed.js server.js schema.sql ./
CMD ["node", "server.js"]
