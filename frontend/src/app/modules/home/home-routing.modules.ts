import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeviceSelectComponent } from './components/device-select/device-select.component';
import { HomeComponent } from './components/home/home.component';

const routes: Routes = [
    { path: '', component: DeviceSelectComponent },
    { path: ':mac/:serial', component: HomeComponent },
    { path: ':mac/:serial/:productKey', component: HomeComponent },
    { path: ':mac/:serial/:productKey/:regCode', component: HomeComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HomeRoutingModule { }
