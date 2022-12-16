import { Component, OnInit } from '@angular/core';
import { StoreService } from "../../services/store.service";
import { BehaviorSubject, filter, from, map, mergeMap, Observable, shareReplay, switchMap, take } from "rxjs";
import { Project, Variable } from "../../classes/interfaces";
import { SeramiParserService } from "../../services/serami-parser.service";
import { DeviceService } from "../../services/device.service";

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

  constructor(private Store: StoreService, private Device: DeviceService, private SeramiParser: SeramiParserService) {
    this.search$ = new BehaviorSubject<string>("");
    this.project$ = this.Store.getProject();
    this.variables$ = this.search$.pipe(
      mergeMap(search => {
        return this.Store.getVariables().pipe(map(variables => {
          return variables.filter(item => {
            if (search == "")
              return true
            return (item.name + item.address + "0x" + item.address.toString(16)).toLowerCase().includes(search.toLowerCase());
          })
        }))
      }),
      shareReplay(1),
    )
    this.groups$ = this.variables$.pipe(map(variables => {
      const tmp = variables.map(item => item.group);
      return tmp.filter((x, i, a) => a.indexOf(x) == i)
    }));
    this.groups$.pipe(filter(item => item.length > 0), take(1)).subscribe(groups => {
      this.onGroupSelected(groups[0]);
    });
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
