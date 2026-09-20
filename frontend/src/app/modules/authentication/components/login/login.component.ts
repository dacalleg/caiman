import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { Observable } from 'rxjs';
import { Info } from 'src/app/classes/interfaces';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private static readonly INVALID_CREDENTIAL_CODES = ['invalid_email', 'incorrect_password'] as const;

  email: string;
  password: string;
  rememberMe: boolean;
  error: string|null = null;
  credentialsInvalid = false;
  credentialsShake = false;
  info$: Observable<Info>;
  showDownloadBluefy: boolean;

  login() {
    this.Auth.login(this.email, this.password).subscribe({
      next: () => {
        this.credentialsInvalid = false;
        this.credentialsShake = false;
        this.Router.navigate(['/']);
      },
      error: (error) => {
        const code = error.error.code as string;
        this.error = code;

        if (this.isInvalidCredentialCode(code)) {
          this.credentialsInvalid = true;
          this.triggerCredentialsShake();
          return;
        }

        if (code === 'account_expired' || code === 'account_locked') {
          this.credentialsInvalid = false;
          this.credentialsShake = false;
        }
      }
    });
  }

  onCredentialsFieldChange(): void {
    this.credentialsInvalid = false;
    this.credentialsShake = false;
    if (this.error !== null && this.isInvalidCredentialCode(this.error)) {
      this.error = null;
    }
  }

  onCredentialsShakeEnd(): void {
    this.credentialsShake = false;
  }

  private isInvalidCredentialCode(code: string): boolean {
    return (LoginComponent.INVALID_CREDENTIAL_CODES as readonly string[]).includes(code);
  }

  private triggerCredentialsShake(): void {
    if (this.credentialsShake) {
      this.credentialsShake = false;
      queueMicrotask(() => {
        this.credentialsShake = true;
      });
      return;
    }
    this.credentialsShake = true;
  }

  constructor(private Auth: AuthService, private Router: Router, private Api: ApiService) {
    this.email = '';
    this.password = '';
    this.rememberMe = false;
    this.info$ = this.Api.getInfo();
    this.showDownloadBluefy = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
    
    if(navigator.userAgent.includes("Bluefy"))
      this.showDownloadBluefy = false
  }

  ngOnInit(): void {
  }



}
