import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './components/home/home.component';
import { VariableTeaseComponent } from './components/variable-tease/variable-tease.component';
import { OptionModalComponent } from './components/option-modal/option-modal.component';
import { InsideViewportDirective } from 'src/app/directives/InsideViewportDirective';
import { SerialModalComponent } from './components/serial-modal/serial-modal.component';
import { VariableEditComponent } from './components/variable-edit/variable-edit.component';
import { OptimizationComponent } from './components/optimization/optimization.component';
import { ExportToModbusNavelPipe } from './pipes/export-to-modbus-navel.pipe';
import { VariableValueFormatterPipe } from './pipes/variable-value-formatter.pipe';
import { ByteorderPipe } from './pipes/byteorder.pipe';
import { TypePipe } from './pipes/type.pipe';
import { NumberFormatPipe } from './pipes/number-format.pipe';
import { AddressPipe } from './pipes/address.pipe';
import { VarByGroupPipe } from './pipes/var-by-group.pipe';
import { HomeRoutingModule } from './home-routing.modules';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {BootstrapIconsModule} from "ng-bootstrap-icons";
import {Eye, EyeSlash, Search, InfoCircle, Pen, PersonCircle, Wifi, List, QuestionCircle, QrCode} from 'ng-bootstrap-icons/icons';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { DeviceSelectComponent } from './components/device-select/device-select.component';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { SharedModule } from '../shared/shared.module';
import { OverrideGroupNamePipe } from './pipes/override-group-name.pipe';
import { AttachmentUrlPipe } from './pipes/attachment-url.pipe';
import { RoleInCurrentUserPipe } from './pipes/role-in-current-user.pipe';
import { DeviceInfoComponent } from './components/device-info/device-info.component';
import { WithRolePipe } from './pipes/with-role.pipe';
import { WifiTeaseComponent } from './components/wifi-tease/wifi-tease.component';
import { TicketsComponent } from './components/tickets/tickets.component';
import { TranslateModule } from '@ngx-translate/core';
import { AdvancedComponent } from './components/advanced/advanced.component';
import { LogsComponent } from './components/logs/logs.component';
import { GroupLogPipe } from './pipes/group-log.pipe';
import { VariableFromHashPipe } from './pipes/variable-from-hash.pipe';
import { FilterLogPipe } from './pipes/filter-log.pipe';
import { RegistryComponent } from './components/registry/registry.component';
import { OperationComponent } from './components/operation/operation.component';
import { OperationFormComponent } from './components/operation-form/operation-form.component';
import { ProfileComponent } from '../profile/components/profile/profile.component';
import { OperationTitlePipe } from './pipes/operation-title.pipe';
import { UnescapePipe } from './pipes/unescape.pipe';
import {SortGroupPipe} from "./pipes/sort-group.pipe";

const icons = {
  Eye,
  EyeSlash,
  Search,
  InfoCircle,
  Pen,
  PersonCircle,
  Wifi,
  List,
  QuestionCircle,
  QrCode
};

@NgModule({
  declarations: [
    VarByGroupPipe,
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
    OptimizationComponent,
    DeviceSelectComponent,
    OverrideGroupNamePipe,
    AttachmentUrlPipe,
    RoleInCurrentUserPipe,
    DeviceInfoComponent,
    WithRolePipe,
    WifiTeaseComponent,
    TicketsComponent,
    AdvancedComponent,
    LogsComponent,
    GroupLogPipe,
    VariableFromHashPipe,
    FilterLogPipe,
    RegistryComponent,
    OperationComponent,
    OperationFormComponent,
    ProfileComponent,
    OperationTitlePipe,
    UnescapePipe,
    SortGroupPipe
  ],
  imports: [
    CommonModule,
    SharedModule,
    HomeRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    YouTubePlayerModule,
    BootstrapIconsModule.pick(icons),
    TranslateModule.forChild()
  ]
})
export class HomeModule { }
