import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WifiStation } from 'src/app/classes/interfaces';

@Component({
  selector: 'app-wifi-tease',
  templateUrl: './wifi-tease.component.html',
  styleUrls: ['./wifi-tease.component.scss']
})
export class WifiTeaseComponent {

  @Input() station: WifiStation|null;
  @Input() connected: boolean;
  @Output() onDisconnect: EventEmitter<void>;
  @Output() onConnect: EventEmitter<{station: WifiStation, password: string}>;
  password: string;
  showPasswordInput: boolean;

  constructor() {
    this.station = null;
    this.connected = false;
    this.onDisconnect = new EventEmitter();
    this.onConnect = new EventEmitter();
    this.password = "";
    this.showPasswordInput = false;
  }

  disconnect() {
    this.onDisconnect.emit();
  }

  connect() {
    this.showPasswordInput = false;
    this.onConnect.emit({station: this.station!, password: this.password});
  }

  showPassword() {
    this.showPasswordInput = true;
  }
}
