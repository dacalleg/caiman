import struct from "../classes/struct";
import {
  BehaviorSubject,
  from,
  fromEvent,
  map,
  Observable,
  of,
  retry,
  shareReplay,
  Subject,
  switchMap,
  take,
  tap
} from "rxjs";
import { BLESerialDevice, Channel, SerialConnectionSettings, Variable, VariableValue } from "./interfaces";

export class BleChannel implements Channel {
  private connection$: Observable<BLESerialDevice> | null;
  private stream$: Subject<Uint8Array>;
  private settings: SerialConnectionSettings;

  constructor(settings: SerialConnectionSettings) {
    this.connection$ = null;
    this.stream$ = new Subject<Uint8Array>();
    this.settings = settings;
  }

  write(variables: VariableValue[]): Observable<VariableValue[]> {
    throw new Error("Method not implemented.");
    /*if(this.connection$)
      return this.connection$.pipe(
        switchMap(device => from(device.tx.writeValue(new Uint8Array([0, ...data])))
          .pipe(
            switchMap(() => this.stream$.asObservable().pipe(take(1))),
            map((buff: Uint8Array) => {
              if (buff.length === 0) {
                throw new Error("Buffer empty");
              }
              return buff;
            }),
          )
        )
      );*/
  }

  connect() {
    //@ts-ignore
    const promise = navigator.bluetooth.requestDevice({ filters: [{ services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] }] })
      .then(async (device: any) => {
        const server = await device.gatt.connect() as any;
        const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e') as any;
        const tx = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e') as any;
        const rx = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e') as any;
        const msg = JSON.stringify({ cmd: "BridgeOn", rx: 22, tx: 23, crl: 21, b: this.settings.baudRate, d: this.settings.dataBits, s: this.settings.stopBits });
        const data = Uint8Array.from(Array.from(msg).map(letter => letter.charCodeAt(0)));
        await tx.writeValue(data)
        await rx.startNotifications();
        return { device, server, service, tx, rx } as BLESerialDevice;
      }) as Promise<BLESerialDevice>;

    this.connection$ = from(promise).pipe(shareReplay(1));
    this.connection$.pipe(
      switchMap(device =>
        fromEvent(device.rx, "characteristicvaluechanged").pipe(
          map((event: any) => new Uint8Array(event.target.value.buffer))
        ))).subscribe(data => {
          this.stream$.next(data)
        });
    return this.connection$.pipe(switchMap(() => of(void 0)));
  }

  close(): void {
    this.connection$?.pipe(
      take(1)
    ).subscribe((data) => {
      data.device.gatt.disconnect()
    })
  }

  read(variables: Variable[]): Observable<VariableValue[]> {
    throw new Error("Method not implemented.");
  }
  setVariableStream(variables: Variable[]): Observable<void> {
    throw new Error("Method not implemented.");
  }
  getStream(): Observable<VariableValue[]> {
    throw new Error("Method not implemented.");
  }
  ping(): Observable<void> {
    throw new Error("Method not implemented.");
  }
}
