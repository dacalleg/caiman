import { Component, OnInit } from '@angular/core';
import {concat, ignoreElements, Observable, of, shareReplay} from "rxjs";
import {SyncSchedulerService} from "../../services/sync-scheduler.service";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  sync$: Observable<number>;
  completed$: Observable<boolean>;

  constructor(private SyncScheduler: SyncSchedulerService) {
    this.SyncScheduler.startPeriodicSync();
    this.sync$ = this.SyncScheduler.runSyncIfOnline().pipe(shareReplay(1));
    this.completed$ = concat(
      of(false),
      this.sync$.pipe(ignoreElements()),
      of(true)
    )
  }

  ngOnInit(): void {
  }

  openMobileMenu() {
    throw new Error('Method not implemented.');
  }
}
