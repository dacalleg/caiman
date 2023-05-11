import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocsRoutingModule } from './docs-routing.modules';
import { DeviceSelectComponent } from './components/device-select/device-select.component';
import { HomeComponent } from './components/home/home.component';
import { VariablesComponent } from './components/variables/variables.component';
import { IndexComponent } from './components/index/index.component';



@NgModule({
  declarations: [
    DeviceSelectComponent,
    HomeComponent,
    VariablesComponent,
    IndexComponent
  ],
  imports: [
    CommonModule,
    DocsRoutingModule
  ]
})
export class DocsModule { }
