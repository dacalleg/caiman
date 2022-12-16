import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NgbModal, NgbModalRef} from "@ng-bootstrap/ng-bootstrap";
import {ModalService} from "../../services/modal.service";
import {ViewOption} from "../../classes/interfaces";
import {StoreService} from "../../services/store.service";
import {Subject, takeUntil} from "rxjs";

@Component({
  selector: 'app-option-modal',
  templateUrl: './option-modal.component.html',
  styleUrls: ['./option-modal.component.scss']
})
export class OptionModalComponent implements OnInit, OnDestroy {
  @ViewChild('content') content: any;
  option: ViewOption | null;
  destroy$: Subject<void>;
  modal: NgbModalRef|null;

  constructor(private NgbModal: NgbModal, private modalService: ModalService, private Store: StoreService) {
    this.option = null;
    this.destroy$ = new Subject();
    this.modal = null;
    this.Store.getProject().pipe(takeUntil(this.destroy$)).subscribe(project => {
      this.option = project.view
    })
    this.modalService.getOptionModal().subscribe(() => {
      this.modal = this.NgbModal.open(this.content, {ariaLabelledBy: 'modal-basic-title'});
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
    if (this.option)
      this.Store.setViewOptions(this.option);
    if(this.modal)
      this.modal.close();
  }
}
