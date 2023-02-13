import { Utils } from "./utils";
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concatMap,
  defer,
  delay,
  filter,
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
} from "rxjs";
import { Channel, Variable, VariableValue, WifiStatus } from "./interfaces";
import { environment } from "src/environments/environment";
import { RxStomp, RxStompConfig } from "@stomp/rx-stomp";
import { IMessage } from '@stomp/stompjs';

export class BridgeChannel implements Channel {
  private connection$: Observable<RxStomp>;
  private stream$: Observable<VariableValue[]>;
  private stompSubject$: BehaviorSubject<RxStomp | null>;
  private bufferVariables$: BehaviorSubject<Variable[]>;
  private close$: Subject<void>;
  private sendCommand$: Subject<{ id: number, pl: any }>;
  private responses$: Observable<{ id: number, pl: any }>;
  private responseTopic$: Observable<IMessage>;
  private device: string;
  private stomp$: Observable<RxStomp>;

  constructor(user: string, token: string, device: string, secutiry: string) {
    this.close$ = new Subject();
    this.stompSubject$ = new BehaviorSubject<RxStomp | null>(null);
    this.stomp$ = this.stompSubject$.pipe(filter((stomp) => stomp !== null), map((stomp) => stomp!), take(1));
    this.sendCommand$ = new Subject();
    this.device = device;

    const stomp = new RxStomp();
    this.connection$ = defer(() => {
      stomp.configure(this.getConfiguration(user, token));
      stomp.activate();
      return of(stomp);
    }).pipe(
      tap((stomp) => this.stompSubject$.next(stomp)),
      switchMap((arg) => this.sendIdentity(secutiry).pipe(map(() => arg))),
      timeout(5000),
      catchError((err) => {
        this.close$.next();
        return throwError(() => err);
      }),
      shareReplay(1),
    );

    this.responseTopic$ = this.stomp$.pipe(
      switchMap((stomp) => stomp.watch("/topic/response." + device)),
      takeUntil(this.close$),
      shareReplay(1)
    );

    this.close$.pipe(switchMap(() => this.stomp$)).subscribe((stomp) => {
      this.stompSubject$.next(null);
      stomp.deactivate()
    });

    this.bufferVariables$ = new BehaviorSubject<Variable[]>([]);

    this.stream$ = this.bufferVariables$.pipe(
      switchMap((variables) => {
        if (variables.length === 0)
          return of([] as VariableValue[]);
        return this.setBuffer(variables).pipe(
          switchMap(() => this.readBuffer(variables).pipe(
            repeat({ delay: 500 }),
          )),
        )
      }),
      retry(),
      takeUntil(this.close$),
      shareReplay(1)
    );

    this.responses$ = combineLatest(
      [this.stomp$, this.sendCommand$]
    ).pipe(
      concatMap(([stomp, data]) => of(stomp.publish({ destination: "/topic/command." + this.device, body: JSON.stringify(data) })).pipe(
        switchMap(() => this.responseTopic$)).pipe(
          take(1),
          map(resp => JSON.parse(resp.body)),
        )
      ),
      takeUntil(this.close$),
      shareReplay(5),
    );

    this.responses$.subscribe();
  }
  disconnectWifi(): Observable<void> {
    throw new Error("Method not implemented.");
  }

  getWifiStatus(): Observable<WifiStatus> {
    throw new Error("Method not implemented.");
  }

  setWifi(ssid: string, password: string): Observable<void> {
    throw new Error("Method not implemented.");
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


  private sendCommand(data: any) {
    return defer(() => {
      const id = Math.floor(Math.random() * 10000000);
      this.sendCommand$.next({ pl: data, id: id })
      return combineLatest([of(id), this.responses$]);
    }).pipe(
      filter(([id, item]) => item.id === id),
      take(1),
      map(([id, item]) => item.pl),
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
    return this.sendCommand(this.generateJsonEnvelope({ Cmd: "Identity", Security: security, Id: "30C6F7C25168" }));
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

  private getConfiguration(username: string, token: string) {
    return {
      brokerURL: 'ws://' + environment.host + '/ws',

      connectHeaders: {
        login: username,
        passcode: token,
      },

      heartbeatIncoming: 0, // Typical value 0 - disabled
      heartbeatOutgoing: 20000, // Typical value 20000 - every 20 seconds

      reconnectDelay: 500,
    } as RxStompConfig;
  }
}
