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
CMD ["sh", "-c", "echo '===== DOCKERFILE CMD STARTING =====' && echo 'PORT env='$PORT && echo 'NODE_ENV='$NODE_ENV && echo 'API_PORT='$API_PORT && echo '===== running db push =====' && npx prisma db push --skip-generate --accept-data-loss && echo '===== db push done, launching node =====' && node dist/index.js ; echo '===== NODE EXITED (code='$?') ====='"]
