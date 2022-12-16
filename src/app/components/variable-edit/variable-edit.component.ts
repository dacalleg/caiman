import {Component, OnInit, ViewChild} from '@angular/core';
import {Variable, ViewOption} from "../../classes/interfaces";
import {Subject, takeUntil} from "rxjs";
import {NgbModalRef, NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {ModalService} from "../../services/modal.service";
import {StoreService} from "../../services/store.service";
import {ExportService} from "../../services/export.service";

@Component({
  selector: 'app-variable-edit',
  templateUrl: './variable-edit.component.html',
  styleUrls: ['./variable-edit.component.scss']
})
export class VariableEditComponent implements OnInit {

  @ViewChild('content') content: any;
  variable: Variable | null;
  destroy$: Subject<void>;
  modal: NgbModalRef | null;
  byteorder: string;
  signed: boolean;
  unsignedString = ["B","H","I","Q"]
  signedString = ["b","h","i","q"]

  constructor(private NgbModal: NgbModal, private modalService: ModalService, private Store: StoreService) {
    this.destroy$ = new Subject();
    this.modal = null;
    this.variable = null;
    this.byteorder = "";
    this.signed = false;
    this.modalService.getVariableEditModal().subscribe((variable) => {
      this.variable = {...variable};
      this.byteorder = "";
      if(variable.pattern.includes(">"))
        this.byteorder = ">"
      if(variable.pattern.includes("<"))
        this.byteorder = "<"
      this.signed = this.signedString.reduce((acc: boolean, item) => {
        //@ts-ignore
        acc = acc || this.variable.pattern.includes(item);
        return acc;
      }, false);

      this.modal = this.NgbModal.open(this.content, {ariaLabelledBy: 'modal-basic-title', size: "xl"});
      this.modal.result.then((result) => {
      }, (reason) => {
      });
    })
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  save() {
    if (this.modal)
      this.modal.close();
  }

  onPatternChange($event: any) {
    if(this.variable)
    {
      let ret = this.byteorder;
      switch (this.variable.bit){
        case 8:
          if(this.signed)
            ret += "b"
          else
            ret += "B"
          break;
        case 16:
          if(this.signed)
            ret += "h"
          else
            ret += "H"
          break;
        case 32:
          if(this.signed)
            ret += "i"
          else
            ret += "I"
          break;
        case 64:
          if(this.signed)
            ret += "q"
          else
            ret += "Q"
          break;
      }
      this.variable = {...this.variable, pattern: ret};
    }
  }
}
