import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WarningComponent } from "./components/warning/warning.component";
import { UseTokenComponent } from './components/use-token/use-token.component';

const routes: Routes = [
  {
    path: "",
    component: WarningComponent
  },
  {
    path: "usetoken",
    component: UseTokenComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LicenseRoutingModule { }
