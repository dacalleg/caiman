import { Component, Input, OnInit } from '@angular/core';
import { filter, map, Observable, of, switchMap } from 'rxjs';
import { DeviceProduct, LogItem } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { StoreService } from 'src/app/services/store.service';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent implements OnInit {
  @Input() device: DeviceProduct | undefined;
  deviceLogs$: Observable<LogItem[]>;

  constructor(private Store: StoreService, private Api: ApiService) {
    this.deviceLogs$ = of([]);
  }
  ngOnInit(): void {
    this.deviceLogs$ = of(this.device).pipe(
      filter(device => device !== undefined && device.serial !== undefined),
      map(device => device!.serial),
      switchMap(serial => this.Api.getLogsForDevice(serial))
    )
  }


}
