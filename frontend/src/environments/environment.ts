// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import {EnvObj} from "../app/classes/interfaces";

export const environment = {
  production: false,
  host: "caimanweb-klover.agua-iot.com",
  endpoint: "https://caimanweb-klover.agua-iot.com",
  tickets_enabled: false,
  registry_enabled: true,
  operation_enabled: true,
  only_op_enabled: true,
  hide_micronova_ref: true,
} as EnvObj;

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
