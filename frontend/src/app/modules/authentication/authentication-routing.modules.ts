import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IsNotAuthenticatedGuard } from 'src/app/guards/isnotauthenticated.guard';
import { LoginComponent } from './components/login/login.component';
import { RecoverComponent } from './components/recover/recover.component';
import { ResetComponent } from './components/reset/reset.component';

const routes: Routes = [
    { path: 'login', component: LoginComponent, canActivate: [IsNotAuthenticatedGuard] },
    { path: 'forgot', component: ResetComponent, canActivate: [IsNotAuthenticatedGuard] },
    { path: 'recover', component: RecoverComponent, canActivate: [IsNotAuthenticatedGuard] }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AuthenticationRoutingModule { }
