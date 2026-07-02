FROM node:20-alpine


# Set working directory
WORKDIR /usr/app

# Install PM2 globally
RUN npm install --global pm2


#RUN apk update && apk add --no-cache ca-certificates


# Copy "package.json" and "package-lock.json" before other files
# Utilise Docker cache to save re-installing dependencies if unchanged
COPY ./package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY ./ ./

RUN chmod -R 755 /usr/app && \
    chmod -R 755 /usr/app/public

# Base path (subpath) support. NEXT_PUBLIC_BASE_PATH is inlined into the build,
# so it must be set BEFORE `npm run build`. Empty = served at root "/".
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH

# Build app
RUN npm run build --omit-dev

# Expose the listening port
EXPOSE 3000
RUN chown -R node:node /usr/app
# Run container as non-root (unprivileged) user
# The "node" user is provided in the Node.js Alpine base image
USER node

# Launch app with PM2
CMD [ "pm2-runtime", "start", "npm", "--", "start" ]
