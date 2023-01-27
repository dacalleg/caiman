import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { filter, map, Observable, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginResponse } from '../classes/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private Http: HttpClient, private jwtHelper: JwtHelperService) { }

  login(username: string, password: string) {
    return this.Http.post<LoginResponse>(environment.endpoint + '/wp-json/jwt-auth/v1/token', { username, password }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.data.token);
      })
    )
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

  isValidToken() {
    return of(!this.jwtHelper.isTokenExpired(localStorage.getItem('access_token')));
  }

  getRoles(): Observable<string[]>
  {
    return this.getDecodedToken().pipe(map(token => token.data.user.roles));
  }
}
