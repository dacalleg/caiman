import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { AlertModalConfig } from 'src/app/classes/interfaces';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent {
  config$: Observable<AlertModalConfig|null>;

  constructor(public activeModal: NgbActiveModal, private modalService: ModalService) {
    this.config$ = this.modalService.getAlertModalConfig();
  }
}
