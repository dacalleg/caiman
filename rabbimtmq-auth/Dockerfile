FROM node:16-alpine
WORKDIR /usr/src/app

COPY server.js ./
COPY package*.json ./
COPY healthcheck.js ./

RUN npm install
HEALTHCHECK CMD ["node", "/usr/src/app/healthcheck.js"]
