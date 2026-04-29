FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libsqlite3-dev \
    nginx \
    zip \
    unzip \
    wget && \
    docker-php-source extract && \
    cp /usr/src/php/ext/sqlite3/config0.m4 /usr/src/php/ext/sqlite3/config.m4 && \
    docker-php-ext-install \
    intl \
    pdo_mysql \
    mysqli \
    xml \
    bcmath \
    mbstring \
    zip \
    pdo_sqlite \
    sqlite3 && \
    pecl install apcu && \
    pecl install ast && \
    docker-php-ext-enable apcu ast && \
    docker-php-source delete && \
    cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini && \
    mkdir -p /run/php && chmod -R 755 /run/php && \
    sed -i 's|.*listen =.*|listen=9000|g' /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|.*error_log =.*|error_log=/proc/self/fd/2|g' /usr/local/etc/php-fpm.conf && \
    sed -i 's|.*access.log =.*|access.log=/proc/self/fd/2|g' /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|.*user =.*|user=1000|g' /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|.*group =.*|group=1000|g' /usr/local/etc/php-fpm.d/www.conf && \
    sed -i -e "s/;catch_workers_output[[:space:]]*=[[:space:]]*yes/catch_workers_output = yes/g" /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's#.*variables_order.*#variables_order=EGPCS#g' /usr/local/etc/php/php.ini && \
    sed -i 's#.*date.timezone.*#date.timezone=UTC#g' /usr/local/etc/php/php.ini && \
    sed -i 's#.*clear_env.*#clear_env=no#g' /usr/local/etc/php-fpm.d/www.conf && \
    apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/*

ARG S6_OVERLAY_VERSION=3.1.3.0

ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz

RUN wget -O /bin/wait-for-it.sh https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh
RUN chmod a+x /bin/wait-for-it.sh

COPY start-nginx.sh /etc/services.d/nginx/run
RUN chmod 755 /etc/services.d/nginx/run
COPY start-fpm.sh /etc/services.d/php_fpm/run
RUN chmod 755 /etc/services.d/php_fpm/run
COPY nginx.conf /etc/nginx/nginx.conf
#COPY . /var/www/public

ENTRYPOINT ["/init"]
CMD []
