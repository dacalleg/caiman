import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { concatMap, debounceTime, filter, from, map, Observable, Subject, switchMap, takeUntil, tap } from "rxjs";
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
  writeSubject: Subject<number>;
  fullmask: number;
  value$: Observable<VariableValue>;
  project$: Observable<Project>;
  newValue: number;

  constructor(private Store: StoreService, private Device: DeviceService, private Modal: ModalService) {
    this.variable = null;
    this.destroy$ = new Subject<void>();
    this.viewOpt = null;
    this.writeMode = false;
    this.writeSubject = new Subject<number>();
    this.fullmask = 0;
    this.newValue = 0;

    this.writeSubject.pipe(
        debounceTime(1000),
        tap(() => this.writeMode = false),
        map(value => {
          return { variable: this.variable, value: value } as VariableValue
        }),
        concatMap(value => this.Device.write([value])
      )).subscribe();

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

  ngOnInit(): void {
    if (this.variable)
      this.fullmask = 2 ** this.variable.bit - 1;
  }

  hideVariable() {
    if (this.variable)
      this.Store.hideVariable(this.variable);
  }

  showVariable() {
    if (this.variable)
      this.Store.showVariable(this.variable);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  write(value: number) {
    this.writeSubject.next(+value);
  }

  toggleWrite() {
    this.writeMode = !this.writeMode;
  }

  editVariable() {
    if (this.variable)
      this.Modal.openVariableEditModal(this.variable);
  }
}
