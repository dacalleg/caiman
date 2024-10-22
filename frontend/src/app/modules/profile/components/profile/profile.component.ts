import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Observable, combineLatest, take } from 'rxjs';
import { Country, Project, User } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { BuilderService } from 'src/app/services/builder.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  @ViewChild("myForm") myForm: NgForm | undefined;
  countries$: Observable<Country[]>;
  data: User;

  constructor(
    private Api: ApiService,
    private Builder: BuilderService,
    private Auth: AuthService,
    private Toast: ToastService
  ) {
    this.data = this.Builder.buildUser();
    this.countries$ = this.Api.getCountries();
    combineLatest(
      [
        this.Auth.getUserData(),
        this.Auth.getUserName()
      ]
    ).pipe(take(1)).subscribe(([ud, username]) => {
      this.data = ud.fields;
      this.data.email = username;
    })
  }

  onSubmit() {
    if (this.myForm?.form.valid) {
      this.Auth.updateUserData(this.data).subscribe(() => this.Toast.addSuccessToast("profile.update.success"));
    }
  }
}
