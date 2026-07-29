import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree} from '@angular/router';
import {map, Observable} from 'rxjs';
import {AuthService} from 'src/app/services/auth.service';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LicenseGuard {

  constructor(private Auth: AuthService, private Router: Router) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.Auth.getLicenseExpired().pipe(map(value => {
      if (value)
        return this.Router.createUrlTree(["/dashboard/license"]);
      return true;
    }))
  }
}
