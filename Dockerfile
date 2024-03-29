# Build Docker image
FROM node:20-bullseye-slim

# Add metadata about the image
LABEL maintainer="Göran Sander mountaindude@ptarmiganlabs.com"
LABEL description="Reads energy data from a Garo GNM3D 3-phase energy meter with Modbus over RS-485 and a Moxa 5630-16."

# Create app dir inside container
WORKDIR /nodeapp

# Install app dependencies separately (creating a separate layer for node_modules, effectively caching them between image rebuilds)
COPY package.json .
RUN npm install

# Copy app's source files
COPY . .

# Create and use non-root user 
RUN groupadd -r nodejs \
   && useradd -m -r -g nodejs nodejs

USER nodejs

# Set up Docker healthcheck
# HEALTHCHECK --interval=12s --timeout=12s --start-period=30s CMD ["node", "docker-healthcheck.js"]

CMD ["node", "src/index.js"]

