import {Component, ElementRef, EventEmitter, OnInit, Output, signal, ViewChild} from '@angular/core';
import { StoreService } from "../../services/store.service";
import { ModalService } from "../../services/modal.service";
import { map, Observable, take, tap } from "rxjs";
import { Project } from "../../classes/interfaces";
import { DeviceService } from "../../services/device.service";
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router'
import { ApiService } from 'src/app/services/api.service';
import { TranslationService } from 'src/app/services/translation.service';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  @ViewChild("file") file: ElementRef | null;
  @Output() onBurgerClicked = new EventEmitter<void>();
  project$: Observable<Project>;
  username$: Observable<any>;
  roles$: Observable<string>;
  info$: Observable<any>;
  isAdmin$: Observable<boolean>;
  languages$: Observable<string[]>;
  currentLanguage$: Observable<string>;
  menuOpen: boolean;

  constructor(
    private Store: StoreService,
    private modalService: ModalService,
    private AuthService: AuthService,
    private Router: Router,
    private Api: ApiService,
    private Translation: TranslationService
  ) {
    this.file = null;
    this.project$ = this.Store.getProject();
    this.username$ = this.AuthService.getUserName();
    this.roles$ = this.AuthService.getRoles().pipe(map(roles => roles.join(", ")));
    this.info$ = this.Api.getInfo();
    this.isAdmin$ = this.AuthService.getRoles().pipe(map(roles => roles.includes("administrator")))
    this.languages$ = this.Api.getTranslations().pipe(map(translations => translations.map(translation => translation.lang)));
    this.currentLanguage$ = this.Translation.getCurrentLanguage();
    this.menuOpen = false;
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

  burgerMenuClicked() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  changeLanguage(language: string) {
    this.menuOpen = false;
    this.Translation.changeLanguage(language);
  }

}
