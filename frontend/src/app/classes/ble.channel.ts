import { Utils } from "./utils";
import {
  BehaviorSubject,
  bufferCount,
  catchError,
  combineLatest,
  concatMap,
  defer,
  delay,
  filter,
  from,
  map,
  Observable,
  of,
  repeat,
  retry,
  shareReplay,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  throwError,
  timeout,
  TimeoutError,
  toArray
} from "rxjs";
import { Channel, Variable, VariableValue } from "./interfaces";

export class BleChannel implements Channel {
  private connection$: Observable<{ device: any, server: any, service: any, characteristic: any }>;
  private stream$: Observable<VariableValue[]>;
  private charatteristics$: BehaviorSubject<any | null>;
  private BLEDevice$: BehaviorSubject<any | null>;
  private bufferVariables$: BehaviorSubject<Variable[]>;
  private close$: Subject<void>;
  private sendCommand$: Subject<{ data: any, chunkSize: number, id: number }>;
  private responses$: Observable<{ id: number, payload: any }>;
  private reconnect$: Observable<void>;

  constructor() {
    this.close$ = new Subject();
    this.charatteristics$ = new BehaviorSubject(null);
    this.BLEDevice$ = new BehaviorSubject(null);
    this.sendCommand$ = new Subject();

    this.reconnect$ = this.BLEDevice$.pipe(
      take(1),
      switchMap((device) => {
        const bledata = async () => {
          const server = await device.gatt.connect() as any;
          const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e') as any;
          const characteristic = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e') as any;
          return { device: device, server: server, service: service, characteristic: characteristic };
        }
        return from(bledata());
      }),
      tap((data) => this.charatteristics$.next(data.characteristic)),
      switchMap(() => this.sendIdentity("93664797").pipe(map(() => void 0))),
      tap(() => this.responses$.subscribe()));

    //@ts-ignore
    this.connection$ = from(navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] })).pipe(
      tap((device) => this.BLEDevice$.next(device)),
      switchMap(() => this.reconnect$.pipe(take(1))),
      shareReplay(1),
    )

    this.close$.pipe(switchMap(() => this.BLEDevice$)).subscribe((device) => device.gatt.disconnect());

    this.bufferVariables$ = new BehaviorSubject<Variable[]>([]);

    this.stream$ = this.bufferVariables$.pipe(
      switchMap((variables) => {
        if (variables.length === 0)
          return of([] as VariableValue[]);
        return of(void 0).pipe(
          switchMap(() => this.setBuffer(variables).pipe(
            switchMap(() => this.readBuffer(variables).pipe(
              repeat({ delay: 500 }),
            )),
          ))
        )
      }),
      catchError((err) => {
        return this.reconnect$.pipe(
          switchMap(() => throwError(() => err))
        )
      }),
      retry(5),
      takeUntil(this.close$),
      shareReplay(1)
    );

    this.responses$ = this.sendCommand$.pipe(
      concatMap((data) => this.charatteristics$.pipe(
        filter(item => item !== null),
        take(1),
        switchMap((charatteristics) => this.sendData(charatteristics, data)),
      )),
      takeUntil(this.close$),
      shareReplay(1),
    );

  }

  write(variables: VariableValue[]): Observable<VariableValue[]> {
    return this.writeVariables(variables);
  }

  read(variables: Variable[]): Observable<VariableValue[]> {
    throw new Error("Method not implemented.");
  }

  connect() {
    return this.connection$.pipe(take(1), switchMap(() => of(void 0)));
  }

  private getHeader(data: any, chunkSize = 200) {
    const message = JSON.stringify(data);
    const messageLen = message.length;

    return new Uint8Array("JSON".split("").map(letter => letter.charCodeAt(0)).concat(
      messageLen & 0xFF,
      (messageLen >> 8) & 0xFF,
      chunkSize & 0xFF,
      (chunkSize >> 8) & 0xFF,
    ));
  }

  private sendData(charatteristics: any, data: any) {
    return defer(() => from(charatteristics.writeValue(this.getHeader(data.data, data.chunkSize)))).pipe(
      switchMap(() => from(JSON.stringify(data.data).split("")).pipe(
        bufferCount(data.chunkSize),
        map((arr: string[]) => arr.join("")),
        map((str: string) => Uint8Array.from(Array.from(str).map(letter => letter.charCodeAt(0)))),
        concatMap(buff => {
          return defer(() => from(charatteristics.writeValue(buff))).pipe(map(() => data));
        }),
        toArray(),
        switchMap(() => defer(() => from(charatteristics.readValue())).pipe(
          map((resp: any) => new TextDecoder().decode(resp.buffer)),
          switchMap((msg) => (msg !== "Navel\x00") ? of(msg) : throwError(() => new Error("EndMessage"))),
          repeat(),
          catchError((err) => {
            if (err.message !== 'EndMessage')
              return throwError(() => err);
            return of("")
          }),
          toArray(),
          map((arr: string[]) => JSON.parse(arr.join(""))),
          map(resp => { return { payload: resp.pl, id: data.id } }),
          switchMap((resp) => {
            if (resp === undefined)
              return throwError(() => new Error("Undefined"));
            if (resp.payload.NackErrCode !== undefined)
              return throwError(() => new Error("Nack"));
            return of(resp);
          }),
        )),
      )))
  }

  private sendCommand(data: any, chunkSize = 200) {
    return defer(() => {
      const id = Math.floor(Math.random() * 10000000);
      this.sendCommand$.next({ data: data, chunkSize: chunkSize, id: id })
      return combineLatest([of(id), this.responses$]);
    }).pipe(
      filter(([id, item]) => item.id === id),
      take(1),
      map(([id, item]) => item.payload),
    );
  }

  private generateJsonEnvelope(payload: any) {
    return {
      mt: "Q",
      s: {
        //ss: "Apk",
        sj: "435546457"
      },
      /*r: {
        //rj: "Navel"
      },*/
      pl: payload
    }
  }

  private sendIdentity(security: string) {
    const payload = this.generateJsonEnvelope({ Cmd: "Identity", Security: security, Id: "30C6F7C25168" });
    return this.charatteristics$.pipe(
      take(1),
      filter(item => item !== null),
      switchMap((charatteristics) => this.sendData(charatteristics, { data: payload, chunkSize: 200, id: 0 })),
    )
  }

  private sendStatusWifiStation() {
    return this.sendCommand(this.generateJsonEnvelope({ Cmd: "StatusWifiStation" }));
  }

  private writeVariables(variables: VariableValue[]) {
    const payload = {
      BitData: variables.map(item => item.variable.bit),
      Endianess: variables.map(item => item.variable.pattern.includes(">") ? 'B' : 'L'),
      Items: variables.map(item => item.variable.memory === "eeprom" ? item.variable.address + 0x8000 : item.variable.address),
      Masks: variables.map(item => item.variable.mask),
      Values: Utils.convertValuesToWrite(variables.map(v => v.variable), variables.map(v => v.value)),
      Protocol: "RWMSmaster",
      Cmd: "RequestWriting"
    }

    return this.sendCommand(this.generateJsonEnvelope(payload));
  }

  private setBuffer(variables: Variable[], bufferId: number = 3) {
    const payload = {
      BitData: variables.map(item => item.bit),
      Endianess: variables.map(item => item.pattern.includes(">") ? 'B' : 'L'),
      Items: variables.map(item => item.memory === "eeprom" ? item.address + 0x8000 : item.address),
      Masks: variables.map(item => item.mask),
      BufferId: bufferId,
      Freq: 1,
      Protocol: "RWMSmaster",
      Cmd: "SetConfigBuffer"
    }
    return this.sendCommand(this.generateJsonEnvelope(payload));
  }

  private readBuffer(variables: Variable[], bufferId: number = 3) {
    const payload = {
      BufferId: bufferId,
      Cmd: "GetBufferReading"
    }
    return this.sendCommand(this.generateJsonEnvelope(payload)).pipe(
      map(r => {
        const calculated = Utils.convertValuesToRead(variables, r.Values);
        const ret = [] as VariableValue[];
        for (let i = 0; i < variables.length; i++) {
          ret.push({ variable: variables[i], value: calculated[i] });
        }
        return ret;
      }),
    )
  }

  disconnect(): Observable<void> {
    this.close$.next();
    return of(void 0);
  }

  setVariableStream(variables: Variable[]): Observable<void> {
    this.bufferVariables$.next(variables);
    return of(void 0);
  }

  getStream(): Observable<VariableValue[]> {
    return this.stream$;
  }

  ping(): Observable<boolean> {
    throw new Error("Method not implemented.");
  }

  private onError() {
    this.close$.next();
  }
}

