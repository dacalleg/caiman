import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { StoreService } from "../../../../services/store.service";
import { ModalService } from "../../../../services/modal.service";
import { map, Observable, take, tap } from "rxjs";
import { DeviceData, Project, Variable } from "../../../../classes/interfaces";
import { DeviceService } from "../../../../services/device.service";
import { ExportService } from "../../../../services/export.service";
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router'
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {


  @ViewChild("file") file: ElementRef | null;
  @Output() onBurgerClicked = new EventEmitter<void>();
  project$: Observable<Project>;
  isDeviceConnected$: Observable<boolean>;
  username$: Observable<any>;
  roles$: Observable<string>;

  constructor(
    private Store: StoreService,
    private modalService: ModalService,
    private exporter: ExportService,
    private Device: DeviceService,
    private AuthService: AuthService,
    private Router: Router
  ) {
    this.file = null;
    this.project$ = this.Store.getProject();
    this.isDeviceConnected$ = this.Device.isConnected();
    this.username$ = this.AuthService.getUserName();
    this.roles$ = this.AuthService.getRoles().pipe(map(roles => roles.join(", ")));
  }

  ngOnInit(): void {
  }

  onFileChange($event: Event) {
    this.readFile($event.target).then(data => {
      this.Store.loadFromSnet(data);
    });
  }

  async readFile(inputValue: any): Promise<string> {
    return new Promise<string>(resolve => {
      let file: File = inputValue.files[0];
      let myReader: FileReader = new FileReader();

      myReader.onloadend = function (e) {
        resolve(myReader.result as string)
      }
      myReader.readAsText(file);
    })
  }

  importSnet2() {
    if (this.file)
      this.file.nativeElement.click();
  }

  hexAddress() {
    this.Store.setAddressFormat(16);
  }

  decAddress() {
    this.Store.setAddressFormat(10);
  }

  modbusAddress(value: boolean) {
    this.Store.setAddressModbus(value)
  }

  settings() {
    this.modalService.openOptionModal();
  }

  optimization() {
    this.modalService.openOptimizationModal();
  }

  exportForNavelMicropython() {
    this.Store.getProject().pipe(take(1), map(project => {
      let variables = project.variables.filter(item => !item.hide);
      return this.exporter.variableToModbusNavel(variables, project.view.modbusEEpromOffset);
    })).subscribe(result => {
      this.download("export.json", JSON.stringify(result));
    })
  }

  private download(filename: string, text: string) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  close() {
    this.Store.closeProject();
  }

  connectSerial() {
    this.modalService.openConnectionSerialModal("SERIAL");
  }

  connectBLE() {
    this.modalService.openConnectionSerialModal("BLE");
  }

  setExtentedView(value: boolean) {
    this.Store.setExtendedView(value);
  }

  exportForNova() {
    this.Store.getProject().pipe(take(1), map(project => {
      let variables = project.variables.filter(item => !item.hide);
      return this.exporter.variableToNova(variables);
    })).subscribe(result => {
      this.download("export.json", JSON.stringify(result));
    })
  }

  logout() {
    this.AuthService.logout().pipe(
      tap(() => this.Router.navigate(['/auth/login']))
    ).subscribe();
  }

  burgerMenuClicked() {
    this.onBurgerClicked.emit();
  }
}
