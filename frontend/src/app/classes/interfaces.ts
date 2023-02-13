import { Observable } from "rxjs";

export interface Variable {
  address: number
  binaryMask?: string
  bit: number
  bits?: (string | null)[] | null
  group: string
  hash: string
  hexMask?: string
  mask?: number
  max?: number
  memory: string
  min?: number
  name: string
  pattern: string
  readExp?: string | null
  readExpPy?: string[] | null
  readonly: boolean
  sanitizedName: string
  type: string
  values?: string[][] | null
  write: boolean
  writeExp?: string | null
  writeExpPy?: string[] | null
  hide?: boolean,
  signed: boolean,
  formatstring: string
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
  value: number;
}

export interface Channel {
  connect(): Observable<void>;
  write(variables: VariableValue[]): Observable<VariableValue[]>;
  read(variables: Variable[]): Observable<VariableValue[]>;
  setVariableStream(variables: Variable[]): Observable<void>;
  getStream(): Observable<VariableValue[]>;
  ping(): Observable<boolean>;
  disconnect(): Observable<void>;
  setWifi(ssid: string, password: string): Observable<void>;
  getWifiStatus(): Observable<WifiStatus>;
  disconnectWifi(): Observable<void>;
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

export interface DeviceProduct {
  id_device: string;
  customer_code: string;
  mac: string;
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
  info: ProductInfo;
}

export interface DeviceInfoResponse {
  Success: boolean;
  Text: string;
  Value: boolean;
  device_product: DeviceProduct[];
}

export interface Board
{
  id: string;
  serami_file: number;
  serami_acl: SeramiACL[];
  gateway_firmware_list: GatewayFirmware[];
  database: Database[];
}


export interface ProductInfo {
  id_product: string;
  id: number;
  name: string;
  serami_file: number;
  documents: Document[];
  image: string | null;
  serami_acl: SeramiACL[];
  faq: SingleFaq[];
  video: Video[];
  gateway_firmware_list: GatewayFirmware[];
  serami_var_override: VariableInfoOverride[];
  serami_group_override: GroupNameOverride[];
  database: Database[];
  description: string;
}

export interface GroupNameOverride {
  name: string;
  title: string;
}

export interface VariableInfoOverride {
  id: string;
  title: string;
  description: string;
}

export interface Video {
  name: string;
  description: string;
  video: string;
}

export interface SeramiACL extends WithRole {
  hidden_groups: string[];
  hidden_variables: string[];
}

export interface SingleFaq {
  question: string;
  response: string;
}

export interface Document extends WithRole {
  name: string;
  file: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  created: Date;
  parent: string | null;
  customer: boolean;
  device: string;
}

export interface AguaOptions {
  agua_endpoint: string;
  agua_hostname: string;
  agua_id_brand: number;
  agua_customer_code: number;
}

export interface AlertModalConfig
{
  title: string;
  message?: string;
  progress?: boolean;
  progressValue?: number;
}

export interface GatewayFirmware extends WithRole
{
  version: string;
  file: number;
}


export interface Database extends WithRole
{
  name: string;
  values: DatabaseValue[]
}

export interface WithRole
{
  role: string;
}

export interface DatabaseValue
{
  id: string;
  value: string;
}

export interface Translation {
  id: number,
  lang: string,
  name: string,
  values: { [key: string]: string };
}

export interface WifiStatus
{
  wifi_connected: boolean;
  cloud_connected: boolean;
  wifi_stations: WifiStation[];
}

export interface WifiStation
{
  ssid: string;
  channel: number;
  rssi: number;
  bssid: string;
}