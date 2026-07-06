FROM node:16-buster
WORKDIR /usr/src/app
COPY package*.json ./
COPY healthcheck.js ./
COPY index.js ./
COPY models/ ./models/
COPY i18n/ ./i18n/

RUN npm install
CMD [ "node", "/usr/src/app/index.js" ]
HEALTHCHECK CMD ["node", "/usr/src/app/healthcheck.js"]
