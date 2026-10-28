FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY prisma.config.js ./
COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.prisma

COPY src ./src
RUN mkdir -p /app/storage/private/signatures \
    && chown -R node:node /app

USER node
ENV NODE_ENV=production
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]

