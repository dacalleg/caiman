import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LicenseRoutingModule } from './license-routing.module';
import { WarningComponent } from './components/warning/warning.component';
import {SharedModule} from "../shared/shared.module";


@NgModule({
  declarations: [
    WarningComponent
  ],
  imports: [
    CommonModule,
    LicenseRoutingModule,
    SharedModule
  ]
})
export class LicenseModule { }
