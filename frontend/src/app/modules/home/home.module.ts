import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
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
import { FormsModule } from '@angular/forms';
import {BootstrapIconsModule} from "ng-bootstrap-icons";
import {Eye, EyeSlash, Search, InfoCircle, Pen} from 'ng-bootstrap-icons/icons';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { DeviceSelectComponent } from './components/device-select/device-select.component';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { TimelineComponent } from './components/timeline/timeline.component';
import { SharedModule } from '../shared/shared.module';
import { OverrideVariableNamePipe } from './pipes/override-variable-name.pipe';
import { OverrideGroupNamePipe } from './pipes/override-group-name.pipe';
import { OverrideVariableDescriptionPipe } from './pipes/override-variable-description.pipe';
import { AttachmentUrlPipe } from './pipes/attachment-url.pipe';
import { RoleInCurrentUserPipe } from './pipes/role-in-current-user.pipe';

const icons = {
  Eye,
  EyeSlash,
  Search,
  InfoCircle,
  Pen
};

@NgModule({
  declarations: [
    VarByGroupPipe,
    HeaderComponent,
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
    TimelineComponent,
    OverrideVariableNamePipe,
    OverrideGroupNamePipe,
    OverrideVariableDescriptionPipe,
    AttachmentUrlPipe,
    RoleInCurrentUserPipe,
  ],
  imports: [
    CommonModule,
    SharedModule,
    HomeRoutingModule,
    FormsModule,
    NgbModule,
    YouTubePlayerModule,
    BootstrapIconsModule.pick(icons)
  ]
})
export class HomeModule { }
