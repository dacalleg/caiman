import {EnvObj} from "../app/classes/interfaces";

export const environment = {
  production: true,
  host: window.location.host,
  endpoint: window.location.origin + "/backend",
  tickets_enabled: false,
  registry_enabled: false,
  operation_enabled: false,
  only_op_enabled: false,
  hide_micronova_ref: true,
} as EnvObj;
