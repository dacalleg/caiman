FROM node:16-buster
WORKDIR /usr/src/app
COPY package*.json ./
COPY healthcheck.js ./
COPY index.js ./
COPY model.js ./
COPY serami-translations-export.js ./
COPY available-languages.js ./
COPY i18n/ ./i18n/

RUN npm install
CMD [ "node", "/usr/src/app/index.js" ]
HEALTHCHECK CMD ["node", "/usr/src/app/healthcheck.js"]
