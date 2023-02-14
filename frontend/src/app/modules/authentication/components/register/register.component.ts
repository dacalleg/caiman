import { Component } from '@angular/core';
import { combineLatest, of, switchMap, throwError } from 'rxjs';
import { User } from 'src/app/classes/interfaces';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {

  error: string | null = null;
  user: User;
  repeatPassword: string = "";
  finish: boolean = false;

  constructor(private AuthService: AuthService) {
    this.user = {
      email: "",
      password: "",
      company: "",
      name: "",
      surname: "",
    };
  }

  signUp() {
    combineLatest([of(this.user), of(this.repeatPassword)]).pipe(
      switchMap(([user, reapeatPassword]) => {
        const validation = this.checkPassword(user.password!, reapeatPassword);
        if (validation === "ok")
          return this.AuthService.register(user);
        this.error = validation;
        return throwError(() => new Error("Invalid password"));
      }
      )).subscribe({
        error: (error) => {
          this.error = error.error.error_code;
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
      return "password_short";
    }
    if(password !== reapeatPassword)
    {
      return "password_not_match";
    }
    return "ok";
  }
}
