import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import {EnvObj, Info, ProductInfo} from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import {BarcodeService} from "../../../../services/barcode.service";
import {environment} from "../../../../../environments/environment";
@Component({
  selector: 'app-device-select',
  templateUrl: './device-select.component.html',
  styleUrls: ['./device-select.component.scss']
})
export class DeviceSelectComponent implements OnInit {


  macAddress: string;
  serialNumber: string;
  products$: Observable<{ name: string, key: string }[]>;
  info$: Observable<Info>;
  selectedProduct: string | null;
  regCode: string;
  selectedOption: number;
  env: EnvObj;

  constructor(private Router: Router, private Api: ApiService, private Barcode: BarcodeService) {
    this.env = environment;
    this.selectedProduct = null;
    this.serialNumber = "";
    this.macAddress = "";
    this.regCode = "";
    this.products$ = this.Api.getAllProducts();
    this.info$ = this.Api.getInfo();
    this.selectedOption = 0;
  }

  ngOnInit(): void {
  }

  connectUsingMAC() {
    this.Router.navigate(['/dashboard/home', this.macAddress, this.serialNumber]);
  }

  connectUsingProduct() {
    localStorage.setItem("defaultMAC", this.macAddress);
    this.Router.navigate(['/dashboard/home', this.macAddress, this.serialNumber, this.selectedProduct]);
  }

  connectOffline() {
    localStorage.setItem("defaultMAC", this.macAddress);
    localStorage.setItem("defaultRegCode", this.regCode);

    this.Router.navigate(['/dashboard/home', this.macAddress, this.serialNumber, this.selectedProduct, this.regCode]);
  }

  connectUsingOnlySerial() {
    this.Router.navigate(['/dashboard/home', '0000', this.serialNumber]);
  }

  selectOption(n: number) {
    this.macAddress = "";
    if(n === 3 || n === 4)
      this.macAddress = localStorage.getItem("defaultMAC") || "";
    if(n===4)
      this.regCode = localStorage.getItem("defaultRegCode") || "";
    this.selectedOption = n;
  }

  scanMac()
  {
    this.Barcode.scan().subscribe(result => this.macAddress = result)
  }

  scanSerial() {
    this.Barcode.scan().subscribe(result => this.serialNumber = result)
  }
}
