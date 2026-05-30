FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

FROM base AS build
ENV NODE_ENV=development
COPY package.json ./
RUN npm install --include=dev
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 4000
# db push can fail when Neon's free tier is auto-suspended — retry a few times
# while Neon wakes up, then continue even if it ultimately fails. Node will
# retry the DB connection at request time anyway.
CMD ["sh", "-c", "echo '===== DOCKERFILE CMD STARTING =====' && echo 'PORT env='$PORT && echo 'NODE_ENV='$NODE_ENV && echo 'API_PORT='$API_PORT && for i in 1 2 3 4 5; do echo \"===== db push attempt $i =====\" && npx prisma db push --skip-generate --accept-data-loss && echo '===== db push OK =====' && break || echo \"===== db push failed, sleeping 6s =====\" && sleep 6; done; echo '===== launching node (db push may have failed, that is fine) =====' && node dist/index.js ; echo '===== NODE EXITED (code='$?') ====='"]
