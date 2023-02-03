import {Component, OnInit, ViewChild} from '@angular/core';
import {NgbModal, NgbModalRef} from "@ng-bootstrap/ng-bootstrap";
import { SerialConnectionSettings } from 'src/app/classes/interfaces';
import { DeviceService } from 'src/app/services/device.service';
import { ModalService } from 'src/app/services/modal.service';

@Component({
  selector: 'app-serial-modal',
  templateUrl: './serial-modal.component.html',
  styleUrls: ['./serial-modal.component.scss']
})
export class SerialModalComponent implements OnInit {
  @ViewChild('content') content: any;
  options: SerialConnectionSettings;
  modal: NgbModalRef|null;
  channel: string|null;

  constructor(private NgbModal: NgbModal, private modalService: ModalService, private Device: DeviceService) {
    this.modal = null;
    this.channel = null;
    this.options = {
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      readTimeout: 150
    } as SerialConnectionSettings;
    this.modalService.getConnectionSerialModal().subscribe((channel) => {
      this.channel = channel;
      this.modal = this.NgbModal.open(this.content, {ariaLabelledBy: 'modal-basic-title'});
      this.modal.result.then((result) => {
      }, (reason) => {
      });
    })
  }

  ngOnInit(): void {
  }

  connect() {
    /*this.Device.setChannel(this.channel);
    this.Device.startRead(this.options);*/
    if(this.modal)
      this.modal.close();
  }
}
