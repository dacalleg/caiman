import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BehaviorSubject, combineLatest, concatMap, delay, filter, from, ignoreElements, map, Observable, of, repeat, retry, switchMap, take, takeUntil, tap, timeout, toArray } from 'rxjs';
import { Database, DeviceProduct, Firmware, VariableValue, WifiStation, WifiStatus } from 'src/app/classes/interfaces';
import { Utils } from 'src/app/classes/utils';
import { ApiService } from 'src/app/services/api.service';
import { DeviceService } from 'src/app/services/device.service';
import { ModalService } from 'src/app/services/modal.service';
import { StoreService } from 'src/app/services/store.service';

class WriteDbError extends Error {
  constructor(
    message: string,
    readonly replaceParams: Record<string, string> = {},
  ) {
    super(message);
  }
}

@Component({
  selector: 'app-advanced',
  templateUrl: './advanced.component.html',
  styleUrls: ['./advanced.component.scss']
})
export class AdvancedComponent {
  private static readonly WRITE_DB_TIMEOUT_MS = 120_000;
  private static readonly WRITE_DB_MAX_RETRIES = 5;
  private static readonly WRITE_DB_RETRY_DELAY_MS = 3_000;

  @Input() device: DeviceProduct | undefined;
  @Output() onFirmwareGatewayUpgraded = new EventEmitter<void>();
  databaseSelected: Database | null;

  selectedFirmwareGateway: Firmware | null;
  selectedFirmwareBoard: Firmware | null;

  wifiRefreshSubject$: BehaviorSubject<void>;
  wifiStatus$: Observable<WifiStatus>;
  connectedViaWifi$: Observable<boolean>;


  constructor(private modal: ModalService, private Store: StoreService, private Device: DeviceService, private Api: ApiService) {
    this.databaseSelected = null;
    this.selectedFirmwareGateway = null;
    this.selectedFirmwareBoard = null;
    this.wifiRefreshSubject$ = new BehaviorSubject<void>(void 0);
    this.wifiStatus$ = this.wifiRefreshSubject$.pipe(
      switchMap(() => this.Device.getWifiStatus())
    );
    this.connectedViaWifi$ = this.Device.connectedViaWifi();
  }


  upgradeFirmwareGateway() {
    of(this.selectedFirmwareGateway).pipe(
      map(firmware => firmware!),
      switchMap(firmware => this.Api.getAttachmentUrlWithoutSSL(firmware.file)),
      switchMap(firmware => this.modal.openAlertModal({
        title: "modal.upgrading",
        message: "modal.upgrading.gateway",
        progress: true,
        progressValue: 0
      }).pipe(
        switchMap(() => this.Device.upgradeGatewayFirmware(firmware.url, firmware.md5).pipe(
          tap((progress) => this.modal.upodateAlertModalConfig({
            title: "modal.upgrading",
            progress: true,
            progressValue: progress.progress,
            message: "modal.upgrading.gateway"
          })),
        ))
      )),
    ).subscribe({
      error: (err) => {
        this.modal.upodateAlertModalConfig({
          title: "modal.upgrading",
          progress: false,
          message: this.convertUpgradeErrorMessages(err.message)
        })
      },
      complete: () => {
        this.onFirmwareGatewayUpgraded.emit();
        this.modal.upodateAlertModalConfig({
          title: "modal.upgrading",
          progress: false,
          message: "modal.upgrading.gateway.success"
        })
      }
    });
  }

  convertUpgradeErrorMessages(status: string | number): string {
    switch (Number(status)) {
      case -7:
        return "Checksum error";
      case -6:
        return "Remote error";
      case -5:
        return "Path error";
      case -4:
        return "File already exists";
      case -3:
        return "OTA begin error";
      case -2:
        return "Ota partition fail";
      case -1:
        return "Upgrade fail";
      default:
        return "unknown";
    }
  }

  upgradeFirmwareBoard() {
    of(this.selectedFirmwareBoard).pipe(
      map(firmware => firmware!),
      switchMap(firmware => this.Api.getAttachmentUrlWithoutSSL(firmware.file)),
      switchMap(firmware => this.modal.openAlertModal({
        title: "modal.upgrading",
        message: "modal.upgrading.board",
        progress: true,
        progressValue: 0
      }).pipe(
        switchMap(() => this.Device.upgradePowerBoardFirmware(firmware.url, firmware.md5, this.selectedFirmwareBoard!.revision).pipe(
          tap((progress) => this.modal.upodateAlertModalConfig({
            title: "modal.upgrading",
            progress: true,
            progressValue: progress.progress,
            message: "modal.upgrading.board"
          })),
        ))
      )),
    ).subscribe({
      error: (err) => {
        this.modal.upodateAlertModalConfig({
          title: "modal.upgrading",
          progress: false,
          message: this.convertUpgradeErrorMessages(err.message)
        })
      },
      complete: () => {
        this.modal.upodateAlertModalConfig({
          title: "modal.upgrading",
          progress: false,
          message: "modal.upgrading.board.success"
        })
      }
    });
  }

  loadDatabase() {
    if (this.databaseSelected) {
      let i = 0;
      let currentVarName = '';
      let count = this.databaseSelected.values.length;
      combineLatest([
        of(this.databaseSelected),
        this.modal.openAlertModal({
          title: "modal.writedb.title",
          progress: true,
          progressValue: 0,
          replaceParams: { dbname: this.databaseSelected.name }
        }),
      ]).pipe(
        switchMap(([database, modal]) => from(database.values)),
        concatMap((dbvalue) => combineLatest([of(dbvalue), this.Store.getVariableByHash(dbvalue.id)]).pipe(
          map(([dbvalue, variable]) => {
            if (variable == null)
              throw new WriteDbError("modal.writedb.error.varnotfound", { varid: dbvalue.id });
            return { variable: variable, value: Utils.convertValuesToWrite([variable], [+dbvalue.value])[0] } as VariableValue
          }),
          tap((value) => {
            currentVarName = value.variable.name;
            this.modal.upodateAlertModalConfig({
              title: "modal.writedb.title",
              progress: true, progressValue: (i / count) * 100,
              message: "modal.writedb.message",
              replaceParams: { dbname: this.databaseSelected!.name, varname: currentVarName }
            });
          }),
          switchMap((value) => this.Device.write([value])),
          timeout(AdvancedComponent.WRITE_DB_TIMEOUT_MS),
          retry({
            count: AdvancedComponent.WRITE_DB_MAX_RETRIES,
            delay: AdvancedComponent.WRITE_DB_RETRY_DELAY_MS,
          }),
          tap(() => i++),
        )),
        toArray(),
        tap(() => this.modal.dismissAll()),
        switchMap(() => this.modal.openAlertModal({
          title: "modal.writedb.title",
          message: "modal.writedb.success",
          replaceParams: { dbname: this.databaseSelected!.name }
        }))
      ).subscribe({
        error: (err) => {
          const isTimeout = err?.name === 'TimeoutError';
          const message = err instanceof WriteDbError
            ? err.message
            : isTimeout
              ? 'modal.writedb.error.timeout'
              : 'modal.writedb.error.write';

          const replaceParams = {
            dbname: this.databaseSelected!.name,
            varname: currentVarName,
            ...(err instanceof WriteDbError ? err.replaceParams : {}),
          };

          this.modal.upodateAlertModalConfig({
            title: "modal.writedb.title",
            progress: false,
            message,
            replaceParams,
          });
        },
        complete: () => {

        }
      });
    }
  }

  connectWifi($event: { station: WifiStation, password: string }) {
    this.connectedViaWifi$.pipe(
      take(1),
      filter(connectedViaWifi => !connectedViaWifi),
      switchMap(() => this.modal.openAlertModal({
        title: "modal.wifistation.connection",
        message: "modal.wifistation.message",
        progress: true,
        replaceParams: { ssid: $event.station.ssid }
      }).pipe(
        switchMap(() => this.Device.setWifi($event.station.ssid, $event.password).pipe(
          switchMap(() => of(void 0).pipe(
            delay(1000),
            tap(() => this.wifiRefreshSubject$.next()),
            repeat()
          )),
          ignoreElements(),
          timeout(15000),
          takeUntil(this.wifiStatus$.pipe(filter(status => status.wifi_connected))),
        ))
      ))
    ).subscribe({
      error: (err) => {
        this.modal.upodateAlertModalConfig(
          {
            title: "modal.wifistation.connection",
            progress: false,
            message: "modal.wifistation.timeout"
          })
      },
      complete: () => this.modal.dismissAll()
    });
  }

  disconnectWifi() {
    this.connectedViaWifi$.pipe(
      take(1),
      filter(connectedViaWifi => !connectedViaWifi),
      switchMap(() => this.modal.openAlertModal({
        title: "modal.disconnecting",
        message: "modal.disconnecting.message",
        progress: true,
      }).pipe(
        switchMap(() => this.Device.disconnectWifi().pipe(
          switchMap(() => of(void 0).pipe(
            delay(1000),
            tap(() => this.wifiRefreshSubject$.next()),
            repeat()
          )),
          ignoreElements(),
          timeout(15000),
          takeUntil(this.wifiStatus$.pipe(filter(status => !status.wifi_connected))),
        ))
      ))
    ).subscribe({
      error: (err) => {
        this.modal.upodateAlertModalConfig({ title: "modal.disconnecting", progress: false, message: "timeout" })
      },
      complete: () => this.modal.dismissAll()
    });
  }

  scanWifi() {
    this.wifiRefreshSubject$.next();
  }
}
