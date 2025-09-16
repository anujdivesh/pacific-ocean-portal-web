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
