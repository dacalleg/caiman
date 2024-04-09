import { Component } from '@angular/core';
import { BarcodeFormat } from '@zxing/library';
import {BehaviorSubject, from, Observable} from 'rxjs';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-barcode',
  templateUrl: './barcode.component.html',
  styleUrls: ['./barcode.component.scss']
})
export class BarcodeComponent {

  availableDevices: MediaDeviceInfo[];
  deviceCurrent: MediaDeviceInfo|undefined;
  deviceSelected: string|undefined;

  formatsEnabled: BarcodeFormat[] = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.EAN_13,
    BarcodeFormat.QR_CODE,
  ];

  hasDevices: boolean|undefined;
  hasPermission: boolean|undefined;

  qrResultString: string|null|undefined;

  torchEnabled = false;
  torchAvailable$ = new BehaviorSubject<boolean>(false);
  tryHarder = false;
  permission$: Observable<PermissionStatus>;
  enabled: boolean;

  constructor(private NgbActiveModal: NgbActiveModal) {
    this.availableDevices = [];
    //@ts-ignore
    this.permission$ = from(navigator.permissions.query({ name: "camera" }));
    this.enabled = false;
  }

  clearResult(): void {
    this.qrResultString = null;
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    this.hasDevices = Boolean(devices && devices.length);
  }

  onCodeResult(resultString: string) {
    this.NgbActiveModal.close(resultString);
  }

  onDeviceSelectChange(selected: string) {
    const selectedStr = selected || '';
    if (this.deviceSelected === selectedStr) { return; }
    this.deviceSelected = selectedStr;
    const device = this.availableDevices.find(x => x.deviceId === selected);
    this.deviceCurrent = device || undefined;
  }

  onDeviceChange(device: MediaDeviceInfo) {
    const selectedStr = device?.deviceId || '';
    if (this.deviceSelected === selectedStr) { return; }
    this.deviceSelected = selectedStr;
    this.deviceCurrent = device || undefined;
  }

  onHasPermission(has: boolean) {
    this.hasPermission = has;
  }

  onTorchCompatible(isCompatible: boolean): void {
    this.torchAvailable$.next(isCompatible || false);
  }

  toggleTorch(): void {
    this.torchEnabled = !this.torchEnabled;
  }

  toggleTryHarder(): void {
    this.tryHarder = !this.tryHarder;
  }

  cancel()
  {
    this.NgbActiveModal.dismiss();
  }

  enable() {
    this.enabled = true;
  }

}

