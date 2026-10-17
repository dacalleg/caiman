import { Component, OnInit } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ApiService } from './services/api.service';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(
    private translation: TranslationService,
    private Api: ApiService,
    private meta: Meta,
  ) {
  }

  ngOnInit(): void {
    this.syncThemeColorMeta();
  }

  private syncThemeColorMeta(): void {
    const themeColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-window-bar')
      .trim();

    if (themeColor) {
      this.meta.updateTag({ name: 'theme-color', content: themeColor });
    }
  }
}
