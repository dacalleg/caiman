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
  email: string;
  password: string;
  rememberMe: boolean;
  error: string|null = null;
  info$: Observable<Info>;
  showDownloadBluefy: boolean;

  login() {
    this.Auth.login(this.email, this.password).subscribe({
      next: (response) => {
        this.Router.navigate(['/']);
      },
      error: (error) => {
        this.error = error.error.code;
      }
    });
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
