import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  concatMap, filter, finalize,
  from,
  map,
  of,
  repeat,
  retry,
  Subject,
  switchMap, take,
  takeUntil, tap, throwError,
} from "rxjs";
import { Channel, ChannelProtocol, DeviceData, SerialConnectionSettings, Variable } from "../classes/interfaces";
import { Serami } from "../classes/serami";
import { SerialChannel } from "../classes/serial-channel";
import { BleChannel } from "../classes/ble.channel";
import { VariableValueFormatterPipe } from '../pipes/variable-value-formatter.pipe';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private stream$: Subject<DeviceData>;
  private monitoredVariables: Variable[];
  private monitoredVariablesChange$: Subject<void>;
  private stop: Subject<void>;
  private connected$: BehaviorSubject<boolean>;
  private channel: Channel;
  private protocol: ChannelProtocol;

  constructor() {
    this.stream$ = new Subject<DeviceData>();
    this.monitoredVariables = [];
    this.monitoredVariablesChange$ = new Subject<void>();
    this.stop = new Subject();
    this.connected$ = new BehaviorSubject<boolean>(false);
    this.channel = new BleChannel();
    this.protocol = new Serami(this.channel)
  }

  setChannel(channel: string | null) {
    if (channel === null)
      this.channel = new BleChannel();
    switch (channel) {
      case "BLE":
        this.channel = new BleChannel();
        break
      case "SERIAL":
        this.channel = new SerialChannel();
        break;
    }
    this.protocol = new Serami(this.channel);
  }

  startRead(options: SerialConnectionSettings) {
    const connect$ = this.channel.connect(options);
    const read$ = of(void 0).pipe(
      switchMap(() => of(this.monitoredVariables).pipe(
        filter(items => items.length > 0),
        take(1),
        map(items => {
          const ret = [] as Variable[];
          const names = [] as string[];
          items.forEach(item => {
            const name = item.address + "_" + item.bit + "_" + item.memory;
            if (!names.includes(name)) {
              names.push(name);
              ret.push(item);
            }

          })
          return ret;
        }),
        switchMap(variables => of(...variables)),
      )),
      concatMap(variable => from(this.protocol.readVariable(variable)).pipe(
        retry(3),
        catchError(val => {
          console.log(val);
          this.stopRead();
          return throwError(val)
        }),
        map(data => {
          return { startAddress: variable.address, buffer: data, memory: variable.memory } as DeviceData;
        })
      )
      ),
      takeUntil(this.monitoredVariablesChange$),
      repeat(),
      takeUntil(this.stop)
    );
    connect$.pipe(
      tap(() => this.connected$.next(true)),
      switchMap(() => read$),
      catchError(val => {
        console.log(val);
        this.connected$.next(false)
        return throwError(val);
      }),
      finalize(() => {
        this.connected$.next(false);
        this.channel.close();
      }),
    ).subscribe(value => this.stream$.next(value));
  }

  getStream() {
    return this.stream$.asObservable();
  }

  isConnected() {
    return this.connected$.asObservable();
  }

  removedMonitoredVariable(variable: Variable) {
    this.monitoredVariables = this.monitoredVariables
      .filter(item => item.hash !== variable.hash)
      .sort((a, b) => {
        return a.address - b.address;
      });
  }

  addMonitoredVariable(variable: Variable) {
    this.monitoredVariables = this.monitoredVariables
      .filter(item => item.hash === variable.hash)
      .concat(variable)
      .sort((a, b) => {
        return a.address - b.address;
      });
  }

  changeMonitoredVariables(variables: Variable[]) {
    this.monitoredVariables = variables;
    this.monitoredVariablesChange$.next();
  }

  stopRead() {
    this.stop.next();
  }

  write(variable: Variable, buffer: Uint8Array) {
    return this.protocol.writeVariable(variable, buffer);
  }

  read(variable: Variable) {
    return this.protocol.readVariable(variable).pipe(
      map(buffer => {
        return { startAddress: variable.address, buffer: buffer, memory: variable.memory } as DeviceData;
      }),
      map(data => {
        const pipe = new VariableValueFormatterPipe();
        return pipe.transform(data, variable);
      })
    )
  }
}
