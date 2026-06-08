ARG NODE_VERSION=22.14.0

# Build Stage
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies (use npm or yarn depending on existence)
# Added --legacy-peer-deps to match user style
RUN if [ -f yarn.lock ]; then yarn install; else npm install --legacy-peer-deps; fi

# Copy everything else
COPY . .

# Build the Vite app
RUN npm run build

# Production Stage
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

# Install git and docker CLI utilities to check/rebuild from inside container
RUN apk add --no-cache git docker-cli docker-cli-compose

# Install only production dependencies
COPY --chown=node:node package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy the build output, server script, and entrypoint
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.js ./
COPY --from=build --chown=node:node /app/entrypoint.sh /usr/local/bin/

# Make the entrypoint script executable
RUN chmod +x /usr/local/bin/entrypoint.sh

# Use the non-root node user provided by the base image
USER node

# Set the entrypoint to handle dynamic configuration
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command to start the application using npm start
CMD ["npm", "start"]

EXPOSE 3000
ENV NODE_ENV=production
