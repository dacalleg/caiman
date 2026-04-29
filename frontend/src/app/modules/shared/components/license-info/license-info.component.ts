import { Component } from '@angular/core';
import { AuthService } from "../../../../services/auth.service";
import { combineLatest, concat, interval, map, Observable, of, switchMap, tap } from "rxjs";
import { UserData } from "../../../../classes/interfaces";

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
  tokenExp$: Observable<string>;

  constructor(private Auth: AuthService) {
    this.userData$ = this.Auth.getUserData();
    this.flatLicenseExpired$ = this.Auth.getFlatLicenseExpired();
    this.tokensEnded$ = this.Auth.getTokensEnded();
    this.expired$ = this.Auth.getLicenseExpired();
    this.tokenInUse$ = this.Auth.getTokenInUse();

    this.tokenExp$ = concat(of(0), interval(1000 * 60)).pipe(
      map(() => new Date()),
      switchMap((now) => this.userData$.pipe(map(data => {
        const exp = data.fields.last_token_usage;
        if (exp) {
          const diff = (((new Date(exp)).getTime() + 3600*24*1000)  - now.getTime());
          const hours = Math.floor(diff/1000/3600);
          const min = Math.floor((diff - hours * 3600 * 1000)/60/1000);
          return hours + "h " + min + "m";
        }
        return "";
      }))),
    )
  }
}
