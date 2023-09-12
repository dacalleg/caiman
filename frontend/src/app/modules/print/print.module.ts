import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PrintRoutingModule } from './print-routing.module';
import { OperationComponent } from './component/operation/operation.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    OperationComponent
  ],
  imports: [
    CommonModule,
    PrintRoutingModule,
    SharedModule,
    TranslateModule.forChild()
  ]
})
export class PrintModule { }
