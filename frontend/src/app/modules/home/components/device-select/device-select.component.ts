import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Info, ProductInfo } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import {BarcodeService} from "../../../../services/barcode.service";
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

  constructor(private Router: Router, private Api: ApiService, private Barcode: BarcodeService) {
    this.selectedProduct = null;
    this.serialNumber = "";
    this.macAddress = "";
    this.regCode = "";
    this.products$ = this.Api.getAllProducts();
    this.info$ = this.Api.getInfo();
    this.Api.sync().subscribe({complete: () => console.log("Sync Finished")})
    this.selectedOption = 0;
  }

  ngOnInit(): void {
  }

  connectUsingMAC() {
    this.Router.navigate(['/dashboard/home', this.macAddress, this.serialNumber]);
  }

  connectUsingProduct() {
    this.Router.navigate(['/dashboard/home', this.macAddress, this.serialNumber, this.selectedProduct]);
  }

  connectOffline() {
    this.Router.navigate(['/dashboard/home', this.macAddress, this.serialNumber, this.selectedProduct, this.regCode]);
  }

  connectUsingOnlySerial() {
    this.Router.navigate(['/dashboard/home', '0000', this.serialNumber]);
  }

  selectOption(n: number) {
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
