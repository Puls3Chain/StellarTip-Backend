# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ src/
COPY test/ test/

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json nest-cli.json tsconfig.json tsconfig.build.json ./

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "dist/main"]
