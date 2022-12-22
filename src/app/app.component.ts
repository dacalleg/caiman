import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { switchMap } from "rxjs";
import { Agua } from './classes/agua';
import { DeviceService } from './services/device.service';
import { StoreService } from './services/store.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'serami';

  constructor(private Store: StoreService, private http: HttpClient, private device: DeviceService) {
    this.Store.getProject().pipe(switchMap(project => {
      const id_device = "579CB4D3-EAF7-4E38-BF80-1095C3E47C4D";
      const id_product = "498C6A07-B4CC-4FAC-891F-0B2A38925289";
      const channel = new Agua(this.http, id_device, id_product, "");
      this.device.setChannel(channel);
      return this.device.startRead();
    })).subscribe({
      next: () => console.log("next"),
      error: (e) => console.log(e),
      complete: () => console.log("complete")

    })
  }


}
