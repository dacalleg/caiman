import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, of, switchMap, take, throwError } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-recover',
  templateUrl: './recover.component.html',
  styleUrls: ['./recover.component.scss']
})
export class RecoverComponent {
  password: string;
  reapeatPassword: string;
  errorCode: number;
  finish: boolean = false;
  key: string|null;
  username: string|null;

  constructor(private ActivatedRoute: ActivatedRoute, private AuthService: AuthService) {
    this.password = "";
    this.reapeatPassword = "";
    this.errorCode = -1;
    this.key = null;
    this.username = null;
  }

  recover()
  {
    combineLatest([of(this.password), of(this.reapeatPassword), this.ActivatedRoute.queryParams.pipe(take(1))]).pipe(
      switchMap(([password, reapeatPassword, params]) => {
        const validation = this.checkPassword(password, reapeatPassword);
        if(validation === 0)
          return this.AuthService.resetPassword(params["user"], params["key"], password);
        this.errorCode = validation;
        return throwError(() => new Error("Invalid password"));
      }
    )).subscribe({
      error: (error) => {
        this.errorCode = 3;
      },
      complete: () => {
        this.finish = true;
      }
    })
  }

  checkPassword(password:string, reapeatPassword:string)
  {
    if(password.length < 8)
    {
      return 1;
    }
    if(password !== reapeatPassword)
    {
      return 2;
    }
    return 0;
  }
}
