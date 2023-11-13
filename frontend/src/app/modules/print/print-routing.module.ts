import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationComponent } from './component/operation/operation.component';

const routes: Routes = [
  {path: 'operation/:key', component: OperationComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrintRoutingModule { }
