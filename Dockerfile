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

# Copy package.json file to the working directory
COPY ./package.json /app/

## Install dependencies
RUN npm install

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
USER nodejs

# Expose the port the application will run on
EXPOSE 3000

# Start the application
CMD ["node", "/app/server/index.mjs"]
ENTRYPOINT ["/entrypoint.sh"]
