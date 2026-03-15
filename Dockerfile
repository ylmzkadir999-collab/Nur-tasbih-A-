FROM node:20-alpine
# better-sqlite3 v11 ships prebuilt binaries for Node 18/20/22 on Alpine
# No build-essential needed when using prebuilts
WORKDIR /app
COPY package*.json ./
# Use npm ci for reproducible installs; --ignore-scripts skips any gyp rebuild
# (v11 prebuilds make this safe)
RUN npm ci --omit=dev
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
