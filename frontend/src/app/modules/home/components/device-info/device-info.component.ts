import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DeviceProduct } from 'src/app/classes/interfaces';

@Component({
  selector: 'app-device-info',
  templateUrl: './device-info.component.html',
  styleUrls: ['./device-info.component.scss']
})
export class DeviceInfoComponent implements OnInit, OnDestroy {

  @Input() device: DeviceProduct | null;
  @Input() connected: boolean | null;
  @Output() onDisconnect: EventEmitter<void>;
  @Output() onBLEConnect: EventEmitter<void>;
  @Output() onBridgeConnect: EventEmitter<void>;
  @Output() onWifiConnect: EventEmitter<void>;

  isOffline = !navigator.onLine;

  private readonly onlineHandler = () => {
    this.isOffline = false;
  };

  private readonly offlineHandler = () => {
    this.isOffline = true;
  };

  constructor() {
    this.device = null;
    this.connected = false;
    this.onDisconnect = new EventEmitter();
    this.onBLEConnect = new EventEmitter();
    this.onBridgeConnect = new EventEmitter();
    this.onWifiConnect = new EventEmitter();
  }

  ngOnInit(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
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
