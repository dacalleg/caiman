import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { catchError, filter, firstValueFrom, of, take, timeout } from 'rxjs';

const UPDATE_READY_TIMEOUT_MS = 30000;

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {

  constructor(private swUpdate: SwUpdate) {}

  async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator) || !this.swUpdate.isEnabled) {
      return;
    }

    await navigator.serviceWorker.ready;

    const updateReady = firstValueFrom(
      this.swUpdate.versionUpdates.pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        take(1),
        timeout(UPDATE_READY_TIMEOUT_MS),
        catchError(() => of(null))
      )
    );

    let updateAvailable = false;

    try {
      updateAvailable = await this.swUpdate.checkForUpdate();
    } catch {
      return;
    }

    if (!updateAvailable) {
      return;
    }

    const activatedImmediately = await this.swUpdate.activateUpdate().catch(() => false);

    if (activatedImmediately) {
      document.location.reload();
      return;
    }

    const readyEvent = await updateReady;

    if (!readyEvent) {
      return;
    }

    const activated = await this.swUpdate.activateUpdate().catch(() => false);

    if (activated) {
      document.location.reload();
    }
  }
}
