import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BehaviorSubject, combineLatest, concatMap, delay, filter, from, ignoreElements, map, Observable, of, repeat, retry, switchMap, takeUntil, tap, timeout, toArray } from 'rxjs';
import { Database, DeviceProduct, Firmware, VariableValue, WifiStation, WifiStatus } from 'src/app/classes/interfaces';
import { Utils } from 'src/app/classes/utils';
import { ApiService } from 'src/app/services/api.service';
import { DeviceService } from 'src/app/services/device.service';
import { ModalService } from 'src/app/services/modal.service';
import { StoreService } from 'src/app/services/store.service';

@Component({
  selector: 'app-advanced',
  templateUrl: './advanced.component.html',
  styleUrls: ['./advanced.component.scss']
})
export class AdvancedComponent {
  @Input() device: DeviceProduct | undefined;
  @Output() onFirmwareGatewayUpgraded = new EventEmitter<void>();
  databaseSelected: Database | null;

  selectedFirmwareGateway: Firmware | null;
  selectedFirmwareBoard: Firmware | null;

  wifiRefreshSubject$: BehaviorSubject<void>;
  wifiStatus$: Observable<WifiStatus>;


  constructor(private modal: ModalService, private Store: StoreService, private Device: DeviceService, private Api: ApiService) {
    this.databaseSelected = null;
    this.selectedFirmwareGateway = null;
    this.selectedFirmwareBoard = null;
    this.wifiRefreshSubject$ = new BehaviorSubject<void>(void 0);
    this.wifiStatus$ = this.wifiRefreshSubject$.pipe(
      switchMap(() => this.Device.getWifiStatus())
    );
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
          message: err.message
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
          message: err.message
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
              throw new Error("modal.writedb.error.varnotfound");
            return { variable: variable, value: Utils.convertValuesToWrite([variable], [+dbvalue.value])[0] } as VariableValue
          }),
          tap((value) => this.modal.upodateAlertModalConfig({
            title: "modal.writedb.title",
            progress: true, progressValue: (i / count) * 100,
            message: "modal.writedb.message",
            replaceParams: { dbname: this.databaseSelected!.name, varname: value.variable.name }
          })),
          switchMap((value) => this.Device.write([value])),
          tap(() => i++),
          timeout(5000),
          retry(5)
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
          this.modal.upodateAlertModalConfig({
            title: "modal.writedb.title",
            progress: false,
            message: err.message,
            replaceParams: { dbname: this.databaseSelected!.name }
          })
        },
        complete: () => {

        }
      });
    }
  }

  connectWifi($event: { station: WifiStation, password: string }) {
    this.modal.openAlertModal({
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
    this.modal.openAlertModal({
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
