import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, catchError, combineLatest, concat, concatMap, delay, filter, from, ignoreElements, map, mergeMap, Observable, of, repeat, retry, shareReplay, Subject, switchMap, take, takeUntil, tap, throwError, timeout, toArray } from "rxjs";
import { Agua } from 'src/app/classes/agua';
import { BleChannel } from 'src/app/classes/ble.channel';
import { BridgeChannel } from 'src/app/classes/bridge.channel';
import { Database, DeviceProduct, Firmware, LogType, Project, Variable, VariableValue, WifiStation, WifiStatus } from 'src/app/classes/interfaces';
import { Utils } from 'src/app/classes/utils';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { DeviceService } from 'src/app/services/device.service';
import { ModalService } from 'src/app/services/modal.service';
import { StoreService } from 'src/app/services/store.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {


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

  mobileMenuOpen: boolean;
  destroy$: Subject<void> = new Subject<void>();

  constructor(
    private Store: StoreService,
    private Device: DeviceService,
    private ActivatedRoute: ActivatedRoute,
    private Api: ApiService,
    private Auth: AuthService,
    private http: HttpClient,
    private modal: ModalService) {

    this.nav = null;
    this.mobileMenuOpen = false;
    this.search$ = new BehaviorSubject<string>("");
    this.project$ = this.Store.getProject();

    this.connected$ = this.Device.isConnected();

    const macAddress$ = this.ActivatedRoute.params.pipe(
      filter(params => params["mac"] != null),
      map((params) => params["mac"] as string),
      shareReplay(1)
    );

    const productKey$ = this.ActivatedRoute.params.pipe(
      map((params) => params["productKey"] as string | null),
      shareReplay(1)
    );

    const regCode$ = this.ActivatedRoute.params.pipe(
      map((params) => params["regCode"] as string | null),
      shareReplay(1)
    );

    const serialNumber$ = this.ActivatedRoute.params.pipe(
      map((params) => params["serial"] as string | null),
      shareReplay(1)
    );

    this.loadDeviceData$ = combineLatest([macAddress$, productKey$, serialNumber$, regCode$]).pipe(
      switchMap(([mac, productKey, serial, regCode]) => {
        if(productKey != null && regCode != null)
        {
          return this.Api.getProductInfo(productKey).pipe(map(product => {
            const device = {
              mac: mac,
              security_code: regCode,
              info: product
            } as DeviceProduct;
            device.info.serial = serial != null ? serial : device.info.serial;
            return device;
          }))
        }
        return this.Api.getDeviceInfoFromMac(mac, productKey).pipe(
          map(device => {
            device.info.serial = serial != null ? serial : device.info.serial;
            return device;
          }),
        )
      }),
      tap(device => this.Store.setDevice(device)),
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
      map((data) => new BleChannel(data.mac, data.security_code)),
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

    this.loadDeviceData$.subscribe();

    this.Device.getLogs().pipe(
      takeUntil(this.destroy$),
      switchMap(log => this.loadDeviceData$.pipe(
        filter(device => device.info.serial != null),
        switchMap(device => this.Api.createLogForDevice(device.info.serial!, log)),
        catchError(err => of(null))
      )),
    ).subscribe();

    this.destroy$.pipe(
      switchMap(() => this.Device.disconnect())
    ).subscribe();
  }

  ngOnInit(): void {
    this.loadSnet$.subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    combineLatest([
      this.Store.getVariablesWithVariableKey(),
      this.variables$.pipe(map(variables => variables.filter(v => v.group == group && !v.hide)))
    ]).pipe(
      take(1),
      map(([variableswithKey, variables]) => {
        let ret = [] as Variable[];
        ret = ret.concat(...variableswithKey, ...variables);
        return ret.filter((a, index, arr) => arr.findIndex(b => (b.hash === a.hash)) === index)
      })).subscribe(variables => this.Device.changeMonitoredVariables(variables))
  }

  unselectGroup() {
    this.Device.changeMonitoredVariables([]);
  }

  bridgeConnect() {
    this.bridgeChannel$.pipe(
      switchMap(() => this.modal.openAlertModal({
        title: "modal.title.connection",
        message: "modal.bridge.connection",
        progress: true
      })),
      switchMap(() => this.Device.connect()),
      switchMap(() => this.loadSnet$),
      tap(() => this.modal.dismissAll()),
      take(1),
      switchMap(() => this.Device.startRead()),
      catchError(err => this.modal.openAlertModal({
        title: "error",
        message: err.message,
      }))
    ).subscribe();
  }


  bleConnect() {
    this.BLEChannel$.pipe(
      switchMap(() => this.Device.connect()),
      switchMap(() => this.modal.openAlertModal({
        title: "modal.title.connection",
        message: "modal.ble.connection",
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
        title: "modal.title.connection",
        message: "modal.wifi.connection",
        progress: true
      }).pipe(ignoreElements()),
      this.wifiConnectionAvailable$.pipe(
        switchMap(available => {
          if (available)
            return of(available)
          else
            return throwError(() => new Error("modal.wifi.connectionerror"));
        }),
        switchMap(() => this.Device.connect()),
        switchMap(() => this.loadSnet$),
        tap(() => this.modal.dismissAll()),
        take(1),
        switchMap(() => this.Device.startRead()),
        catchError(err => {
          return this.modal.openAlertModal({
            title: "error",
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

  openMobileMenu() {
    this.mobileMenuOpen = true;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  selectTab($event: any) {
    const option = $event.value as number;
    this.nav?.select("ngb-nav-" + option);
  }
}
