ARG NODE_VERSION=22.17.0

# Create build stage.
# Pin the build stage to the *build* machine's architecture ($BUILDPLATFORM) so
# the toolchain (esbuild/Vite) runs natively instead of under QEMU emulation —
# emulating the amd64 esbuild on an arm64 host crashes it with random faults.
# Nuxt's .output is portable JavaScript, so the final stage can still target a
# different architecture (e.g. linux/amd64) than the one we build on.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-slim AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the manifests first so this layer is cached unless dependencies change.
COPY ./package.json ./package-lock.json /app/

# Install exactly what the lockfile pins (reproducible), not a fresh resolve.
# The npm bundled with this Node image (10.9.2) crashes on the current
# dependency tree with "Cannot read properties of null (reading 'edgesOut')" —
# an arborist bug fixed in npm 11 — and it also can't read a lockfile written by
# npm 11. Upgrade npm to match the lockfile's generator, then `npm ci`.
RUN npm install -g npm@11 && npm ci

# Copy the rest of the application files to the working directory
COPY . ./

# Build the application
RUN npm run build

# Create a new stage for the production image
FROM node:${NODE_VERSION}-slim

# Set the working directory inside the container
WORKDIR /app

# Copy entrypoint FIRST (needed for ENTRYPOINT)
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy the output from the build stage to the working directory
COPY --from=build /app/.output ./

# Define environment variables
ENV HOST=0.0.0.0 NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096

# Create non-root user for security
RUN groupadd -r nodejs && \
    useradd -r -g nodejs nodejs

# Create the uploads directory and make it writable by the non-root user, then
# mark it as a volume so uploaded files persist across container recreations
# (instead of living only in the ephemeral container layer).
RUN mkdir -p /app/public/uploads && \
    chown -R nodejs:nodejs /app/public/uploads
VOLUME ["/app/public/uploads"]

USER nodejs

# Expose the port the application will run on
EXPOSE 3000

# Probe the app's health endpoint (which also checks DB connectivity). Uses
# Node's global fetch so no extra tools (curl/wget) are needed in the slim image.
# A longer start period gives the server time to boot and run migrations.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"

# Start the application
CMD ["node", "/app/server/index.mjs"]
ENTRYPOINT ["/entrypoint.sh"]
