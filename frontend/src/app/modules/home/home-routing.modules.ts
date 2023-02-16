import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IsAuthenticatedGuard } from 'src/app/guards/isauthenticated.guard';
import { DeviceSelectComponent } from './components/device-select/device-select.component';
import { HomeComponent } from './components/home/home.component';

const routes: Routes = [
    { path: '', component: DeviceSelectComponent, canActivate: [IsAuthenticatedGuard] },
    { path: ':mac', component: HomeComponent, canActivate: [IsAuthenticatedGuard] },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HomeRoutingModule { }
