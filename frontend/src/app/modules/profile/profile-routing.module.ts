import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './components/profile/profile.component';
import { IsAuthenticatedGuard } from 'src/app/guards/isauthenticated.guard';

const routes: Routes = [
  { path: '', component: ProfileComponent, canActivate: [IsAuthenticatedGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
