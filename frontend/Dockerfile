FROM nginx

RUN curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh > install.sh
RUN bash install.sh
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install 18.18.2
RUN . "$NVM_DIR/nvm.sh" && nvm use v18.18.2
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v18.18.2
ENV PATH="/root/.nvm/versions/node/v18.18.2/bin/:${PATH}"

COPY . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/node_modules
RUN rm -rf /usr/share/nginx/html/.angular
RUN cd /usr/share/nginx/html && npm install
RUN cd /usr/share/nginx/html && npm run build
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-healthcheck /usr/local/bin/
HEALTHCHECK CMD ["docker-healthcheck"]
