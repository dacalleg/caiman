import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PrintRoutingModule } from './print-routing.module';
import { OperationComponent } from './component/operation/operation.component';


@NgModule({
  declarations: [
    OperationComponent
  ],
  imports: [
    CommonModule,
    PrintRoutingModule
  ]
})
export class PrintModule { }
