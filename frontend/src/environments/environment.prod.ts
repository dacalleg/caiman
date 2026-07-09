import {EnvObj} from "../app/classes/interfaces";

export const environment = {
  production: true,
  host: window.location.host,
  endpoint: window.location.origin,
  tickets_enabled: true,
  registry_enabled: true,
  operation_enabled: true,
  only_op_enabled: false,
  hide_micronova_ref: true,
  chatbot_url: 'https://jm-poeles.com/test-chatbot-b2b',
  website_url: 'https://jolly-mec.it/it/',
} as EnvObj;
