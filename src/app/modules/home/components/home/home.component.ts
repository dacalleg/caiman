import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, concat, filter, from, ignoreElements, map, merge, mergeMap, Observable, of, shareReplay, switchMap, take, tap, throwError, zip } from "rxjs";
import { Agua } from 'src/app/classes/agua';
import { BleChannel } from 'src/app/classes/ble.channel';
import { Channel, DeviceProduct, Project, Variable } from 'src/app/classes/interfaces';
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


  project$: Observable<Project>;
  groups$: Observable<string[]>;
  variables$: Observable<Variable[]>;
  search$: BehaviorSubject<string>;
  aguaChannel$: Observable<Agua>;
  wifiConnectionAvailable$: Observable<boolean>;
  loadDeviceData$: Observable<DeviceProduct>;
  loadSnet$: Observable<string>;
  connected$: Observable<boolean>;

  BLEChannel$: Observable<BleChannel>;

  constructor(
    private Store: StoreService,
    private Device: DeviceService,
    private ActivatedRoute: ActivatedRoute,
    private Api: ApiService,
    private Auth: AuthService,
    private http: HttpClient,
    private modal: ModalService) {
    this.search$ = new BehaviorSubject<string>("");
    this.project$ = this.Store.getProject();


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
      tap((agua) => this.Device.setChannel(agua)),
    )

    this.BLEChannel$ = this.loadDeviceData$.pipe(
      map(() => new BleChannel()),
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

    this.Api.getAguaEnv().subscribe(env => console.log(env));
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

  bleConnect()
  {
    this.BLEChannel$.pipe(
      switchMap(() => this.Device.connect()),
      switchMap(() => this.loadSnet$),
      switchMap(() => this.Device.startRead()),
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
        switchMap(() => this.loadSnet$),
        tap(() => this.modal.dismissAll()),
        switchMap(() => this.Device.startRead()),
        catchError(err => this.modal.openAlertModal({
          title: "Error",
          message: err.message,
        }))
      )
    ).subscribe();
  }

  disconnect() {
    this.Device.disconnect();
  }
}
