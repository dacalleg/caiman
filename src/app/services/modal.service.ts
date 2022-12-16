import {Injectable} from '@angular/core';
import {Subject} from "rxjs";
import {Variable} from "../classes/interfaces";

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private optionModal$: Subject<void>;
  private connectionSerialModal$: Subject<string>;
  private variableEditModal$: Subject<Variable>;
  private optimizationModal$: Subject<void>;

  constructor() {
    this.optionModal$ = new Subject<void>();
    this.connectionSerialModal$ = new Subject<string>();
    this.optimizationModal$ = new Subject<void>();
    this.variableEditModal$ = new Subject<Variable>();
  }

  openOptionModal() {
    this.optionModal$.next();
  }

  openOptimizationModal() {
    this.optimizationModal$.next();
  }

  getOptimizationModal() {
    return this.optimizationModal$.asObservable();
  }

  getOptionModal() {
    return this.optionModal$.asObservable();
  }

  openConnectionSerialModal(channel: string) {
    this.connectionSerialModal$.next(channel);
  }

  getConnectionSerialModal() {
    return this.connectionSerialModal$.asObservable();
  }

  openVariableEditModal(variable: Variable) {
    this.variableEditModal$.next(variable);
  }

  getVariableEditModal() {
    return this.variableEditModal$.asObservable();
  }
}
