FROM rabbitmq:management
COPY ./rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY ./enabled_plugins /etc/rabbitmq/enabled_plugins
COPY docker-healthcheck /usr/local/bin/
HEALTHCHECK CMD ["docker-healthcheck"]
