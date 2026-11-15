
# Use a pinned lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for Docker layer caching
COPY --chown=node:node package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy application source code
COPY --chown=node:node . .

# Run application as non-root user
USER node

# API port
EXPOSE 3000

# API health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Default command: migration + API server
CMD ["npm", "start"]
