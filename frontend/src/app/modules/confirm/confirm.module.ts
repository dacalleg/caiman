import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfirmRoutingModule } from './confirm-routing.module';
import { ConfirmOperationComponent } from './components/confirm-operation/confirm-operation.component';
import { SharedModule } from '../shared/shared.module';
import { TranslateModule } from '@ngx-translate/core';


@NgModule({
  declarations: [
    ConfirmOperationComponent
  ],
  imports: [
    CommonModule,
    ConfirmRoutingModule,
    SharedModule,
    TranslateModule.forChild()
  ]
})
export class ConfirmModule { }
