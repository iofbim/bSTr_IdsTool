## Build stage
FROM node:20-alpine AS deps
WORKDIR /app

# Build-time args to configure Next.js and public envs
ARG NEXT_BASE_PATH=""
ARG NEXT_PUBLIC_BSDD_MAX_LIMIT
ARG NEXT_PUBLIC_BSDD_PAGE_SIZE
ARG NEXT_PUBLIC_BSDD_LANG
ARG BSDD_TRANSPORT
ARG BSDD_GQL_URL
ARG BSDD_GQL_TOKEN

# Ensure these are visible to `next build`
ENV NEXT_BASE_PATH=$NEXT_BASE_PATH \
    NEXT_PUBLIC_BSDD_MAX_LIMIT=$NEXT_PUBLIC_BSDD_MAX_LIMIT \
    NEXT_PUBLIC_BSDD_PAGE_SIZE=$NEXT_PUBLIC_BSDD_PAGE_SIZE \
    NEXT_PUBLIC_BSDD_LANG=$NEXT_PUBLIC_BSDD_LANG \
    BSDD_TRANSPORT=$BSDD_TRANSPORT \
    BSDD_GQL_URL=$BSDD_GQL_URL \
    BSDD_GQL_TOKEN=$BSDD_GQL_TOKEN

# Install dependencies and build
COPY package.json package-lock.json ./
COPY . .
RUN npm ci && npm run build

## Runtime stage
FROM node:20-alpine
WORKDIR /app

# Add Python for IfcTester support
RUN apk add --no-cache python3 py3-pip && \
    python3 -m pip install --no-cache-dir --upgrade pip && \
    python3 -m pip install --no-cache-dir ifcopenshell ifctester

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    PYTHON=/usr/bin/python3

# Copy Next.js standalone output
COPY --from=deps /app/.next/standalone ./
COPY --from=deps /app/.next/static ./.next/static
COPY --from=deps /app/public ./public

# Ensure the server starts from the entry server
EXPOSE 3000
CMD ["node", "server.js"]
