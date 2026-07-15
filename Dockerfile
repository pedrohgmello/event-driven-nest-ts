## Build stage
FROM node:24-alpine AS build

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY . .

RUN npm run build

## Production stage

FROM node:24-alpine AS production

WORKDIR /app
COPY ./package*.json ./
RUN npm ci --omit=dev
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]


