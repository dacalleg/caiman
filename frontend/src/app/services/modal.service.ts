import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, defer, from, Observable, of, shareReplay, Subject } from "rxjs";
import { AlertModalConfig, Variable } from "../classes/interfaces";
import { AlertComponent } from '../components/alert/alert.component';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  private optionModal$: Subject<void>;
  private connectionSerialModal$: Subject<string>;
  private variableEditModal$: Subject<Variable>;
  private optimizationModal$: Subject<void>;

  private alertModalConfigSubject$: BehaviorSubject<AlertModalConfig | null>; 

  constructor(private modalService: NgbModal) {
    this.optionModal$ = new Subject<void>();
    this.connectionSerialModal$ = new Subject<string>();
    this.optimizationModal$ = new Subject<void>();
    this.variableEditModal$ = new Subject<Variable>();
    this.alertModalConfigSubject$ = new BehaviorSubject<AlertModalConfig | null>(null);
  }

  getAlertModalConfig() {
    return this.alertModalConfigSubject$.asObservable();
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

  openAlertModal(config: AlertModalConfig) {
    return defer(() => {
      this.modalService.dismissAll();
      const modalRef = this.modalService.open(AlertComponent, {centered: true, backdrop: config.progress ? 'static' : true, keyboard: false});
      this.alertModalConfigSubject$.next(config);
      if(config.progress === true)
        return of(void 0);
      return from(modalRef.result)
    })
  }

  upodateAlertModalConfig(config: AlertModalConfig) {
    this.alertModalConfigSubject$.next(config);
  }

  dismissAll() {
    this.modalService.dismissAll();
  }
}
