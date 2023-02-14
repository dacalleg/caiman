import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, catchError, combineLatest, concat, concatMap, defer, delay, filter, from, ignoreElements, map, merge, mergeMap, Observable, of, repeat, retry, shareReplay, switchMap, take, takeUntil, tap, throwError, timeout, toArray, zip } from "rxjs";
import { Agua } from 'src/app/classes/agua';
import { BleChannel } from 'src/app/classes/ble.channel';
import { BridgeChannel } from 'src/app/classes/bridge.channel';
import { Channel, Database, DeviceProduct, Project, Variable, VariableValue, WifiStation, WifiStatus } from 'src/app/classes/interfaces';
import { Utils } from 'src/app/classes/utils';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { DeviceService } from 'src/app/services/device.service';
import { ModalService } from 'src/app/services/modal.service';
import { SeramiParserService } from 'src/app/services/serami-parser.service';
import { StoreService } from 'src/app/services/store.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {



  @ViewChild("nav") nav: NgbNav | null;

  project$: Observable<Project>;
  groups$: Observable<string[]>;
  variables$: Observable<Variable[]>;
  search$: BehaviorSubject<string>;
  wifiConnectionAvailable$: Observable<boolean>;
  loadDeviceData$: Observable<DeviceProduct>;
  loadSnet$: Observable<string>;
  connected$: Observable<boolean>;

  aguaChannel$: Observable<Agua>;
  BLEChannel$: Observable<BleChannel>;
  bridgeChannel$: Observable<BridgeChannel>;

  databaseSelected: Database | null;
  wifiStatus$: Observable<WifiStatus>;

  wifiRefreshSubject$: BehaviorSubject<void>;

  constructor(
    private Store: StoreService,
    private Device: DeviceService,
    private ActivatedRoute: ActivatedRoute,
    private Api: ApiService,
    private Auth: AuthService,
    private http: HttpClient,
    private modal: ModalService) {

    this.nav = null;
    this.search$ = new BehaviorSubject<string>("");
    this.project$ = this.Store.getProject();

    this.databaseSelected = null;

    this.connected$ = this.Device.isConnected();

    const macAddress$ = this.ActivatedRoute.params.pipe(
      filter(params => params["mac"] != null),
      map((params) => params["mac"] as string),
      shareReplay(1)
    );

    this.loadDeviceData$ = macAddress$.pipe(
      switchMap((mac) => this.Api.getDeviceInfoFromMac(mac).pipe(tap(device => this.Store.setDevice(device)))),
      shareReplay(1)
    );

    this.loadSnet$ = this.loadDeviceData$.pipe(
      switchMap((device) => this.Api.getAttachmentContent(device.info.serami_file).pipe(tap((content) => this.Store.loadFromSnet(content)))),
      shareReplay(1)
    )

    this.aguaChannel$ = this.loadDeviceData$.pipe(
      switchMap(() => combineLatest([this.Auth.getToken(), this.Store.getProject(), this.Api.getAguaEnv()])),
      switchMap(([token, project, env]) => of(new Agua(this.http, env.agua_endpoint, "" + env.agua_id_brand, project.device!.id_device, project.device!.id_product, token))),
      tap((agua) => this.Device.setChannel(agua))
    )

    this.BLEChannel$ = this.loadDeviceData$.pipe(
      map((data) => new BleChannel(data.mac, data.security_code )),
      tap((channel) => this.Device.setChannel(channel))
    )

    this.bridgeChannel$ = this.loadDeviceData$.pipe(
      switchMap((data) => combineLatest([this.Auth.getToken(), this.Auth.getUserName(), of(data)])),
      map(([token, username, data]) => new BridgeChannel(username, token, data.mac, data.security_code)),
      tap((channel) => this.Device.setChannel(channel))
    )

    this.wifiConnectionAvailable$ = this.aguaChannel$.pipe(
      take(1),
      switchMap(() => this.Device.isOnline()),
    )

    this.variables$ = this.search$.pipe(
      mergeMap(search => this.Auth.getRoles().pipe(
        switchMap(roles => this.Store.getVariablesByRoles(roles).pipe(map(variables => {
          return variables.filter(item => {
            if (search == "")
              return true
            return (item.name + item.address + "0x" + item.address.toString(16)).toLowerCase().includes(search.toLowerCase());
          })
        })
        )))),
      shareReplay(1),
    )

    this.groups$ = this.Auth.getRoles().pipe(
      switchMap(roles => this.Store.getGroupsByRole(roles))
    )
    
    this.wifiRefreshSubject$ = new BehaviorSubject<void>(void 0);
    this.wifiStatus$ = this.wifiRefreshSubject$.pipe(
      switchMap(() => this.Device.getWifiStatus())
    );

    this.loadDeviceData$.subscribe();
  }

  ngOnInit(): void {

  }

  onSearchChange($event: any) {
    this.search$.next($event.target.value);
  }

  hideAll(group: string) {
    this.variables$.pipe(
      take(1),
      switchMap(variables => from(variables)),
      filter(variable => variable.group === group)
    ).subscribe(variable => this.Store.hideVariable(variable))
  }

  showAll(group: string) {
    this.variables$.pipe(
      take(1),
      switchMap(variables => from(variables)),
      filter(variable => variable.group === group)
    ).subscribe(variable => this.Store.showVariable(variable))
  }

  onGroupSelected(group: string) {
    this.variables$.pipe(
      map(variables => variables.filter(v => v.group == group && !v.hide)),
      take(1)
    ).subscribe(variables => this.Device.changeMonitoredVariables(variables))
  }

  unselectGroup() {
    this.Device.changeMonitoredVariables([]);
  }

  bridgeConnect() {
    this.bridgeChannel$.pipe(
      switchMap(() => this.modal.openAlertModal({
        title: "Connection",
        message: "Bridge connection in progress",
        progress: true
      })),
      switchMap(() => this.Device.connect()),
      switchMap(() => this.loadSnet$),
      tap(() => this.modal.dismissAll()),
      take(1),
      switchMap(() => this.Device.startRead()),
      catchError(err => this.modal.openAlertModal({
        title: "Error",
        message: err.message,
      }))
    ).subscribe();
  }


  bleConnect() {
    this.BLEChannel$.pipe(
      switchMap(() => this.Device.connect()),
      switchMap(() => this.modal.openAlertModal({
        title: "Connection",
        message: "BLE connection in progress",
        progress: true
      })),
      switchMap(() => this.loadSnet$),
      tap(() => this.modal.dismissAll()),
      take(1),
      switchMap(() => this.Device.startRead()),
      catchError(err => {
        this.disconnect();
        return this.modal.openAlertModal({
          title: "Error",
          message: err.message,
        })
      })
    ).subscribe();
  }

  wifiConnect() {
    concat(
      this.modal.openAlertModal({
        title: "Connection",
        message: "Wifi connection in progress",
        progress: true
      }).pipe(ignoreElements()),
      this.wifiConnectionAvailable$.pipe(
        switchMap(available => {
          if (available)
            return of(available)
          else
            return throwError(() => new Error("Wifi Connection not available"));
        }),
        switchMap(() => this.Device.connect()),
        switchMap(() => this.loadSnet$),
        tap(() => this.modal.dismissAll()),
        take(1),
        switchMap(() => this.Device.startRead()),
        catchError(err => {
          return this.modal.openAlertModal({
            title: "Error",
            message: err.message,
          });
        })
      )
    ).subscribe();
  }

  disconnect() {
    this.nav?.select("ngb-nav-0");
    this.Device.disconnect().subscribe();
  }

  loadDatabase() {
    if (this.databaseSelected) {
      let i = 0;
      let count = this.databaseSelected.values.length;
      combineLatest([
        of(this.databaseSelected),
        this.modal.openAlertModal({
          title: "Writing Database " + this.databaseSelected.name,
          progress: true,
          progressValue: 0,
        }),
      ]).pipe(
        switchMap(([database, modal]) => from(database.values)),
        concatMap((dbvalue) => combineLatest([of(dbvalue), this.Store.getVariableByHash(dbvalue.id)]).pipe(
          map(([dbvalue, variable]) => {
            if (variable == null)
              throw new Error("Variable not found");
            return { variable: variable, value: Utils.convertValuesToWrite([variable], [+dbvalue.value])[0] } as VariableValue
          }),
          tap((value) => this.modal.upodateAlertModalConfig({ title: "Writing Database " + this.databaseSelected!.name, progress: true, progressValue: (i / count) * 100, message: "Writing " + value.variable.name })),
          switchMap((value) => this.Device.write([value])),
          tap(() => i++),
          timeout(5000),
          retry(5)
        )),
        toArray(),
        tap(() => this.modal.dismissAll()),
        switchMap(() => this.modal.openAlertModal({
          title: "Database written",
          message: "Database written successfully",
        }))
      ).subscribe({
        error: (err) => {
          this.modal.dismissAll()
        },
        complete: () => {

        }
      });
    }
  }

  scanWifi()
  {
    this.wifiRefreshSubject$.next();
  }

  disconnectWifi() {
    this.modal.openAlertModal({
      title: "Disconnecting",
      message: "Disconnection in progress",
      progress: true,
    }).pipe(
      switchMap(() => this.Device.disconnectWifi().pipe(
        switchMap(() => of(void 0).pipe(
          delay(1000),
          tap(() => this.wifiRefreshSubject$.next()),
          repeat()
        )),
        ignoreElements(),
        timeout(15000),
        takeUntil(this.wifiStatus$.pipe(filter(status => !status.wifi_connected))),
      ))
    ).subscribe({
      error: (err) => {
        this.modal.upodateAlertModalConfig({ title: "Disconnecting", progress: false, message: "Timeout" })
      },
      complete: () => this.modal.dismissAll()
    });
  }

  connectWifi($event: { station: WifiStation, password: string }) {
    this.modal.openAlertModal({
      title: "Connecting",
      message: "Connection to " + $event.station.ssid + " in progress",
      progress: true,
    }).pipe(
      switchMap(() => this.Device.setWifi($event.station.ssid, $event.password).pipe(
        switchMap(() => of(void 0).pipe(
          delay(1000),
          tap(() => this.wifiRefreshSubject$.next()),
          repeat()
        )),
        ignoreElements(),
        timeout(15000),
        takeUntil(this.wifiStatus$.pipe(filter(status => status.wifi_connected))),
      ))
    ).subscribe({
      error: (err) => {
        this.modal.upodateAlertModalConfig({ title: "Connecting", progress: false, message: "Timeout. Could not connect to the network, check password." })
      },
      complete: () => this.modal.dismissAll()
    });
  }
}
