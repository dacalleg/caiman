FROM nginx
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs
COPY . /usr/share/nginx/html
RUN cd /usr/share/nginx/html && npm install
RUN cd /usr/share/nginx/html && npm run build
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-healthcheck /usr/local/bin/
HEALTHCHECK CMD ["docker-healthcheck"]
