FROM nginx:1.22
RUN apt-get update && apt-get install -y nginx-extras

COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-healthcheck /usr/local/bin/

RUN curl https://ssl-config.mozilla.org/ffdhe2048.txt > /etc/nginx/dhparam
RUN mkdir -p /cache/nginx/tmpfs

HEALTHCHECK CMD ["docker-healthcheck"]
