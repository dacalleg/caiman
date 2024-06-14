import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfiniteProgressBarComponent } from './components/infinite-progress-bar/infinite-progress-bar.component';
import { LanguageSwitcherComponent } from './components/language-switcher/language-switcher.component';
import { FormsModule } from '@angular/forms';
import { VideojsComponent } from './components/videojs/videojs.component';
import { IsURLPipe } from './pipes/is-url.pipe';
import { RouterModule } from '@angular/router';
import { SafePipe } from './pipes/safe.pipe';
import { OperationOptionPipe } from './pipes/operation-option.pipe';
import { LicenseInputComponent } from './components/license-input/license-input.component';
import { LicenseInfoComponent } from './components/license-info/license-info.component';


@NgModule({
  declarations: [
    InfiniteProgressBarComponent,
    LanguageSwitcherComponent,
    VideojsComponent,
    IsURLPipe,
    SafePipe,
    OperationOptionPipe,
    LicenseInputComponent,
    LicenseInfoComponent
  ],
  exports: [
    InfiniteProgressBarComponent,
    LanguageSwitcherComponent,
    VideojsComponent,
    IsURLPipe,
    SafePipe,
    OperationOptionPipe,
    LicenseInputComponent,
    LicenseInfoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
  ]
})
export class SharedModule { }
