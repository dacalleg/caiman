import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfiniteProgressBarComponent } from './components/infinite-progress-bar/infinite-progress-bar.component';
import { LanguageSwitcherComponent } from './components/language-switcher/language-switcher.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    InfiniteProgressBarComponent,
    LanguageSwitcherComponent
  ],
  exports: [
    InfiniteProgressBarComponent,
    LanguageSwitcherComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
  ]
})
export class SharedModule { }
