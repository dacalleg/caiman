import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfirmOperationComponent } from './components/confirm-operation/confirm-operation.component';

const routes: Routes = [
  {path: 'operation/:key', component: ConfirmOperationComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfirmRoutingModule { }
