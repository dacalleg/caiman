import { Component } from '@angular/core';
import {AuthService} from "../../../../services/auth.service";
import {Observable} from "rxjs";
import {UserData} from "../../../../classes/interfaces";

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss']
})
export class WarningComponent {
  flatLicenseExpired$: Observable<boolean>;
  userData$: Observable<UserData>;
  expired$: Observable<boolean>;

  constructor(private Auth: AuthService) {
    this.flatLicenseExpired$ = this.Auth.getFlatLicenseExpired();
    this.expired$ = this.Auth.getLicenseExpired();

    this.userData$ = this.Auth.getUserData();
  }

}
