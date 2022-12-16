import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { DeviceData, Project, Variable, ViewOption } from "../../classes/interfaces";
import { StoreService } from "../../services/store.service";
import { concatMap, debounceTime, filter, map, skipWhile, Subject, takeUntil } from "rxjs";
import struct from "../../classes/struct";
import { DeviceService } from "../../services/device.service";
import { TypePipe } from "../../pipes/type.pipe";
import { ModalService } from "../../services/modal.service";

@Component({
  selector: 'app-variable-tease',
  templateUrl: './variable-tease.component.html',
  styleUrls: ['./variable-tease.component.scss']
})
export class VariableTeaseComponent implements OnInit, OnDestroy {
  @Input() variable: Variable | null;
  destroy$: Subject<void>;
  viewOpt: ViewOption | null;
  deviceData: DeviceData | null;
  writeMode: boolean;
  writeSubject: Subject<string>;
  fullmask: number;

  constructor(private Store: StoreService, private Device: DeviceService, private Modal: ModalService) {
    this.variable = null;
    this.destroy$ = new Subject<void>();
    this.viewOpt = null;
    this.deviceData = null;
    this.writeMode = false;
    this.writeSubject = new Subject<string>();
    this.fullmask = 0;

    this.writeSubject.pipe(
      debounceTime(1000), 
      map(value => {
        const s = struct(this.variable?.pattern);
        const typePipe = new TypePipe();
        const type = typePipe.transform(this.variable);
        if (type === "string")
          return s.pack(value);
        else
          return s.pack(+value);
      }), 
      concatMap(value => this.Device.write(this.variable!, new Uint8Array(value))
    )).subscribe((ret) => {
      console.log(ret);
    })

    this.Device.getStream().pipe(
      takeUntil(this.destroy$),
      skipWhile(() => this.writeMode),
      filter(item => this.variable !== null && this.variable.address >= item.startAddress && this.variable.address < (item.startAddress + item.buffer.length) && item.buffer.length >= (this.variable.bit / 8) && item.memory === this.variable.memory),
    ).subscribe(value => this.deviceData = value);
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

  write($event: Event) {
    let target = $event.target as HTMLInputElement;
    this.writeSubject.next(target.value)
  }

  toggleWrite() {
    this.writeMode = !this.writeMode;
  }

  editVariable() {
    if (this.variable)
      this.Modal.openVariableEditModal(this.variable);
  }
}
