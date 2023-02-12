import { Component } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { TranslationService } from 'src/app/services/translation.service';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.scss']
})
export class LanguageSwitcherComponent {

  translations$: Observable<string[]>;
  currentLanguage$: Observable<string>;

  constructor(private Api: ApiService, private translation: TranslationService) {
    this.translations$ = this.Api.getTranslations().pipe(map(item => item.map(item => item.lang)));
    this.currentLanguage$ = this.translation.getCurrentLanguage();
  }

  onLanguageChange($event: string) {
    this.translation.changeLanguage($event);
  }

}
