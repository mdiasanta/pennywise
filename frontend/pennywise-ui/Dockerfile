# Build stage
# Using Node 20 LTS (Active LTS until April 2026)
FROM node:20-alpine AS build
WORKDIR /app

# Build arguments for Vite (must be present at build time)
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL

# Make args available as env vars during build
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static files
RUN rm -rf ./*

# Copy built files from build stage
COPY --from=build /app/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
