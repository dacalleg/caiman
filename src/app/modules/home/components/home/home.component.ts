import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { BehaviorSubject, filter, from, map, mergeMap, Observable, shareReplay, switchMap, take, tap, zip } from "rxjs";
import { Agua } from 'src/app/classes/agua';
import { Project, Variable } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { DeviceService } from 'src/app/services/device.service';
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

  constructor(
    private Store: StoreService,
    private Device: DeviceService,
    private SeramiParser: SeramiParserService,
    private ActivatedRoute: ActivatedRoute,
    private Api: ApiService,
    private Auth: AuthService,
    private http: HttpClient) {
    this.search$ = new BehaviorSubject<string>("");
    this.project$ = this.Store.getProject();

    this.ActivatedRoute.params.pipe(
      filter(params => params["mac"] != null),
      map((params: any) => params["mac"] as string),
      switchMap((mac) => this.Api.getDeviceInfoFromMac(mac).pipe(tap(device => this.Store.setDevice(device)))),
      switchMap((device) => this.Api.getAttachmentContent(device.info.serami_file).pipe(tap((content) => this.Store.loadFromSnet(content)))),
      switchMap(() => zip(this.Auth.getToken(), this.Store.getProject())),
      switchMap(arr => {
        const token = arr[0];
        const device = arr[1];
        console.log(device);
        if (token) {
          const channel = new Agua(this.http, device.device!.id_device, device.device!.id_product, token);
          this.Device.setChannel(channel);
        }
        return this.Device.startRead();
      })).subscribe();

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
}
