import {EnvObj} from "../app/classes/interfaces";

export const environment = {
  production: true,
  host: window.location.host,
  endpoint: window.location.origin + "/backend",
  tickets_enabled: true,
  registry_enabled: true,
  operation_enabled: true,
  only_op_enabled: true,
} as EnvObj;
