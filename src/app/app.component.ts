import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { map, switchMap, tap } from "rxjs";
import { Agua } from './classes/agua';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { DeviceService } from './services/device.service';
import { StoreService } from './services/store.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'serami';

  constructor(private Store: StoreService, private http: HttpClient, private Api: ApiService, private device: DeviceService, private Auth: AuthService) {
    /*this.Api.getAttachmentContent(42).subscribe({
      next: (response) => console.log(response),
      error: (error) => console.log(error)
    })

    this.Store.getProject().pipe(
      switchMap(() => this.Auth.getToken()),
      switchMap((token) => this.Api.getDeviceInfoFromMac("30C6F7C25168").pipe(
      //switchMap((token) => this.Api.getDeviceInfoFromMac("349454B99990").pipe(
        tap(response => console.log(response)),
        map((response) => {
          return { token: token, id_device: response.id_device, id_product: response.id_product }
        })
      )),
      switchMap(response => {
        if (response.token) {
          const channel = new Agua(this.http, response.id_device, response.id_product, response.token);
          this.device.setChannel(channel);
        }
        return this.device.startRead();
      })).subscribe({
        next: () => console.log("next"),
        error: (e) => console.log(e),
        complete: () => console.log("complete")

      })*/
  }


}
