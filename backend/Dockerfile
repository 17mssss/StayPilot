FROM node:20-alpine

WORKDIR /app

# Installer les dépendances d'abord (cache Docker)
COPY package*.json ./
RUN npm install --omit=dev

# Copier le code source
COPY src/ ./src/

# Utilisateur non-root
RUN addgroup -S staypilot && adduser -S staypilot -G staypilot
USER staypilot

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
