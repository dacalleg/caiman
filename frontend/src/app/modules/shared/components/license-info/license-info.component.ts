import {Component} from '@angular/core';
import {AuthService} from "../../../../services/auth.service";
import {combineLatest, map, Observable} from "rxjs";
import {UserData} from "../../../../classes/interfaces";

@Component({
  selector: 'app-license-info',
  templateUrl: './license-info.component.html',
  styleUrls: ['./license-info.component.scss']
})
export class LicenseInfoComponent {

  userData$: Observable<UserData>;
  expired$: Observable<boolean>;
  flatLicenseExpired$: Observable<boolean>;
  tokensEnded$: Observable<boolean>;
  tokenInUse$: Observable<boolean>;

  constructor(private Auth: AuthService) {
    this.userData$ = this.Auth.getUserData();
    this.flatLicenseExpired$ = this.Auth.getFlatLicenseExpired();
    this.tokensEnded$ = this.Auth.getTokensEnded();
    this.expired$ = this.Auth.getLicenseExpired();
    this.tokenInUse$ = this.Auth.getTokenInUse();
  }
}
