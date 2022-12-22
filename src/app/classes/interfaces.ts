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
  ping(): Observable<void>;
  close(): void;
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