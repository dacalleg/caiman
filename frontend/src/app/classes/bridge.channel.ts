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
    forkJoin,
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
    takeWhile,
    tap,
    throwError,
    timeout,
    toArray
} from "rxjs";
import { Channel, FirmwareDownloadStatus, Variable, VariableValue, VariableWriteResponse, WifiStation, WifiStatus } from "./interfaces";
import { RxStomp, RxStompConfig } from "@stomp/rx-stomp";
import { environment } from "src/environments/environment";
import { IMessage } from '@stomp/stompjs';

export class BridgeChannel implements Channel {
    private connection$: Observable<RxStomp>;
    private stream$: Observable<VariableValue[]>;
    private bufferVariables$: BehaviorSubject<Variable[]>;
    private close$: Subject<void>;
    private sendCommand$: Subject<{ data: any, chunkSize: number, id: number }>;
    private responses$: Observable<{ id: number, pl: any }>;
    private stomp$: Observable<RxStomp>;
    private stompSubject$: BehaviorSubject<RxStomp | null>;
    private responseTopic$: Observable<IMessage>;

    constructor(user: string, token: string, mac: string) {
        this.close$ = new Subject();
        this.sendCommand$ = new Subject();
        this.stompSubject$ = new BehaviorSubject<RxStomp | null>(null);
        this.stomp$ = this.stompSubject$.pipe(filter((stomp) => stomp !== null), map((stomp) => stomp!), take(1));


        const stomp = new RxStomp();
        this.connection$ = defer(() => {
            stomp.configure(this.getConfiguration(user, token));
            stomp.activate();
            return of(stomp);
        }).pipe(
            tap((stomp) => this.stompSubject$.next(stomp)),
            switchMap((arg) => this.sendBridgePing().pipe(map(() => arg))),
            timeout(5000),
            catchError((err) => {
                this.close$.next();
                return throwError(() => err);
            }),
            shareReplay(1),
        );

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
            retry(),
            takeUntil(this.close$),
            shareReplay(1)
        );

        this.responseTopic$ = this.stomp$.pipe(
          switchMap((stomp) => stomp.watch("/topic/response." + mac)),
          takeUntil(this.close$),
        );
    
        this.close$.pipe(switchMap(() => this.stomp$)).subscribe((stomp) => {
          this.stompSubject$.next(null);
          stomp.deactivate()
        });

        this.responses$ = combineLatest(
          [this.stomp$, this.sendCommand$]
        ).pipe(
          concatMap(([stomp, data]) => of(stomp.publish({ destination: "/topic/command." + mac, body: JSON.stringify(data), headers: {'content-type': 'application/json'}})).pipe(
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

    write(variables: VariableValue[]): Observable<VariableWriteResponse> {
        return this.writeVariables(variables).pipe(
            retry(),
        )
    }

    read(variables: Variable[]): Observable<VariableValue[]> {
        return this.readVariables(variables).pipe(
            map(payload => this.getVariablesValue(variables, payload)),
            retry(),
        )
    }

    private getDownloadStatus() {
        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "StatusDwnUpg" }));
    }

    loadGatewayFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus> {
        const urlData = new URL(url);
        const path = urlData.pathname.split("/").slice(0, -1).join("/");
        const filename = urlData.pathname.split("/").slice(-1).join("/");
        const payload = {
            RemoteHost: urlData.host,
            RemotePath: path,
            LocalPath: "",
            Flags: ["OVER_WRITE", "AUTO_UPG"],
            Type: "OTA",
            FileNames: filename,
            MD5: md5.toUpperCase()
        }
        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "DownloadFiles", ...payload })).pipe(
            switchMap(() => this.getDownloadStatus().pipe(
                map(response => {
                    return { operation: response.StatusCode, progress: response.Progress } as FirmwareDownloadStatus
                }),
                repeat({ delay: 1000 }),
                takeWhile(response => response.operation < 2)
            ))
        )
    }

    loadPowerBoardFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus> {
        const urlData = new URL(url);
        const protocol = urlData.protocol.replace(":", "");
        const path = urlData.pathname.split("/").slice(0, -1).join("/");
        const filename = urlData.pathname.split("/").slice(-1).join("/");
        const payload = {
            RemoteHost: urlData.host,
            RemotePath: path,
            Protocol: protocol.toUpperCase(),
            LocalPath: "fw",
            Flags: ["OVER_WRITE", "CREATE_DIR", "AUTO_UPG"],
            Type: "FW",
            FileNames: filename,
            MD5: md5.toUpperCase()
        }
        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "DownloadFiles", ...payload })).pipe(
            switchMap(() => this.getDownloadStatus().pipe(
                map(response => {
                    if (response.StatusCode > 0)
                        return { operation: response.StatusCode, progress: response.Progress } as FirmwareDownloadStatus;
                    throw new Error(response.StatusCode);
                }),
                repeat({ delay: 1000 }),
                takeWhile(response => response.operation < 4)
            ))
        )
    }

    connect() {
        return this.connection$.pipe(take(1), switchMap(() => of(void 0)));
    }

    private sendCommand(data: any) {
        return defer(() => {
            const id = Math.floor(Math.random() * 10000000);
            this.sendCommand$.next({ ...data, id: id })
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
            pl: payload
        }
    }

    getWifiStatus() {
        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "StatusWifiStation" })).pipe(
            map((resp: any) => {
                return {
                    wifi_connected: resp.ConnSta === "Connected",
                    cloud_connected: resp.ConnServer === "Connected",
                    wifi_stations: resp.Aps.map((item: any) => {
                        return {
                            ssid: item.ssid,
                            channel: item.channel,
                            rssi: item.rssi,
                            bssid: item.bssid
                        } as WifiStation
                    })
                } as WifiStatus
            }),
        );
    }

    setWifi(ssid: string, password: string) {
        const payload = {
            'Activation': 'Connect',
            'Id': 1,
            'ssid': ssid,
            'password': password,
        };
        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "SetWifiStation", ...payload }));
    }

    disconnectWifi() {
        const payload = {
            'Activation': 'Disconnect',
        };
        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "SetWifiStation", ...payload }));
    }

    private writeVariables(variablesValue: VariableValue[]) {
        const variables = variablesValue.map(item => item.variable);
        const payload = {
            BitData: variablesValue.map(item => item.variable.bit),
            Endianess: variablesValue.map(item => item.variable.pattern.includes(">") ? 'B' : 'L'),
            Items: variablesValue.map(item => item.variable.memory === "eeprom" ? item.variable.address + 0x8000 : item.variable.address),
            Masks: variablesValue.map(item => item.variable.mask),
            Values: Utils.convertValuesToWrite(variablesValue.map(v => v.variable), variablesValue.map(v => v.value)),
            Protocol: "RWMSmaster",
            Cmd: "RequestWriting"
        }

        return forkJoin({
            from: this.read(variables),
            write: this.sendCommand(this.generateJsonEnvelope(payload)),
            written: this.read(variables),
        }).pipe(map(response => {
            return {
                from: response.from,
                written: response.written,
                set: variablesValue
            } as VariableWriteResponse
        }))
    }

    private readVariables(variables: Variable[]) {
        const payload = {
            Freq: 0,
            Protocol: "RWMSmaster",
            BitData: variables.map(item => item.bit),
            Endianess: variables.map(item => item.pattern.includes(">") ? 'B' : 'L'),
            Items: variables.map(item => item.memory === "eeprom" ? item.address + 0x8000 : item.address),
            Masks: variables.map(item => item.mask),
        }

        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "RequestReading", ...payload }));
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
            map(payload => this.getVariablesValue(variables, payload)),
        )
    }

    private getVariablesValue(variables: Variable[], payload: any) {
        const calculated = Utils.convertValuesToRead(variables, payload.Values);
        const ret = [] as VariableValue[];
        for (let i = 0; i < variables.length; i++) {
            ret.push({ variable: variables[i], value: calculated[i] });
        }
        return ret;
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

    private sendBridgePing() {
        return this.sendCommand(this.generateJsonEnvelope({ Cmd: "ConnectionPing" }));
    }

    private getConfiguration(username: string, token: string) {
        return {
            brokerURL: 'wss://' + environment.host + '/ws',

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

