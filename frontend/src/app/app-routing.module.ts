import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import {IsAuthenticatedGuard} from "./guards/isauthenticated.guard";
import {IsAdminGuard} from "./guards/isadmin.guard";
import {LicenseGuard} from "./guards/license.guard";

const routes: Routes = [
  {
    path: 'dashboard', component: DashboardComponent, canActivate: [IsAuthenticatedGuard], children: [
      { path: 'home', loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule), canActivate: [LicenseGuard] },
      { path: 'profile', loadChildren: () => import('./modules/profile/profile.module').then(m => m.ProfileModule) },
      { path: 'license', loadChildren: () => import('./modules/license/license.module').then(m => m.LicenseModule) }
    ]
  },
  { path: '', redirectTo: '/dashboard/home', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('./modules/authentication/authentication.module').then(m => m.AuthenticationModule) },
  { path: 'docs', loadChildren: () => import('./modules/docs/docs.module').then(m => m.DocsModule) },
  { path: 'config', canActivate: [IsAuthenticatedGuard, IsAdminGuard], loadChildren: () => import('./modules/config/config.module').then(m => m.ConfigModule) },
  { path: 'print', loadChildren: () => import('./modules/print/print.module').then(m => m.PrintModule) },
  { path: 'confirm', loadChildren: () => import('./modules/confirm/confirm.module').then(m => m.ConfirmModule) },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
