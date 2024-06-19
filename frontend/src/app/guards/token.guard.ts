import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree} from '@angular/router';
import {combineLatest, map, Observable} from 'rxjs';
import {Router} from '@angular/router';
import {AuthService} from 'src/app/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenGuard {

  constructor(private Auth: AuthService, private Router: Router) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return combineLatest([this.Auth.getFlatLicenseExpired(), this.Auth.getTokenInUse()]).pipe(map(([flatExpired, tokenInUse]) => {
      if(flatExpired && !tokenInUse)
      {
        this.Router.navigate(["/dashboard/license/usetoken"]);
        return false;
      }
      return true;
    }))
  }
}
