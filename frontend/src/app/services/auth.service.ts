import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, distinctUntilChanged, filter, interval, map, Observable, of, shareReplay, Subject, switchMap, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginResponse } from '../classes/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenChanges$: BehaviorSubject<string|null>;
  private tokenValidityChanges$: Observable<boolean>;
  constructor(private Http: HttpClient, private jwtHelper: JwtHelperService) {
    this.tokenChanges$ = new BehaviorSubject<string|null>(localStorage.getItem('access_token'));
    this.tokenValidityChanges$ = interval(5000).pipe(
      switchMap(() => this.tokenChanges$.pipe(take(1))),
      map(token => token !== null && !this.jwtHelper.isTokenExpired(token)),
      distinctUntilChanged(),
      shareReplay(1)
    );
   }

  login(username: string, password: string) {
    return this.Http.post<LoginResponse>(environment.endpoint + '/wp-json/jwt-auth/v1/token', { username, password }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.data.token);
        this.tokenChanges$.next(response.data.token);
      })
    )
  }

  tokenValidityChanges(): Observable<boolean> {
    return this.tokenValidityChanges$;
  }

  getToken(): Observable<string> {
    return of(localStorage.getItem('access_token')).pipe(
      filter(token => token != null)
    ) as Observable<string>;
  }

  getDecodedToken() {
    return this.getToken().pipe(
      map(token => this.jwtHelper.decodeToken(token))
    );
  }

  getUserName() {
    return this.getDecodedToken().pipe(map(token => token.email));
  }

  isValidToken() {
    return of(!this.jwtHelper.isTokenExpired(localStorage.getItem('access_token')));
  }

  getRoles(): Observable<string[]>
  {
    return this.getDecodedToken().pipe(map(token => token.data.user.roles));
  }
}
