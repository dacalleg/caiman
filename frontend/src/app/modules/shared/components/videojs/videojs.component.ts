import { Component, ElementRef, Input, ViewChild, ViewEncapsulation } from '@angular/core';
declare var videojs:any;

@Component({
  selector: 'app-videojs',
  templateUrl: './videojs.component.html',
  styleUrls: ['./videojs.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class VideojsComponent {
  @ViewChild('target', { static: true }) target: ElementRef|null;

  @Input() options: any

  player: any | null;

  constructor(
    private elementRef: ElementRef,
  ) {

    this.player = null;
    this.target = null;
    this.options = {};
  }

  // Instantiate a Video.js player OnInit
  ngOnInit() {
    this.player = videojs(this.target!.nativeElement, this.options, function onPlayerReady() {
      console.log('onPlayerReady');
    });
  }

  // Dispose the player OnDestroy
  ngOnDestroy() {
    if (this.player) {
      this.player.dispose();
    }
  }

}
