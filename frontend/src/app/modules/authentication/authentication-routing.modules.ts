import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IsNotAuthenticatedGuard } from 'src/app/guards/isnotauthenticated.guard';
import { ConfirmComponent } from './components/confirm/confirm.component';
import { LoginComponent } from './components/login/login.component';
import { RecoverComponent } from './components/recover/recover.component';
import { RegisterComponent } from './components/register/register.component';
import { ResetComponent } from './components/reset/reset.component';

const routes: Routes = [
    { path: 'login', component: LoginComponent, canActivate: [IsNotAuthenticatedGuard] },
    { path: 'forgot', component: ResetComponent, canActivate: [IsNotAuthenticatedGuard] },
    { path: 'recover', component: RecoverComponent, canActivate: [IsNotAuthenticatedGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [IsNotAuthenticatedGuard] },
    { path: 'confirm', component: ConfirmComponent, canActivate: [IsNotAuthenticatedGuard] }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AuthenticationRoutingModule { }
