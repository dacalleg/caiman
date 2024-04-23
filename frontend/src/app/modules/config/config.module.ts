import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfigRoutingModule } from './config-routing.module';
import { ListComponent } from './components/list/list.component';
import { EditComponent } from './components/edit/edit.component';
import { NgbAccordion, NgbAccordionModule, NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { VarByGroupPipe } from './pipes/var-by-group.pipe';
import { EditOptionsComponent } from './components/edit-options/edit-options.component';
import { SearchPipe } from './pipes/search.pipe';
import { EditColorsComponent } from './components/edit-colors/edit-colors.component';


@NgModule({
  declarations: [
    ListComponent,
    EditComponent,
    VarByGroupPipe,
    EditOptionsComponent,
    SearchPipe,
    EditColorsComponent
  ],
  imports: [
    CommonModule,
    ConfigRoutingModule,
    NgbModule,
    NgbAccordionModule,
    FormsModule
  ]
})
export class ConfigModule { }
