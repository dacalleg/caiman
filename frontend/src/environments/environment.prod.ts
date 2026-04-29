import {EnvObj} from "../app/classes/interfaces";

export const environment = {
  production: true,
  host: window.location.host,
  endpoint: window.location.origin,
  tickets_enabled: false,
  registry_enabled: true,
  operation_enabled: true,
  only_op_enabled: true,
  hide_micronova_ref: true,
} as EnvObj;
