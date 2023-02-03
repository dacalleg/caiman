import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfiniteProgressBarComponent } from './components/infinite-progress-bar/infinite-progress-bar.component';



@NgModule({
  declarations: [
    InfiniteProgressBarComponent
  ],
  exports: [
    InfiniteProgressBarComponent
  ],
  imports: [
    CommonModule
  ]
})
export class SharedModule { }
