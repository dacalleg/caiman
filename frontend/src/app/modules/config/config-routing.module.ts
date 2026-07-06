import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListComponent } from './components/list/list.component';
import { EditComponent } from './components/edit/edit.component';

const routes: Routes = [
  {
    path: "", redirectTo: "/config/list", pathMatch: 'full'
  },
  { path: "list", component: ListComponent },
  { path: "edit/:id", component: EditComponent },
  { path: "edit", component: EditComponent }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigRoutingModule { }
