import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  defer,
  distinctUntilChanged,
  filter,
  from,
  interval,
  map,
  merge,
  Observable,
  of,
  shareReplay,
  skip,
  Subject,
  switchMap,
  take,
  tap,
  throwError
} from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginResponse, User, UserData, UserField } from '../classes/interfaces';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private tokenChanges$: BehaviorSubject<string | null>;
  private tokenValidityChanges$: Observable<boolean>;
  private userData$: Observable<UserData>;
  private updateUserData$: Subject<void>;
  private flatLicenseExpired$: Observable<boolean>;
  private tokensEnded$: Observable<boolean>;
  private expired$: Observable<boolean>;
  private tokenInUse$: Observable<boolean>;

  constructor(private Http: HttpClient, private jwtHelper: JwtHelperService, private Translation: TranslationService) {
    this.tokenChanges$ = new BehaviorSubject<string | null>(localStorage.getItem('access_token'));
    this.updateUserData$ = new Subject();
    this.tokenValidityChanges$ = interval(5000).pipe(
      switchMap(() => this.tokenChanges$.pipe(take(1))),
      map(token => token !== null && !this.jwtHelper.isTokenExpired(token)),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.userData$ = this.tokenChanges$.pipe(
      switchMap(() => merge(of(void 0), this.updateUserData$)),
      switchMap(() => this.Http.get<UserData|any>(environment.endpoint + "/wp-json/caiman/v1/me")),
      filter((ret) => ret.success !== false),
      shareReplay(1)
    );

    this.flatLicenseExpired$ = this.userData$.pipe(map(data => {
      if (data.fields.flat_license_expiration && data.fields.flat_license_expiration !== "") {
        const exp = new Date(data.fields.flat_license_expiration);
        const now = new Date();
        if (now.getTime() > exp.getTime())
          return true;
      }
      return false;
    }));

    this.tokensEnded$ = this.userData$.pipe(map(data => {
      if (!data.fields.tokens || data.fields.tokens == "")
        return true;
      return !data.fields.tokens || +data.fields.tokens == 0;
    }));

    this.tokenInUse$ = this.userData$.pipe(map(data => {
      if (!data.fields.last_token_usage)
        return false;
      const usage = new Date(data.fields.last_token_usage);
      const now = new Date();
      return now.getTime() < (usage.getTime() + 3600 * 24 * 1000)
    }));

    this.expired$ = combineLatest([this.tokenInUse$, this.flatLicenseExpired$, this.tokensEnded$]).pipe(
      map(([tokenInUse, flatExpired, tokensEnded]) => !tokenInUse && flatExpired && tokensEnded)
    )


    this.Translation.getCurrentLanguage().pipe(
      skip(2),
      switchMap((lang) => this.updateUserLanguage(lang)),
    ).subscribe();

    this.getUserData().pipe(take(1)).subscribe((userData) => {
      this.Translation.changeLanguage(userData.fields.language);
    });
  }

  login(username: string, password: string) {
    return this.Http.post<LoginResponse>(environment.endpoint + '/wp-json/jwt-auth/v1/token', { username, password }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.data.token);
        this.tokenChanges$.next(response.data.token);
      })
    )
  }

  requestResetPassword(username: string) {
    return this.Http.post<any>(environment.endpoint + '/wp-json/caiman/v1/forgot-password', { user: username });
  }

  resetPassword(username: string, key: string, password: string) {
    return this.Http.post<any>(environment.endpoint + '/wp-json/caiman/v1/reset-password', { user: username, key: key, password: password });
  }

  register(user: User) {
    return this.Http.post<any>(environment.endpoint + '/wp-json/caiman/v1/register', user);
  }

  confirmEmail(email: string, code: string) {
    return this.Http.post<any>(environment.endpoint + '/wp-json/caiman/v1/confirm', { email: email, reg_code: code });
  }


  updateUserLanguage(lang: string) {
    return this.getToken().pipe(
      switchMap(() => this.Http.post<any>(environment.endpoint + '/wp-json/caiman/v1/update-language', { language: lang }))
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
    return of(this.jwtHelper.tokenGetter() as string | null).pipe(
      switchMap(token => {
        if (!token || this.jwtHelper.isTokenExpired(token))
          return throwError(() => new Error("Token Invalid or Expired"))
        return of(token)
      }),
      switchMap(() => this.userData$),
      map(() => true),
      catchError(() => of(false))
    )
  }

  getRoles(): Observable<string[]> {
    return this.getDecodedToken().pipe(map(token => token.data.user.roles));
  }

  logout() {
    return defer(() => {
      localStorage.removeItem('access_token');
      this.tokenChanges$.next(null);
      return of(void 0);
    })
  }

  getUserData(): Observable<UserData> {
    return this.userData$;
  }

  updateUserData(user: User): Observable<User> {
    return this.Http.post<any>(environment.endpoint + '/wp-json/caiman/v1/update-user', user).pipe(tap(() => this.updateUserData$.next()))
  }

  refreshUserData() {
    this.updateUserData$.next();
  }

  getFlatLicenseExpired() {
    return this.flatLicenseExpired$;
  }

  getTokensEnded() {
    return this.tokensEnded$;
  }

  getLicenseExpired() {
    return this.expired$;
  }


  getTokenInUse()
  {
    return this.tokenInUse$;
  }
}
