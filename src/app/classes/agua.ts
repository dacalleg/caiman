import { catchError, delay, filter, map, Observable, of, repeat, retry, shareReplay, Subject, switchMap, take, takeUntil, tap, throwError } from "rxjs";
import { Channel, Variable, VariableValue } from "./interfaces";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Utils } from "./utils";

export class Agua implements Channel {

    private close$: Subject<void>;
    private protocol: AguaProtocol;
    private bufferVariables: Variable[];

    constructor(http: HttpClient, agua_enpoint: string, agua_id_brand: string, id_device: string, product_id: string, access_token: string) {
        this.protocol = new AguaProtocol(http, access_token, agua_enpoint, agua_id_brand, id_device, product_id);
        this.close$ = new Subject();
        this.bufferVariables = [];
    }

    connect(): Observable<any> {
        return of(void 0);
    }

    disconnect(): Observable<any> {
        return of(void 0);
    }

    write(variables: VariableValue[]): Observable<VariableValue[]> {
        return this.protocol.writeVariables(variables);
    }

    read(variables: Variable[]): Observable<VariableValue[]> {
        return this.protocol.readVariables(variables);
    }

    setVariableStream(variables: Variable[]): Observable<void> {
        this.bufferVariables = variables;
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
            .set('customer_code', this.agua_endpoint)
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
        private id_product: string) {

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
                        const calculated = Utils.convertValuesToRead(variables, r.Values);
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
            switchMap(token => this.http.post<any>(this.agua_endpoint + "/deviceRequestWriting", payload, { headers: this.getHeaders(token) })
                .pipe(
                    switchMap(response => this.getJobStatus(response.idRequest))
                )),
            retry({ count: 5 })
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
                        const calculated = Utils.convertValuesToRead(variables, r.Values);
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

    private getJobStatus(requestId: string) {
        return this.token$.pipe(
            switchMap(token => of(void 0).pipe(
                delay(1000),
                switchMap(() => this.http.get<any>(this.agua_endpoint + "/deviceJobStatus/" + requestId, { headers: this.getHeaders(token) }).pipe(
                    switchMap(response => {
                        switch (response.jobAnswerStatus) {
                            case "waiting":
                                return throwError("waiting")
                            case "Missing job answer":
                                return throwError("Missing job answer")
                        }
                        return of(response.jobAnswerData);
                    }
                    ),
                    retry({ count: 5, delay: 1000 }))
                ))
            )
        )
    }
}