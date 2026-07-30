import { Injectable } from '@angular/core';
import { filter, interval, Observable, shareReplay, Subscription, tap } from 'rxjs';
import { ApiService } from './api.service';

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class SyncSchedulerService {
  private syncInProgress = false;
  private periodicSubscription: Subscription | null = null;

  constructor(private Api: ApiService) {}

  runSyncIfOnline(): Observable<number> {
    if (!navigator.onLine) {
      return new Observable<number>(subscriber => {
        subscriber.next(1);
        subscriber.complete();
      });
    }

    if (this.syncInProgress) {
      return new Observable<number>(subscriber => {
        subscriber.next(1);
        subscriber.complete();
      });
    }

    this.syncInProgress = true;
    return this.Api.sync().pipe(
      tap({
        complete: () => {
          this.syncInProgress = false;
        },
        error: () => {
          this.syncInProgress = false;
        },
      }),
      shareReplay(1),
    );
  }

  startPeriodicSync(): void {
    if (this.periodicSubscription) {
      return;
    }

    this.periodicSubscription = interval(SYNC_INTERVAL_MS).pipe(
      filter(() => navigator.onLine && !this.syncInProgress),
    ).subscribe(() => {
      this.runSyncIfOnline().subscribe();
    });
  }
}
