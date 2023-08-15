import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfirmRoutingModule } from './confirm-routing.module';
import { ConfirmOperationComponent } from './components/confirm-operation/confirm-operation.component';


@NgModule({
  declarations: [
    ConfirmOperationComponent
  ],
  imports: [
    CommonModule,
    ConfirmRoutingModule
  ]
})
export class ConfirmModule { }
