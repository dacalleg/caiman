import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeviceSelectComponent } from './components/device-select/device-select.component';
import { HomeComponent } from './components/home/home.component';
import { VariablesComponent } from './components/variables/variables.component';
import { IndexComponent } from './components/index/index.component';

const routes: Routes = [
   { path: 'variables', component: VariablesComponent },
   { path: 'device-select', component: DeviceSelectComponent },
   { path: 'home', component: HomeComponent },
   { path: '', component: IndexComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DocsRoutingModule { }
