import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  bufferWhen,
  catchError,
  combineLatest,
  filter,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  throwError,
} from "rxjs";
import { Channel, FirmwareDownloadStatus, LogItem, LogType, Variable, VariableValue, VariableWriteResponse } from "../classes/interfaces";

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private monitoredVariables: Variable[];
  private monitoredVariables$: BehaviorSubject<Variable[]>;

  private logs$: Observable<LogItem>;
  private allLogs$: Observable<LogItem[]>;
  private logSubject$: Subject<LogItem>;
  private connected$: BehaviorSubject<boolean>;
  private stream$: Subject<VariableValue[]>;
  private channel$: BehaviorSubject<Channel | null>;

  constructor() {
    this.logSubject$ = new Subject<LogItem>();
    this.logs$ = this.logSubject$.asObservable();
    this.allLogs$ = this.logs$.pipe(
      bufferWhen(() => this.connected$.pipe(filter(connected => connected === false))),
      shareReplay(1)
    );
    this.monitoredVariables = [];
    this.connected$ = new BehaviorSubject<boolean>(false);
    this.monitoredVariables$ = new BehaviorSubject<Variable[]>([]);
    this.stream$ = new Subject();
    this.channel$ = new BehaviorSubject<Channel | null>(null);

    this.allLogs$.subscribe();
  }

  private getChannel(): Observable<Channel> {
    return this.connected$.pipe(
      filter(connected => connected),
      switchMap(() => this.channel$.asObservable()),
      filter(channel => channel !== null),
      map(channel => channel!),
      take(1)
    )
  }

  setChannel(channel: Channel) {
    this.channel$.next(channel);
  }

  connect() {
    return this.channel$.pipe(
      filter(channel => channel !== null),
      map(channel => channel!),
      switchMap(channel => channel.connect().pipe(tap(() => this.connected$.next(true)))),
      take(1),
    )
  }

  startRead() {
    return this.getChannel().pipe(
      switchMap(channel => this.monitoredVariables$.pipe(
        switchMap((variables) => channel.setVariableStream(variables)),
        switchMap(() => channel.getStream()),
        tap(data => this.stream$.next(data)),
      )),
      takeUntil(this.connected$.pipe(filter(connected => connected === false))),
    )
  }

  getStream() {
    return this.stream$;
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
    this.monitoredVariables$.next(this.monitoredVariables);
  }

  addMonitoredVariable(variable: Variable) {
    this.monitoredVariables = this.monitoredVariables
      .filter(item => item.hash === variable.hash)
      .concat(variable)
      .sort((a, b) => {
        return a.address - b.address;
      });
    this.monitoredVariables$.next(this.monitoredVariables);
  }

  changeMonitoredVariables(variables: Variable[]) {
    this.monitoredVariables = variables;
    this.monitoredVariables$.next(this.monitoredVariables);
  }

  disconnect() {
    return combineLatest([
      this.connected$,
      this.channel$
    ]).pipe(
      take(1),
      switchMap(([connected, channel]) => {
        if(channel !== null && connected)
          return channel.disconnect();
        return of(void 0);
      }),
      tap(() => this.connected$.next(false)),
    )
  }

  write(variables: VariableValue[]): Observable<VariableWriteResponse> {
    return this.getChannel().pipe(
      switchMap(channel => channel.write(variables)),
      take(1),
      tap((response) => {
        variables.forEach(value => {
          this.logSubject$.next({
            date: new Date(),
            type: LogType.WRITE_VARIABLE,
            from: response.from.find(item => item.variable.hash === value.variable.hash)?.value,
            set: response.set.find(item => item.variable.hash === value.variable.hash)?.value,
            written: response.written.find(item => item.variable.hash === value.variable.hash)?.value,
            variable: value.variable.hash
          })
        })
      }
    ));
  }

  read(variables: Variable[]) {
    return this.getChannel().pipe(
      switchMap(channel => channel.read(variables)),
      take(1)
    );
  }

  isOnline() {
    return this.channel$.pipe(
      filter(channel => channel !== null),
      map(channel => channel!),
      switchMap(channel => channel.ping()),
      take(1)
    )
  }

  setWifi(ssid: string, password: string) {
    return this.getChannel().pipe(
      switchMap(channel => channel.setWifi(ssid, password)),
      take(1)
    );
  }


  disconnectWifi() {
    return this.getChannel().pipe(
      switchMap(channel => channel.disconnectWifi()),
      take(1)
    );
  }

  getWifiStatus() {
    return this.getChannel().pipe(
      switchMap(channel => channel.getWifiStatus()),
      take(1)
    );
  }

  upgradeGatewayFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus> {
    return this.getChannel().pipe(
      switchMap(channel => channel.getWifiStatus().pipe(
        switchMap((status) => {
          if (status.wifi_connected) {
            return channel.loadGatewayFirmware(url, md5);
          }
          return throwError(() => new Error("Wifi not connected"));
        })
      ))
    );
  }

  upgradePowerBoardFirmware(url: string, md5: string, revision:string): Observable<FirmwareDownloadStatus> {

    return this.getChannel().pipe(
      switchMap(channel => channel.getWifiStatus().pipe(
        switchMap((status) => {
          if (status.wifi_connected) {
            this.logSubject$.next({
              date: new Date(),
              type: LogType.START_UPDATE_POWER_BOARD,
              data: revision
            });
            console.log("start");
            return channel.loadPowerBoardFirmware(url, md5).pipe(
              tap({
                complete: () => {
                  console.log("complete");
                  this.logSubject$.next({
                    date: new Date(),
                    type: LogType.SUCCESS_UPDATE_POWER_BOARD,
                    data: revision
                  });
                },
                error: (err) => {
                  console.log("error");
                  this.logSubject$.next({
                    date: new Date(),
                    type: LogType.ERROR_UPDATE_POWER_BOARD,
                    data: revision + " - " + err.message
                  });
                }
              })
            )
          }
          return throwError(() => new Error("Wifi not connected"));
        })
      ))
    );
  }

  getLogs() {
    return this.logs$;
  }

  getAllLogs() {
    return this.allLogs$;
  }
}
