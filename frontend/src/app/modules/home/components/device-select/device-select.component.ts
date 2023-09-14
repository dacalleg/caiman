import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Info, ProductInfo } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
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

  constructor(private Router: Router, private Api: ApiService) {
    this.selectedProduct = null;
    this.serialNumber = "5899887445";
    this.macAddress = "30C6F7C3E1D4";
    this.regCode = "79890979";
    this.products$ = this.Api.getAllProducts();
    this.info$ = this.Api.getInfo();
    this.Api.sync().subscribe(() => console.log("Sync Finished"))
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

}
