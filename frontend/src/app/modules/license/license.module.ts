import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LicenseRoutingModule } from './license-routing.module';
import { WarningComponent } from './components/warning/warning.component';
import {SharedModule} from "../shared/shared.module";
import { UseTokenComponent } from './components/use-token/use-token.component';


@NgModule({
  declarations: [
    WarningComponent,
    UseTokenComponent
  ],
  imports: [
    CommonModule,
    LicenseRoutingModule,
    SharedModule,
  ]
})
export class LicenseModule { }
