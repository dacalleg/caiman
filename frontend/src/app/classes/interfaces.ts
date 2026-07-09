import { Observable } from "rxjs";

export interface SeramiEntry {
  key?: string;
  name: string;
  data: Variable[];
}

export interface Variable {
  address: number
  bit: number
  bits?: (string | null)[] | null
  group: string
  hash: string
  mask?: number
  max?: number
  memory: string
  min?: number
  name: string
  pattern: string
  readExp?: string | null
  readonly: boolean
  sanitizedName: string
  type: string
  values?: string[][] | null
  writeExp?: string | null
  signed: boolean,
  formatstring: string
  description?: string
  varKey?: string
  sort?: number
  step?: number
  colors?: VariableColor[];
  genFn?: string
  button?: boolean;
  caption?: string;
  buttonValue?: number;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
}

export interface VariableColor
{
  condition: Condition;
  color: string;
}

export interface Condition
{
  value: number;
  operator: string;
}

export interface Project {
  variables: Variable[];
  view: ViewOption;
  device?: DeviceProduct;
}

export interface ViewOption {
  addressFormat: number;
  modbus: boolean;
  modbusEEpromOffset: number;
  extendedView: boolean;
}

export interface DeviceData {
  startAddress: number;
  memory: string;
  buffer: Uint8Array;
}

export interface Page {
  start: number;
  end: number;
  eeprom: boolean;
}


export interface SerialConnectionSettings {
  baudRate: number;
  dataBits: number,
  stopBits: number;
  parity: string;
  readTimeout: number;
}

export interface BLESerialDevice {
  device: any;
  server: any;
  service: any;
  tx: any;
  rx: any;
}

export interface VariableValue {
  variable: Variable;
  value: number | string;
}

export interface VariableWriteResponse {
  from: VariableValue[];
  set: VariableValue[];
  written: VariableValue[];
}

export interface Channel {
  connect(): Observable<void>;
  write(variables: VariableValue[]): Observable<VariableWriteResponse>;
  read(variables: Variable[]): Observable<VariableValue[]>;
  setVariableStream(variables: Variable[]): Observable<void>;
  getStream(): Observable<VariableValue[]>;
  ping(): Observable<boolean>;
  disconnect(): Observable<void>;
  setWifi(ssid: string, password: string): Observable<void>;
  getWifiStatus(): Observable<WifiStatus>;
  disconnectWifi(): Observable<void>;
  loadGatewayFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus>;
  loadPowerBoardFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus>;
}


export interface ChannelProtocol {
  readVariable(variable: Variable): Observable<Uint8Array>;
  writeVariable(variable: Variable, buffer: Uint8Array): Observable<Uint8Array>;
}


export interface OptimizationInput {
  variable: Variable | null;
  from: number;
  to: number;
}


export interface OptimizationOutput {
  variable: Variable | null;
  target: number;
}

export interface LoginResponse {
  success: boolean;
  statusCode: number;
  code: string;
  message: string;
  data: LoginData;
}

export interface LoginData {
  token: string;
  id: number;
  email: string;
  nicename: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

export interface BoardsStatus {
  Type: string;
  Revision: string;
  Id: string;
  Restart_cnt: number;
}


export interface DeviceProduct {
  id_device: string;
  customer_code: string;
  mac: string;
  boards_status?: BoardsStatus;
  id_product: string;
  cod_art: string;
  serial: string;
  name_product: string;
  description: string;
  product_serial: string;
  name_devices_products: string;
  description_devices_products: string;
  creation_date: Date;
  update_date?: any;
  country: string;
  state: string;
  city: string;
  attribute?: any;
  email_master: string;
  id_client_master: string;
  security_code: string;
  info: ProductModel;
}

export interface DeviceInfoResponse {
  Success: boolean;
  Text: string;
  Value: boolean;
  device_product: DeviceProduct[] | null;
}

export interface Board {
  id: string;
  serami_acl: SeramiACL[];
  firmware_list: Firmware[];
  database: Database[];
  serami_var_formula_override: any[];
  key: string;
}

export interface Gateway {
  type: string;
  board: number;
  firmware_list: Firmware[];
}

export interface ProductModel {
  id_product: string;
  id: number;
  name: string;
  documents: Document[];
  links: Link[];
  image: string | null;
  serami_acl: SeramiACL[];
  faq: SingleFaq[];
  video: Video[];
  serami_var_override: VariableInfoOverride[];
  serami_group_override: GroupNameOverride[];
  gateway_firmware_list: Firmware[];
  board_firmware_list: Firmware[];
  variables: Variable[];
  database: Database[];
  description: string;
  prefix?: string;
}

export interface GroupNameOverride {
  name: string;
  title: string;
}

export interface VariableInfoOverride {
  id: string;
  title?: string;
  description?: string;
  options?: { [key: string]: string }
  read_exp?: string;
  write_exp?: string;
  writable?: boolean;
}

export interface Video {
  name: string;
  description: string;
  video: string;
}

export interface SeramiACL extends WithRole {
  hidden_groups: string[];
  hidden_variables: string[];
  only_read_variables: string[];
  writable_variables: string[];
}

export interface SingleFaq {
  question: string;
  response: string;
}

export interface Document extends WithRole {
  name: string;
  file: string;
}

export interface Link extends WithRole
{
  name: string;
  link: string;
}


export interface AguaOptions {
  agua_endpoint: string;
  agua_hostname: string;
  agua_id_brand: number;
  agua_customer_code: number;
}

export interface AlertModalConfig {
  title: string;
  message?: string;
  progress?: boolean;
  progressValue?: number;
  replaceParams?: { [key: string]: string };
}

export interface Firmware extends WithRole {
  revision: string;
  file: number;
}


export interface Database extends WithRole {
  name: string;
  values: DatabaseValue[]
}

export interface WithRole {
  role: string;
}

export interface DatabaseValue {
  id: string;
  value: string;
}

export interface Translation {
  id: number,
  lang: string,
  name: string,
  values: { [key: string]: string };
}

export interface WifiStatus {
  wifi_connected: boolean;
  cloud_connected: boolean;
  wifi_stations: WifiStation[];
}

export interface WifiStation {
  ssid: string;
  channel: number;
  rssi: number;
  bssid: string;
}

export interface User{
  name: string;
  surname: string;
  email: string;
  password?: string;
  fiscal_code: string;
  business_name: string;
  address:string;
  street_number: string;
  phone: string;
  mobile: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  tokens?: string;
  flat_license_expiration?: string;
  last_token_usage?: string;
}

export interface UserField extends User {
  language: string;
}

export interface UserData {
  id: number;
  email: string;
  name: string;
  surname: string;
  display_name: string;
  fields: UserField;
}

export interface Ticket {
  id: string;
  text: string | null;
  title: string | null;
  serial: string;
  email: string;
  status: string;
  customer: number;
  children: Ticket[];
  assets: TicketAsset[];
  createdAt: Date;
}

export interface TicketAsset {
  path: string;
}

export interface FirmwareDownloadStatus {
  operation: number;
  progress: number;
}

export enum LogType {
  WRITE_VARIABLE = 0,
  START_UPDATE_POWER_BOARD = 1,
  ERROR_UPDATE_POWER_BOARD = 2,
  SUCCESS_UPDATE_POWER_BOARD = 3,
  UPDATE_GATEWAY = 4,
}

export interface LogItem {
  date: Date;
  type: LogType;
  data?: string | number | boolean;
  from?: number | string;
  set?: number | string;
  written?: number | string;
  variable?: string;
  user?: string
}

export interface GroupLogItem {
  date: Date;
  logs: LogItem[];
}

export interface Info {
  logo: string;
}

export interface Country
{
  name: string;
  code: string;
}

export interface OperationData
{
  type: string;
  description: string;
  replaced_components: string;
  breakdowns: string[];
  condition: string;
  warranty: string;
  e_system: string;
  hp_system: string;
  se_system: string;
  li_suitability: string;
  spaces_respected: string;
  presence_ventilation_opening: string;
  vent_opening_appropriate: string;
  vent_opening_free: string;
  correct_sections: string;
  sh_section_limits: string;
  correct_slope: string;
  length_se_sections: number;
  vs_length: number;
  bends_45: number;
  bends_90: number;
  smoke_pipe_section:number;
  chimney_section: number;
  t_inspection: string;
  conservation_status: string;
  exhaust_duct_leaks: string;
  roof_smoke_exhaust: string;
  windproof_chimney: string;
  chimney_insulation: string;
  draught_classification: number;
  draught_value: number;
  registry?: Registry;
  service?: User
}

export interface Operation
{
  key?: string;
  serial: string;
  user: string;
  createdAt?: Date;
  confirmed_date: Date|null;
  email_confirmed: boolean;
  web_confirmed: boolean;
  data: OperationData
}

export interface Registry
{
  serial: string;
  fiscal_code: string;
  business_name: string;
  name: string;
  surname:string;
  email:string;
  address:string;
  street_number: string;
  phone: string;
  mobile: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  purchase_date: Date;
  first_ignition_date: Date;
  dealer: string;
  invoice: string;
  warranty: string;
  user: string;
  createdAt?: Date;
}

export interface Toast {
  message: string,
  delay: number
  id?: number;
  classes: string;
}

export interface Failure
{
  name: string;
  key: string;
  description: string;
}


export interface EnvObj
{
  production: boolean;
  host: string;
  endpoint: string;
  tickets_enabled: boolean,
  registry_enabled: boolean,
  operation_enabled: boolean,
  only_op_enabled: boolean,
  hide_micronova_ref: boolean,
  chatbot_url: string,
  website_url: string,
}
