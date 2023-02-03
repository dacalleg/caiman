import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertModalConfig } from 'src/app/classes/interfaces';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent {
  @Input() config: AlertModalConfig|null;

  constructor(public activeModal: NgbActiveModal) {
    this.config = null;
  }
}
