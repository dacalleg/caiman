import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxScannerQrcodeComponent } from 'ngx-scanner-qrcode';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-barcode',
  templateUrl: './barcode.component.html',
  styleUrls: ['./barcode.component.scss']
})
export class BarcodeComponent implements AfterViewInit {

  lastDeviceId: string | null;
  @ViewChild("action") scanner: NgxScannerQrcodeComponent | undefined;

  constructor(private NgbActiveModal: NgbActiveModal) {
    this.lastDeviceId = localStorage.getItem("lastDeviceId")
  }

  ngAfterViewInit(): void {
    if (this.scanner) {
      this.scanner.data.pipe(
        filter(results => results.length > 0),
        take(1),
      ).subscribe(data => {
        if (this.scanner) {
          this.scanner.stop();
          this.NgbActiveModal.close(data[0].value);
        }
      });
      this.scanner.devices.pipe(take(1)).subscribe(res => {
        if (this.scanner && this.lastDeviceId != null)
          this.scanner.playDevice(this.lastDeviceId);
        if(this.scanner)
          this.scanner.start();
      });
    }
  }

  cancel() {
    if (this.scanner) {
      this.scanner.stop();
    }
    this.NgbActiveModal.dismiss();
  }

  toggleCam() {
    if (this.scanner) {
      this.scanner.devices.pipe(take(1)).subscribe(res => {
        if (this.scanner) {
          const index = (this.scanner.deviceIndexActive + 1) % res.length;
          this.scanner.playDevice(res[index].deviceId);
          localStorage.setItem("lastDeviceId", res[index].deviceId);
        }
      })
    }
  }

}

