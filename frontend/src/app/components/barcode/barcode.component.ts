import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { Observable } from '@influxdata/influxdb-client';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxScannerQrcodeComponent } from 'ngx-scanner-qrcode';
import { Subject, filter, take, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-barcode',
  templateUrl: './barcode.component.html',
  styleUrls: ['./barcode.component.scss']
})
export class BarcodeComponent implements AfterViewInit, OnDestroy {

  lastDeviceId: string | null;
  devices: string[];
  destroy$: Subject<void>;
  @ViewChild("action") scanner: NgxScannerQrcodeComponent | undefined;

  constructor(private NgbActiveModal: NgbActiveModal) {
    this.lastDeviceId = localStorage.getItem("lastDeviceId") as string;
    this.devices = [];
    this.destroy$ = new Subject<void>();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    if (this.scanner)
      this.scanner.stop();
  }

  ngAfterViewInit(): void {
    if (this.scanner) {
      this.scanner.data.pipe(
        filter(results => results.length > 0),
        take(1),
        takeUntil(this.destroy$)
      ).subscribe(data => {
        if (this.scanner) {
          this.scanner.stop();
          this.NgbActiveModal.close(data[0].value);
        }
      });
      this.scanner.devices.pipe(
        tap(() => this.scanner!.start()), 
        filter(arr => arr && arr.length > 0), 
        take(1), 
        takeUntil(this.destroy$)).subscribe(res => {
        this.devices = res.map(item => item.deviceId);
        if (this.scanner && this.lastDeviceId != null)
          if(this.devices.includes(this.lastDeviceId))
          {
            this.scanner.playDevice(this.lastDeviceId);
          }
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
      if (this.devices.length > 0) {
        if (this.scanner) {
          const index = (this.scanner.deviceIndexActive + 1) % this.devices.length;
          this.scanner.playDevice(this.devices[index]);
          localStorage.setItem("lastDeviceId", this.devices[index]);
        }
      }
    }
  }
}

