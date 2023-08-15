import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';

const routes: Routes = [
  {
    path: 'dashboard', component: DashboardComponent, children: [
      { path: 'home', loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule) },
    ]
  },
  { path: '', redirectTo: '/dashboard/home', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('./modules/authentication/authentication.module').then(m => m.AuthenticationModule) },
  { path: 'docs', loadChildren: () => import('./modules/docs/docs.module').then(m => m.DocsModule) },
  { path: 'config', loadChildren: () => import('./modules/config/config.module').then(m => m.ConfigModule) },
  { path: 'print', loadChildren: () => import('./modules/print/print.module').then(m => m.PrintModule) },
  { path: 'confirm', loadChildren: () => import('./modules/confirm/confirm.module').then(m => m.ConfirmModule) }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
