import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { concat, concatMap, debounceTime, filter, finalize, from, map, Observable, of, scan, shareReplay, Subject, switchMap, takeUntil, takeWhile, tap, timer } from "rxjs";
import { Project, Variable, VariableValue, ViewOption } from 'src/app/classes/interfaces';
import { DeviceService } from 'src/app/services/device.service';
import { ModalService } from 'src/app/services/modal.service';
import { StoreService } from 'src/app/services/store.service';

@Component({
  selector: 'app-variable-tease',
  templateUrl: './variable-tease.component.html',
  styleUrls: ['./variable-tease.component.scss']
})
export class VariableTeaseComponent implements OnInit, OnDestroy {
  @Input() variable: Variable | null;
  destroy$: Subject<void>;
  viewOpt: ViewOption | null;
  writeMode: boolean;
  fullmask: number;
  value$: Observable<VariableValue>;
  project$: Observable<Project>;
  newValue: number | string;
  writing: boolean;
  cancelSubject: Subject<void>;
  startCounter: Subject<void>;
  counter$: Observable<number>;
  writeSubject$: Subject<number>;

  constructor(private Store: StoreService, private Device: DeviceService, private Modal: ModalService) {
    this.variable = null;
    this.destroy$ = new Subject<void>();
    this.viewOpt = null;
    this.writeMode = false;
    this.cancelSubject = new Subject<void>();
    this.fullmask = 0;
    this.newValue = 0;
    this.writing = false;
    this.startCounter = new Subject<void>();
    this.writeSubject$ = new Subject<number>();

    this.subscribeWrite();

    this.cancelSubject.pipe(
      takeUntil(this.destroy$),
    ).subscribe(() => this.subscribeWrite());

    this.counter$ = concat(of(0), this.startCounter.pipe(
      switchMap(() => concat(timer(0, 1000).pipe(
        scan(acc => --acc, 6),
        takeUntil(this.startCounter),
        takeUntil(this.cancelSubject),
        takeWhile(x => x >= 1),
      ), of(0))),
      shareReplay(1),
    ));

    this.value$ = this.Device.getStream().pipe(
      switchMap((variables) => from(variables)),
      filter(variable => !this.writeMode && variable.variable.hash === this.variable!.hash),
      tap(value => this.newValue = value.value)
    )

    this.project$ = this.Store.getProject();

    this.Store.getProject().pipe(takeUntil(this.destroy$), map((prj: Project) => prj.view)).subscribe(option => {
      this.viewOpt = option;
    });
  }

  subscribeWrite()
  {
    this.writeSubject$.pipe(
      takeUntil(this.destroy$),
      debounceTime(5000),
      tap(() => {
        this.writeMode = false;
        this.writing = true;
      }),
      takeUntil(this.cancelSubject),
      map(value => {
        return { variable: this.variable, value: value } as VariableValue
      }),
      concatMap(value => this.Device.write([value])
      )).subscribe({
        next: () => {
          this.writing = false;
        },
        error: (err) => {
          this.writing = false;
          this.cancelSubject.next();
        },
        complete: () => {
          this.cancelSubject.next();
        }
    });
  }

  ngOnInit(): void {
    if (this.variable)
      this.fullmask = 2 ** this.variable.bit - 1;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  write(value: number) {
    this.startCounter.next();
    this.writeSubject$.next(+value);
  }

  toggleWrite() {
    this.writeMode = !this.writeMode;
  }

  editVariable() {
    if (this.variable)
      this.Modal.openVariableEditModal(this.variable);
  }

  isNumber(value: any) {
    return !Number.isNaN(value);
  }

  cancel() {
    this.cancelSubject.next();
    this.writeMode = false;
  }
}
