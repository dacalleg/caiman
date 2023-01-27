import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';

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

  login() {
    this.Auth.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log(response);
      },
      error: (error) => {
        this.error = error.error.code;
      }
    });
  }

  constructor(private Auth: AuthService, private Router: Router) {
    this.email = '';
    this.password = '';
    this.rememberMe = false;
  }

  ngOnInit(): void {
  }



}
