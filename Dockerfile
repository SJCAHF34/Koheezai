# Build and run Koheez.ai (Node/Express + Vite) on Aptible.
# The app reads the PORT environment variable and listens on 0.0.0.0,
# which is what Aptible's proxy expects.
FROM node:20-slim

WORKDIR /app

# Install dependencies (including dev deps needed for the build step).
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build the client + server bundle.
COPY . .
RUN npm run build

ENV NODE_ENV=production

# Aptible injects PORT at runtime; this is just documentation of the default.
EXPOSE 5000

CMD ["npm", "start"]
