import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import {map, Observable, tap} from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class IsAdminGuard  {

  constructor(private Auth: AuthService, private Router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.Auth.getRoles().pipe(
      map(roles => roles.includes("administrator")),
      tap((response) => {
          if (!response) {
            this.Router.navigate(['/auth/login']);
          }
        }
      ));
  }

}
