import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './components/login/login.component';
import { FormsModule } from '@angular/forms';
import { AuthenticationRoutingModule } from './authentication-routing.modules';
import { TranslateModule } from '@ngx-translate/core';
import { ResetComponent } from './components/reset/reset.component';
import { RecoverComponent } from './components/recover/recover.component';
import { RegisterComponent } from './components/register/register.component';
import { ConfirmComponent } from './components/confirm/confirm.component';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    LoginComponent,
    ResetComponent,
    RecoverComponent,
    RegisterComponent,
    ConfirmComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AuthenticationRoutingModule,
    TranslateModule.forChild(),
    SharedModule
  ]
})
export class AuthenticationModule { }
