import {Injectable} from '@angular/core';
import {from, Observable, shareReplay} from "rxjs";
import {Channel, SerialConnectionSettings} from "./interfaces";
import {Lock} from "./lock";

@Injectable({
  providedIn: 'root'
})
export class SerialChannel implements Channel{
  port: any;
  open: boolean;
  lock: Lock;
  settings: SerialConnectionSettings|null;
  connection$: Observable<void>|null;

  constructor() {
    this.connection$ = null;
    this.open = false;
    this.lock = new Lock();
    this.settings = null;
  }

  connect(settings: SerialConnectionSettings) {
    this.connection$ = from(this._connect(settings));
    return this.connection$;
  }

  close() {
    return from(this._close());
  }

  write(data: Uint8Array) {
    return from(this.sendToDevice(data))
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
}
