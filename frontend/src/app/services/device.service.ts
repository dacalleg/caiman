import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  filter,
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
import { Agua } from "../classes/agua";
import { Channel, FirmwareDownloadStatus, LogItem, LogType, Variable, VariableValue, VariableWriteResponse } from "../classes/interfaces";

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private monitoredVariables: Variable[];
  private monitoredVariables$: BehaviorSubject<Variable[]>;

  private logs$: Observable<LogItem>;
  private logSubject$: Subject<LogItem>;
  private connected$: BehaviorSubject<boolean>;
  private stream$: Subject<VariableValue[]>;
  private channel$: BehaviorSubject<Channel | null>;

  constructor() {
    this.logSubject$ = new Subject<LogItem>();
    this.logs$ = this.logSubject$.asObservable();
    this.monitoredVariables = [];
    this.connected$ = new BehaviorSubject<boolean>(false);
    this.monitoredVariables$ = new BehaviorSubject<Variable[]>([]);
    this.stream$ = new Subject();
    this.channel$ = new BehaviorSubject<Channel | null>(null);
  }

  private isAguaChannel(channel: Channel): channel is Agua {
    return channel instanceof Agua;
  }

  private rejectAguaWifiOperation(channel: Channel): Observable<void> | null {
    if (this.isAguaChannel(channel)) {
      return throwError(() => new Error("Wifi configuration is not supported on cloud connection"));
    }
    return null;
  }

  private rollbackConnection(channel: Channel, err: unknown): Observable<never> {
    this.connected$.next(false);
    return channel.disconnect().pipe(switchMap(() => throwError(() => err)));
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
      ).pipe(
        catchError(err => this.rollbackConnection(channel, err))
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

  connectedViaWifi() {
    return combineLatest([this.connected$, this.channel$]).pipe(
      map(([connected, channel]) => connected && channel instanceof Agua),
      shareReplay(1),
    );
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
      .filter(item => item.hash !== variable.hash)
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
        if (channel !== null && connected)
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
    const uniqueVariables = [...new Map(variables.map(item =>
      [item.hash, item])).values()];
    return this.getChannel().pipe(
      switchMap(channel => channel.read(uniqueVariables)),
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
      switchMap(channel => {
        const rejected = this.rejectAguaWifiOperation(channel);
        if (rejected) {
          return rejected;
        }
        return channel.setWifi(ssid, password);
      }),
      take(1)
    );
  }


  disconnectWifi() {
    return this.getChannel().pipe(
      switchMap(channel => {
        const rejected = this.rejectAguaWifiOperation(channel);
        if (rejected) {
          return rejected;
        }
        return channel.disconnectWifi();
      }),
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

  upgradePowerBoardFirmware(url: string, md5: string, revision: string): Observable<FirmwareDownloadStatus> {

    return this.getChannel().pipe(
      switchMap(channel => channel.getWifiStatus().pipe(
        switchMap((status) => {
          if (status.wifi_connected) {
            this.logSubject$.next({
              date: new Date(),
              type: LogType.START_UPDATE_POWER_BOARD,
              data: revision
            });
            return channel.loadPowerBoardFirmware(url, md5).pipe(
              tap({
                complete: () => {
                  this.logSubject$.next({
                    date: new Date(),
                    type: LogType.SUCCESS_UPDATE_POWER_BOARD,
                    data: revision
                  });
                },
                error: (err) => {
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
}
