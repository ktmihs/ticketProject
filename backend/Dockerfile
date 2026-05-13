FROM node:20-alpine

WORKDIR /app

# 의존성만 먼저 복사해서 레이어 캐시 활용
COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/
COPY scripts/ ./scripts/

EXPOSE 3001

CMD ["node", "src/app.js"]