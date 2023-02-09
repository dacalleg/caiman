import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DeviceProduct } from 'src/app/classes/interfaces';

@Component({
  selector: 'app-device-info',
  templateUrl: './device-info.component.html',
  styleUrls: ['./device-info.component.scss']
})
export class DeviceInfoComponent {

  @Input() device: DeviceProduct | null;
  @Input() connected: boolean | null;
  @Output() onDisconnect: EventEmitter<void>;
  @Output() onBLEConnect: EventEmitter<void>;
  @Output() onBridgeConnect: EventEmitter<void>;
  @Output() onWifiConnect: EventEmitter<void>;

  constructor() {
    this.device = null;
    this.connected = false;
    this.onDisconnect = new EventEmitter();
    this.onBLEConnect = new EventEmitter();
    this.onBridgeConnect = new EventEmitter();
    this.onWifiConnect = new EventEmitter();
  }

  disconnect() {
    this.onDisconnect.emit();
  }
  bridgeConnect() {
    this.onBridgeConnect.emit();
  }
  bleConnect() {
    this.onBLEConnect.emit();
  }
  wifiConnect() {
    this.onWifiConnect.emit();
  }
}
