import {Component, ElementRef, EventEmitter, OnInit, Output, signal, ViewChild} from '@angular/core';
import { StoreService } from "../../services/store.service";
import { ModalService } from "../../services/modal.service";
import { map, Observable, take, tap } from "rxjs";
import { Project } from "../../classes/interfaces";
import { DeviceService } from "../../services/device.service";
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router'
import { ApiService } from 'src/app/services/api.service';
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
  info$: Observable<any>;
  isAdmin$: Observable<boolean>;
  menuOpen: boolean;

  constructor(
    private Store: StoreService,
    private modalService: ModalService,
    private Device: DeviceService,
    private AuthService: AuthService,
    private Router: Router,
    private Api: ApiService
  ) {
    this.file = null;
    this.project$ = this.Store.getProject();
    this.isDeviceConnected$ = this.Device.isConnected();
    this.username$ = this.AuthService.getUserName();
    this.roles$ = this.AuthService.getRoles().pipe(map(roles => roles.join(", ")));
    this.info$ = this.Api.getInfo();
    this.isAdmin$ = this.AuthService.getRoles().pipe(map(roles => roles.includes("administrator")))
    this.menuOpen = false;
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

  logout() {
    this.menuOpen = false;
    this.AuthService.logout().pipe(
      tap(() => this.Router.navigate(['/auth/login']))
    ).subscribe();
  }

  profile() {
    this.menuOpen = false;
    this.Router.navigate(['/dashboard/profile'])
  }

  burgerMenuClicked() {
    this.menuOpen = !this.menuOpen;
  }

  deviceSelector() {
    this.menuOpen = false;
    this.Router.navigate(['/dashboard/home'])

  }

  closeMenu() {
    this.menuOpen = false;
  }
}
