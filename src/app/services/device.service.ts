import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  filter,
  Observable,
  of,
  repeat,
  Subject,
  switchMap,
  takeUntil,
  tap,
  throwError,
} from "rxjs";
import { Channel, Variable, VariableValue } from "../classes/interfaces";

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private monitoredVariables: Variable[];
  private monitoredVariables$: BehaviorSubject<Variable[]>;

  private stop$: Subject<void>;
  private connected$: BehaviorSubject<boolean>;
  private channel: Channel | null;
  private stream$: Subject<VariableValue[]>;

  constructor() {
    this.monitoredVariables = [];
    this.stop$ = new Subject();
    this.connected$ = new BehaviorSubject<boolean>(false);
    this.channel = null
    this.monitoredVariables$ = new BehaviorSubject<Variable[]>([]);
    this.stream$ = new Subject();
  }

  setChannel(channel: Channel) {
    this.channel = channel;
  }

  startRead() {
    if (this.channel) {
      return of(0).pipe(
        switchMap(() => this.channel!.connect()),
        switchMap(() => this.monitoredVariables$),
        filter((variables) => variables.length > 0),
        switchMap((variables) => this.channel!.setVariableStream(variables)),
        switchMap(() => this.channel!.getStream()),
        tap(data => this.stream$.next(data)),
        takeUntil(this.stop$)
      )
    }
    else
      return throwError(() => new Error("Channel is null, call set channel before"))
  }

  getStream() {
    return this.stream$;
  }

  isConnected() {
    return this.connected$.asObservable();
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
      .filter(item => item.hash === variable.hash)
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

  stopRead() {
    this.stop$.next();
  }

  write(variables: VariableValue[]): Observable<VariableValue[]> {
    if (this.channel) {
      return this.channel.write(variables);
    }
    else
      return throwError(() => new Error("Channel is null, call set channel before"))
  }

  read(variables: Variable[]) {
    if (this.channel) {
      return this.channel.read(variables);
    }
    else
      return throwError(() => new Error("Channel is null, call set channel before"))
  }
}
