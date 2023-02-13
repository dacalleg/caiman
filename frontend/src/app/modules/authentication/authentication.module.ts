import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './components/login/login.component';
import { FormsModule } from '@angular/forms';
import { AuthenticationRoutingModule } from './authentication-routing.modules';
import { TranslateModule } from '@ngx-translate/core';
import { ResetComponent } from './components/reset/reset.component';
import { RecoverComponent } from './components/recover/recover.component';


@NgModule({
  declarations: [
    LoginComponent,
    ResetComponent,
    RecoverComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AuthenticationRoutingModule,
    TranslateModule.forChild()
  ]
})
export class AuthenticationModule { }
