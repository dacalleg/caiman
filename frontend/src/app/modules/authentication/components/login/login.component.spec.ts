import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { LoginResponse } from 'src/app/classes/interfaces';
import { AuthService } from 'src/app/services/auth.service';
import { ApiService } from 'src/app/services/api.service';
import { LoginComponent } from './login.component';

const successfulLoginResponse: LoginResponse = {
  success: true,
  statusCode: 200,
  code: 'ok',
  message: 'OK',
  data: {
    token: 'token',
    id: 1,
    email: 'user@example.com',
    nicename: 'user',
    firstName: 'User',
    lastName: 'Example',
    displayName: 'User Example',
  },
};

/** API attesa dal piano (implementazione non ancora presente sul componente). */
type LoginVisualFeedback = LoginComponent & {
  credentialsInvalid: boolean;
  credentialsShake: boolean;
  onCredentialsFieldChange(): void;
  onCredentialsShakeEnd(): void;
};

function asLoginWithVisualFeedback(component: LoginComponent): LoginVisualFeedback {
  return component as LoginVisualFeedback;
}

class TranslateStubLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'auth.login': 'Login',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.invalid_credentials': 'Invalid credentials',
      'auth.account_expired': 'Account expired',
      'auth.account_locked': 'Account locked',
      submit: 'Submit',
    });
  }
}

function authError(code: string) {
  return throwError(() => ({ error: { code } }));
}

describe('LoginComponent visual feedback on failed login', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginVisualFeedback;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  function emailInput(): HTMLInputElement {
    return fixture.debugElement.query(By.css('#email')).nativeElement as HTMLInputElement;
  }

  function passwordInput(): HTMLInputElement {
    return fixture.debugElement.query(By.css('#password')).nativeElement as HTMLInputElement;
  }

  function invalidCredentialsMessage(): HTMLElement | null {
    fixture.detectChanges();
    const nodes = fixture.debugElement.queryAll(By.css('.mb-3 div'));
    return (
      nodes
        .map(node => node.nativeElement as HTMLElement)
        .find(el => el.textContent?.trim() === 'Invalid credentials') ?? null
    );
  }

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [
        FormsModule,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateStubLoader },
        }),
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ApiService,
          useValue: {
            getInfo: () => of({ logo: 'assets/logo.png' }),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = asLoginWithVisualFeedback(fixture.componentInstance);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component.email = 'user@example.com';
    component.password = 'secret';
    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');
    fixture.detectChanges();
  });

  describe('before the first submit', () => {
    it('does not mark credential fields invalid or shaking', () => {
      expect(component.credentialsInvalid).toBe(false);
      expect(component.credentialsShake).toBe(false);
      expect(emailInput().classList.contains('is-invalid')).toBe(false);
      expect(emailInput().classList.contains('login-input-shake')).toBe(false);
      expect(passwordInput().classList.contains('is-invalid')).toBe(false);
      expect(passwordInput().classList.contains('login-input-shake')).toBe(false);
    });
  });

  describe('invalid_email on submit', () => {
    beforeEach(() => {
      authService.login.and.returnValue(authError('invalid_email'));
    });

    it('sets error code and enables invalid and shake state', fakeAsync(() => {
      component.login();
      tick();

      expect(component.error).toBe('invalid_email');
      expect(component.credentialsInvalid).toBe(true);
      expect(component.credentialsShake).toBe(true);
      expect(invalidCredentialsMessage()).not.toBeNull();
      fixture.detectChanges();
      expect(emailInput().classList.contains('is-invalid')).toBe(true);
      expect(passwordInput().classList.contains('is-invalid')).toBe(true);
      expect(emailInput().classList.contains('login-input-shake')).toBe(true);
      expect(passwordInput().classList.contains('login-input-shake')).toBe(true);
    }));
  });

  describe('incorrect_password on submit', () => {
    beforeEach(() => {
      authService.login.and.returnValue(authError('incorrect_password'));
    });

    it('sets error code and enables invalid and shake state', fakeAsync(() => {
      component.login();
      tick();

      expect(component.error).toBe('incorrect_password');
      expect(component.credentialsInvalid).toBe(true);
      expect(component.credentialsShake).toBe(true);
      expect(invalidCredentialsMessage()).not.toBeNull();
    }));
  });

  describe('account_expired on submit', () => {
    beforeEach(() => {
      authService.login.and.returnValue(authError('account_expired'));
    });

    it('sets error without invalid or shake styling', fakeAsync(() => {
      component.login();
      tick();

      expect(component.error).toBe('account_expired');
      expect(component.credentialsInvalid).toBe(false);
      expect(component.credentialsShake).toBe(false);
      fixture.detectChanges();
      expect(emailInput().classList.contains('is-invalid')).toBe(false);
      expect(passwordInput().classList.contains('login-input-shake')).toBe(false);
    }));
  });

  describe('account_locked on submit', () => {
    beforeEach(() => {
      authService.login.and.returnValue(authError('account_locked'));
    });

    it('sets error without invalid or shake styling', fakeAsync(() => {
      component.login();
      tick();

      expect(component.error).toBe('account_locked');
      expect(component.credentialsInvalid).toBe(false);
      expect(component.credentialsShake).toBe(false);
    }));
  });

  describe('after invalid credentials feedback', () => {
    beforeEach(fakeAsync(() => {
      authService.login.and.returnValue(authError('invalid_email'));
      component.login();
      tick();
      fixture.detectChanges();
    }));

    it('clears visual state and error when the user edits a credential field', () => {
      component.email = 'other@example.com';
      component.onCredentialsFieldChange();
      fixture.detectChanges();

      expect(component.credentialsInvalid).toBe(false);
      expect(component.credentialsShake).toBe(false);
      expect(component.error).toBeNull();
      expect(emailInput().classList.contains('is-invalid')).toBe(false);
      expect(passwordInput().classList.contains('login-input-shake')).toBe(false);
    });

    it('re-enables shake on a second failed credentials submit', fakeAsync(() => {
      component.onCredentialsShakeEnd();
      expect(component.credentialsShake).toBe(false);

      authService.login.and.returnValue(authError('incorrect_password'));
      component.login();
      tick();

      expect(component.credentialsInvalid).toBe(true);
      expect(component.credentialsShake).toBe(true);
    }));
  });

  describe('after account_locked or account_expired', () => {
    it('keeps error when the user edits a field after account_locked', fakeAsync(() => {
      authService.login.and.returnValue(authError('account_locked'));
      component.login();
      tick();

      component.password = 'new-password';
      component.onCredentialsFieldChange();
      fixture.detectChanges();

      expect(component.error).toBe('account_locked');
      expect(component.credentialsInvalid).toBe(false);
      expect(component.credentialsShake).toBe(false);
    }));

    it('keeps error when the user edits a field after account_expired', fakeAsync(() => {
      authService.login.and.returnValue(authError('account_expired'));
      component.login();
      tick();

      component.email = 'other@example.com';
      component.onCredentialsFieldChange();
      fixture.detectChanges();

      expect(component.error).toBe('account_expired');
      expect(component.credentialsInvalid).toBe(false);
      expect(component.credentialsShake).toBe(false);
    }));
  });

  describe('onCredentialsShakeEnd', () => {
    beforeEach(fakeAsync(() => {
      authService.login.and.returnValue(authError('invalid_email'));
      component.login();
      tick();
    }));

    it('stops shake but keeps fields marked invalid', () => {
      expect(component.credentialsShake).toBe(true);
      expect(component.credentialsInvalid).toBe(true);

      component.onCredentialsShakeEnd();
      fixture.detectChanges();

      expect(component.credentialsShake).toBe(false);
      expect(component.credentialsInvalid).toBe(true);
      expect(emailInput().classList.contains('is-invalid')).toBe(true);
      expect(emailInput().classList.contains('login-input-shake')).toBe(false);
    });
  });

  describe('successful login', () => {
    it('navigates home and clears credential visual feedback', fakeAsync(() => {
      authService.login.and.returnValue(of(successfulLoginResponse));

      component.login();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(component.credentialsInvalid).toBe(false);
      expect(component.credentialsShake).toBe(false);
    }));
  });
});
