import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxScannerQrcodeComponent, ScannerQRCodeDevice } from 'ngx-scanner-qrcode';
import { Observable, Subject, filter, of, switchMap, take, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-barcode',
  templateUrl: './barcode.component.html',
  styleUrls: ['./barcode.component.scss']
})
export class BarcodeComponent implements AfterViewInit, OnDestroy {


  devices$: Observable<ScannerQRCodeDevice[]>;
  destroy$: Subject<void>;
  noPermission: boolean;
  selectedDevice: string | undefined;
  @ViewChild("action") scanner: NgxScannerQrcodeComponent | undefined;

  constructor(private NgbActiveModal: NgbActiveModal) {
    this.destroy$ = new Subject<void>();
    this.noPermission = false;
    this.devices$ = of([])
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    if (this.scanner)
      this.scanner.stop();
  }

  ngAfterViewInit(): void {
    this.checkPermission();
    if (this.scanner) {
      this.devices$ = this.scanner?.devices.asObservable();
      this.devices$.pipe(filter(arr => arr.length > 0), take(1), takeUntil(this.destroy$)).subscribe(devices => this.selectedDevice = devices.length > 0 ? devices[0].deviceId : undefined);
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

      this.scanner.start().pipe(
        takeUntil(this.destroy$),
      ).subscribe()
    }
  }

  cancel() {
    if (this.scanner) {
      this.scanner.stop();
    }
    this.NgbActiveModal.dismiss();
  }

  async checkPermission() {
    try {
      // Will try to ask for permission
      let stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.noPermission = false;
      return true;
    } catch (err) {
      this.noPermission = true;
      return false;
    }
  }

  changeDevice($event: string) {
    this.selectedDevice = $event;
    if (this.scanner) {
      this.scanner.playDevice(this.selectedDevice);
    }
  }
}

