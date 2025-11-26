import { catchError, concat, delay, filter, forkJoin, map, Observable, of, repeat, retry, shareReplay, Subject, switchMap, take, takeUntil, takeWhile, tap, throwError, toArray } from "rxjs";
import { Channel, FirmwareDownloadStatus, Variable, VariableValue, VariableWriteResponse, WifiStation, WifiStatus } from "./interfaces";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Utils } from "./utils";

export class Agua implements Channel {

    private close$: Subject<void>;
    private protocol: AguaProtocol;
    private bufferVariables: Variable[];

    constructor(http: HttpClient, agua_enpoint: string, agua_id_brand: string, id_device: string, product_id: string, access_token: string, customer_code: string) {
        this.protocol = new AguaProtocol(http, access_token, agua_enpoint, agua_id_brand, id_device, product_id, customer_code);
        this.close$ = new Subject();
        this.bufferVariables = [];
    }

    disconnectWifi(): Observable<void> {
        throw new Error("Method not implemented.");
    }

    getWifiStatus(): Observable<WifiStatus> {
        return this.protocol.getWifiStatus();
    }

    setWifi(ssid: string, password: string): Observable<void> {
        throw new Error("Method not implemented.");
    }

    connect(): Observable<any> {
        return of(void 0);
    }

    disconnect(): Observable<any> {
        return of(void 0);
    }

    write(variables: VariableValue[]): Observable<VariableWriteResponse> {
        return this.protocol.writeVariables(variables);
    }

    read(variables: Variable[]): Observable<VariableValue[]> {
        return this.protocol.readVariables(variables);
    }

    setVariableStream(variables: Variable[]): Observable<void> {
        this.bufferVariables = variables;
        if (this.bufferVariables.length == 0)
            return of(void 0);
        return this.protocol.setBuffer(this.bufferVariables);
    }

    getStream(): Observable<VariableValue[]> {
        return of(void 0).pipe(
            filter(() => this.bufferVariables.length > 0),
            switchMap(() => this.protocol.readBuffer(this.bufferVariables)),
            repeat({ delay: 1000 }),
            takeUntil(this.close$)
        )
    }

    ping(): Observable<boolean> {
        return this.protocol.isOnline();
    }

    close(): void {
        this.close$.next();
    }

    loadGatewayFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus> {
        return this.protocol.loadGatewayFirmware(url, md5);
    }
    loadPowerBoardFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus> {
        return this.protocol.loadPowerBoardFirmware(url, md5);
    }
}

interface RequestReadingReponse {
    BitData: number[];
    Endianess: string[];
    Freq: number;
    Items: number[];
    Masks: number[];
    Protocol: string;
    Values: number[];
    cmd: string;
}

class AguaProtocol {
    private token$: Observable<string>;

    private getHeaders(token: string | null = null) {
        return new HttpHeaders()
            .set('content-type', 'application/json')
            .set('customer_code', this.customer_code)
            .set('id_brand', this.agua_id_brand)
            .set('authorization', token || "")
            .set('local', 'false')
    }

    constructor(
        private http: HttpClient,
        private access_token: string,
        private agua_endpoint: string,
        private agua_id_brand: string,
        private id_device: string,
        private id_product: string,
        private customer_code: string) {

        this.token$ = of(this.access_token).pipe(shareReplay(1));
    }

    private getToken() {
        const username = "test@agua-iot.com";
        const password = "TEST2022test!";
        const headers = this.getHeaders()
            .set('local', 'true')
            .set('authorization', 'AguaManager');

        return this.http.post<any>(this.agua_endpoint + "/userLogin", {
            email: username,
            password: password
        }, { headers: headers }).pipe(map(response => response.token as string));
    }

    readVariables(variables: Variable[]) {
        const payload = {
            "id_product": this.id_product,
            "id_device": this.id_device,
            "Freq": 0,
            "Protocol": "RWMSmaster",
            "BitData": variables.map(item => item.bit),
            "Endianess": variables.map(item => item.pattern.includes(">") ? 'B' : 'L'),
            "Items": variables.map(item => item.memory === "eeprom" ? item.address + 0x8000 : item.address),
            "Masks": variables.map(item => item.mask)
        }
        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceRequestReading", payload, { headers: this.getHeaders(token) })
                .pipe(
                    switchMap(response => this.getJobStatus(response.idRequest)),
                    map(response => {
                        let r = response as RequestReadingReponse;
                        const values = variables.map(v => {
                            const addr = v.memory === "eeprom" ? v.address + 0x8000 : v.address;
                            const index = r.Items.indexOf(addr);
                            if (index >= 0) {
                                return r.Values[index];
                            }
                            return null;
                        })
                        const calculated = Utils.convertValuesToRead(variables, values);
                        const ret = [] as VariableValue[];
                        for (let i = 0; i < variables.length; i++) {
                            ret.push({ variable: variables[i], value: calculated[i] });
                        }
                        return ret;
                    }))
            ),
            retry({ count: 5 })
        )
    }

    writeVariables(variables: VariableValue[]) {
        const payload = {
            "id_product": this.id_product,
            "id_device": this.id_device,
            "Freq": 0,
            "Protocol": "RWMSmaster",
            "BitData": variables.map(item => item.variable.bit),
            "Endianess": variables.map(item => item.variable.pattern.includes(">") ? 'B' : 'L'),
            "Items": variables.map(item => item.variable.memory === "eeprom" ? item.variable.address + 0x8000 : item.variable.address),
            "Masks": variables.map(item => item.variable.mask),
            "Values": Utils.convertValuesToWrite(variables.map(v => v.variable), variables.map(v => v.value))
        }
        return this.token$.pipe(
            switchMap(token => concat(
                this.readVariables(variables.map(v => v.variable)),
                this.http.post<any>(this.agua_endpoint + "/deviceRequestWriting", payload, { headers: this.getHeaders(token) }).pipe(
                    switchMap(response => this.getJobStatus(response.idRequest)),
                    retry({ count: 5 }),
                    delay(2000),
                    switchMap(() => this.readVariables(variables.map(v => v.variable))))
            )),
            toArray(),
            map(response => {
                return { from: response[0], set: variables, written: response[1] } as VariableWriteResponse
            })
        )
    }

    setBuffer(variables: Variable[], bufferId: number = 3) {
        const payload = {
            "id_product": this.id_product,
            "id_device": this.id_device,
            "BufferId": bufferId,
            "Freq": 1,
            "Protocol": "RWMSmaster",
            "BitData": variables.map(item => item.bit),
            "Endianess": variables.map(item => item.pattern.includes(">") ? 'B' : 'L'),
            "Items": variables.map(item => item.memory === "eeprom" ? item.address + 0x8000 : item.address),
            "Masks": variables.map(item => item.mask)
        }
        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceSetConfigBuffer", payload, { headers: this.getHeaders(token) })
                .pipe(
                    switchMap(response => this.getJobStatus(response.idRequest)),
                    switchMap(() => of(void 0))
                )
            ),
            retry({ count: 5 })
        )
    }

    readBuffer(variables: Variable[], bufferId: number = 3) {
        const payload = {
            "id_product": this.id_product,
            "id_device": this.id_device,
            "BufferId": bufferId
        }
        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceGetBufferReading", payload, { headers: this.getHeaders(token) })
                .pipe(
                    switchMap(response => this.getJobStatus(response.idRequest)),
                    map(response => {
                        let r = response as RequestReadingReponse;
                        const values = variables.map(v => {
                            const addr = v.memory === "eeprom" ? v.address + 0x8000 : v.address;
                            const index = r.Items.indexOf(addr);
                            if (index >= 0) {
                                return r.Values[index];
                            }
                            return null;
                        })
                        const calculated = Utils.convertValuesToRead(variables, values);
                        const ret = [] as VariableValue[];
                        for (let i = 0; i < variables.length; i++) {
                            ret.push({ variable: variables[i], value: calculated[i] });
                        }
                        return ret;
                    }),
                    retry({ count: 5 })
                ))
        )
    }

    isOnline() {
        const payload = {
            "id_product": this.id_product,
            "id_device": this.id_device
        }
        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceStatusWifiStation", payload, { headers: this.getHeaders(token) }).pipe(
                switchMap(response => this.getJobStatus(response.idRequest)),
            )),
            switchMap(() => of(true)),
            catchError(err => of(false)),
        )
    }

    getWifiStatus() {
        const payload = {
            "id_product": this.id_product,
            "id_device": this.id_device
        }

        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceStatusWifiStation", payload, { headers: this.getHeaders(token) }).pipe(
                switchMap(response => this.getJobStatus(response.idRequest)),
            )),
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
            })
        )
    }

    loadPowerBoardFirmware(url: string, md5: string): Observable<FirmwareDownloadStatus> {
        const urlData = new URL(url);
        const protocol = urlData.protocol.replace(":", "");
        const path = urlData.pathname.split("/").slice(0, -1).join("/");
        const filename = urlData.pathname.split("/").slice(-1).join("/");
        const payload = {
            id_product: this.id_product,
            id_device: this.id_device,
            RemoteHost: urlData.host,
            RemotePath: path,
            Protocol: protocol.toUpperCase(),
            LocalPath: "fw",
            Flags: ["OVER_WRITE", "CREATE_DIR", "AUTO_UPG"],
            Type: "FW",
            FileNames: filename,
            MD5: md5.toUpperCase()
        }
        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceDownloadFiles", payload, { headers: this.getHeaders(token) }).pipe(
                switchMap(response => this.getJobStatus(response.idRequest)),
            )),
            switchMap(() => this.getDownloadStatus().pipe(
                map(response => {
                    if (response.StatusCode > 0)
                        return { operation: response.StatusCode, progress: response.Progress } as FirmwareDownloadStatus;
                    throw new Error(response.StatusCode);
                }),
                repeat({ delay: 1000 }),
                takeWhile(response => response.operation < 4)
            )),
        )
    }

    loadGatewayFirmware(url: string, md5: string) {
        const urlData = new URL(url);
        const path = urlData.pathname.split("/").slice(0, -1).join("/");
        const filename = urlData.pathname.split("/").slice(-1).join("/");
        const payload = {
            id_product: this.id_product,
            id_device: this.id_device,
            RemoteHost: urlData.host,
            RemotePath: path,
            LocalPath: "",
            Protocol: "HTTP",
            Flags: ["OVER_WRITE", "AUTO_UPG"],
            Type: "OTA",
            FileNames: filename,
            MD5: md5.toUpperCase()
        }
        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceDownloadFiles", payload, { headers: this.getHeaders(token) }).pipe(
                switchMap(response => this.getJobStatus(response.idRequest)),
            )),
            switchMap(() => this.getDownloadStatus().pipe(
                map(response => {
                    return { operation: response.StatusCode, progress: response.Progress } as FirmwareDownloadStatus
                }),
                repeat({ delay: 1000 }),
                takeWhile(response => response.operation < 2)
            )),
        )
    }

    private getDownloadStatus() {
        const payload = {
            id_product: this.id_product,
            id_device: this.id_device,
        }
        return this.token$.pipe(
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceStatusDwnUpg", payload, { headers: this.getHeaders(token) }).pipe(
                switchMap(response => this.getJobStatus(response.idRequest)),
            ))
        )
    }

    private getJobStatus(requestId: string) {
        return this.token$.pipe(
            switchMap(token => of(void 0).pipe(
                delay(1000),
                switchMap(() => this.http.get<any>(this.agua_endpoint + "/deviceJobStatus/" + requestId, { headers: this.getHeaders(token) }).pipe(
                    switchMap(response => {
                        switch (response.jobAnswerStatus) {
                            case "terminated":
                            case "completed":
                                return of(response.jobAnswerData === "" ? null : response.jobAnswerData);

                            default:
                                return throwError(() => new Error(response.jobAnswerStatus))
                        }
                    }),
                    retry({ count: 10, delay: 1000 }),
                    switchMap(response => response === null ? throwError(() => new Error("Empty Response")) : of(response))
                )
                ))
            )
        )
    }
}