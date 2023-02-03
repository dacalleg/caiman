import {Injectable} from '@angular/core';
import {from, Observable, of, shareReplay, throwError} from "rxjs";
import {Channel, SerialConnectionSettings, Variable, VariableValue} from "./interfaces";
import {Lock} from "./lock";

export class SerialChannel implements Channel{
  port: any;
  open: boolean;
  lock: Lock;
  settings: SerialConnectionSettings;
  connection$: Observable<void>|null;

  constructor(settings: SerialConnectionSettings) {
    this.connection$ = null;
    this.open = false;
    this.lock = new Lock();
    this.settings = settings;
  }

  connect() {
    if(this.settings){
      this.connection$ = from(this._connect(this.settings));
      return this.connection$;
    }
    throw throwError(() => new Error("Settings Missing, call setSettings before connect."));  
  }

  close() {
    return from(this._close());
  }

  write(variables: VariableValue[]): Observable<VariableValue[]> {
    throw new Error("Method not implemented.");
    //return from(this.sendToDevice(data))
  }

  async _close() {
    if (this.open) {
      this.lock.releaseLock();
      this.open = false;
      await this.port.close();
    }
  }

  async _connect(settings: SerialConnectionSettings) {
    if (!this.open) {
      this.settings = settings;
      //@ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open(settings);
      this.open = true;
    }
  }

  async sendToDevice(data: Uint8Array) {
    await this.lock.acquireLock();
    const writer = this.port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    let res = await this.readFromDevice(this.settings?.readTimeout);
    this.lock.releaseLock();
    return res;
  }

  async readFromDevice(timeout = 5): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const reader = this.port.readable.getReader();
          const {value, done} = await reader.read();
          reader.releaseLock();
          resolve(value);
        } catch (e) {
          reject(e);
        }
      }, timeout);
    })
  }

  read(variables: Variable[]): Observable<VariableValue[]> {
    throw new Error('Method not implemented.');
  }
  setVariableStream(variables: Variable[]): Observable<void> {
    throw new Error('Method not implemented.');
  }
  getStream(): Observable<VariableValue[]> {
    throw new Error('Method not implemented.');
  }
  ping(): Observable<void> {
    throw new Error('Method not implemented.');
  }
}
