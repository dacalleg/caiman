import { Component, ViewChild } from '@angular/core';
import { NgForm, NgModel } from '@angular/forms';
import { Observable, combineLatest, of, switchMap, tap, throwError } from 'rxjs';
import { Country, User } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { BuilderService } from 'src/app/services/builder.service';

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
  validation: boolean = false;
  submitted: boolean;
  @ViewChild("myForm") myForm: NgForm | undefined;
  @ViewChild('pwConfirmModel') pwConfirmModel: NgModel|undefined;
  @ViewChild('emailModel') emailModel: NgModel|undefined;

  countries$: Observable<Country[]>;

  constructor(private AuthService: AuthService, private Builder: BuilderService, private Api: ApiService) {
    this.user = this.Builder.buildUser();
    this.submitted = false;
    this.countries$ = this.Api.getCountries();

  }

  onSubmit() {
    this.submitted = true;
    if(this.pwConfirmModel)
    {
      if(this.checkPassword(this.user.password!, this.repeatPassword) !== "ok")
      {
        this.pwConfirmModel.control.setErrors({'nomatch': true});
      }
    }
    if (this.myForm?.form.valid) {
      console.log("Form Valid");
    }
  }

  signUp() {
    this.validation = true;
    combineLatest([of(this.user), of(this.repeatPassword)]).pipe(
      switchMap(([user, reapeatPassword]) => {
        const validation = this.checkPassword(user.password!, reapeatPassword);
        if (validation === "ok")
          return this.AuthService.register(user);
        this.error = validation;
        return throwError(() => new Error("Invalid password"));
      }),
    ).subscribe({
      error: (error) => {
        this.validation = false;
      },
      complete: () => {
        this.validation = false;
        this.finish = true;
      }
    })
  }

  checkPassword(password: string, reapeatPassword: string) {
    if (password.length < 8) {
      return "password_short";
    }
    if (password !== reapeatPassword) {
      return "password_not_match";
    }
    return "ok";
  }
}
