import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { Country, Project, User } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { BuilderService } from 'src/app/services/builder.service';
import { StoreService } from 'src/app/services/store.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  @ViewChild("myForm") myForm: NgForm | undefined;
  project$: Observable<Project>;
  countries$: Observable<Country[]>;
  data: User;
  submitted: boolean;

  constructor(
    private Store: StoreService,
    private Api: ApiService,
    private Builder: BuilderService,
    private Auth: AuthService
  ) {
    this.submitted = false;
    this.data = this.Builder.buildUser();
    this.project$ = this.Store.getProject();
    this.countries$ = this.Api.getCountries();
    this.Auth.getUserName().subscribe(user => this.data.email = user);
  }

  onSubmit() {
    this.submitted = true;
    if (this.myForm?.form.valid) {
    }
  }
}
