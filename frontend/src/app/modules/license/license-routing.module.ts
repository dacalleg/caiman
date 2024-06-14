import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {WarningComponent} from "./components/warning/warning.component";

const routes: Routes = [
  {
    path: "",
    component: WarningComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LicenseRoutingModule { }
