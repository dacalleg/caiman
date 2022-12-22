import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {VarByGroupPipe} from './pipes/var-by-group.pipe';
import {HeaderComponent} from './components/header/header.component';
import {FooterComponent} from './components/footer/footer.component';
import {HomeComponent} from './components/home/home.component';
import {ComponentStore} from "@ngrx/component-store";
import {VariableTeaseComponent} from "./components/variable-tease/variable-tease.component";
import {AddressPipe} from "./pipes/address.pipe";
import {BootstrapIconsModule} from "ng-bootstrap-icons";
import {Eye, EyeSlash, Search, InfoCircle, Pen} from 'ng-bootstrap-icons/icons';
import {OptionModalComponent} from './components/option-modal/option-modal.component';
import {FormsModule} from "@angular/forms";
import {NumberFormatPipe} from "./pipes/number-format.pipe";
import {TypePipe} from './pipes/type.pipe';
import {ByteorderPipe} from './pipes/byteorder.pipe';
import {VariableValueFormatterPipe} from './pipes/variable-value-formatter.pipe';
import {InsideViewportDirective} from "./directives/InsideViewportDirective";
import { SerialModalComponent } from './components/serial-modal/serial-modal.component';
import { VariableEditComponent } from './components/variable-edit/variable-edit.component';
import { ExportToModbusNavelPipe } from './pipes/export-to-modbus-navel.pipe';
import { OptimizationComponent } from './components/optimization/optimization.component';
import { HttpClientModule } from '@angular/common/http';

const icons = {
  Eye,
  EyeSlash,
  Search,
  InfoCircle,
  Pen
};


@NgModule({
  declarations: [
    AppComponent,
    VarByGroupPipe,
    HeaderComponent,
    FooterComponent,
    HomeComponent,
    VariableTeaseComponent,
    AddressPipe,
    OptionModalComponent,
    NumberFormatPipe,
    TypePipe,
    ByteorderPipe,
    VariableValueFormatterPipe,
    InsideViewportDirective,
    SerialModalComponent,
    VariableEditComponent,
    ExportToModbusNavelPipe,
    OptimizationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    FormsModule,
    HttpClientModule,
    BootstrapIconsModule.pick(icons)
  ],
  providers: [ComponentStore],
  bootstrap: [AppComponent]
})
export class AppModule {
}
