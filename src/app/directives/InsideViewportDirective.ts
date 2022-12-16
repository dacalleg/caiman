import {Directive, ElementRef, EventEmitter, HostListener, Output} from '@angular/core';

@Directive({
  selector: '[insideViewport]'
})
export class InsideViewportDirective {
  @Output() insideViewport = new EventEmitter();
  visible: boolean;
  constructor(private elementRef: ElementRef) {
    this.visible = false;
  }

  @HostListener('window:scroll', ['$event'])
  public onScrollBy(): any {
    const windowHeight = window.innerHeight;

    const boundedRect = this.elementRef.nativeElement.getBoundingClientRect();

    if (boundedRect.top >= 0 && boundedRect.top <= windowHeight) {
      if(!this.visible)
      {
        this.visible = true;
        this.insideViewport.emit(true);
      }
    } else {
      if(this.visible)
      {
        this.visible = false;
        this.insideViewport.emit(false);
      }
    }
  }
}
