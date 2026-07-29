import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, debounceTime } from 'rxjs';
import { AVAILABLE_LANGUAGES } from './translation-provider.service';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  private languageSubject$: BehaviorSubject<string>;

  constructor(private translation: TranslateService) {
    const savedLanguage = localStorage.getItem('language');
    const defaultLanguage = 'it';
    const language = savedLanguage && AVAILABLE_LANGUAGES.includes(savedLanguage as typeof AVAILABLE_LANGUAGES[number])
      ? savedLanguage
      : defaultLanguage;

    this.translation.setDefaultLang(defaultLanguage);
    this.translation.use(language);
    localStorage.setItem('language', language);

    this.languageSubject$ = new BehaviorSubject<string>(this.translation.currentLang);
  }

  getCurrentLanguage() {
    return this.languageSubject$.asObservable().pipe(debounceTime(500));
  }

  changeLanguage(language: string) {
    if (!AVAILABLE_LANGUAGES.includes(language as typeof AVAILABLE_LANGUAGES[number])) {
      return;
    }
    localStorage.setItem('language', language);
    this.translation.use(language);
    this.languageSubject$.next(language);
  }
}
