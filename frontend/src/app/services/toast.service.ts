import {Injectable} from '@angular/core';
import {Subject} from "rxjs";
import { Toast } from '../classes/interfaces';

@Injectable()
export class ToastService {

  private toastSubject$: Subject<Toast>;
  private counter: number;

  constructor() {
    this.counter = 0;
    this.toastSubject$ = new Subject<Toast>();
  }

  getToast() {
    return this.toastSubject$.asObservable();
  }

  addSuccessToast(message: string, delay: number = 2000) {
    let toast = {
      message: message,
      delay: delay,
      id: this.counter,
      classes: "bg-success text-light"
    } as Toast;
    this.counter++;
    this.toastSubject$.next(toast);
  }

  addWarningToast(message: string, delay: number = 2000) {
    let toast = {
      message: message,
      delay: delay,
      id: this.counter,
      classes: "bg-warning text-light"
    } as Toast;
    this.counter++;
    this.toastSubject$.next(toast);
  }

  addDangerToast(message: string, delay: number = 2000) {
    let toast = {
      message: message,
      delay: delay,
      id: this.counter,
      classes: "bg-danger text-light"
    } as Toast;
    this.counter++;
    this.toastSubject$.next(toast);
  }
}
