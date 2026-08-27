import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, debounceTime } from 'rxjs';

const UI_FALLBACK_LANGUAGE = 'it';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  private languageSubject$: BehaviorSubject<string>;
  private availableLanguages: string[] = [];
  private initialized = false;

  constructor(private translation: TranslateService) {
    this.languageSubject$ = new BehaviorSubject<string>(UI_FALLBACK_LANGUAGE);
  }

  initialize(availableLanguages: string[]): void {
    this.availableLanguages = availableLanguages;
    this.initialized = true;

    if (availableLanguages.length === 0) {
      this.translation.setDefaultLang(UI_FALLBACK_LANGUAGE);
      this.translation.use(UI_FALLBACK_LANGUAGE);
      localStorage.setItem('language', UI_FALLBACK_LANGUAGE);
      this.languageSubject$.next(UI_FALLBACK_LANGUAGE);
      return;
    }

    const defaultLanguage = availableLanguages[0];
    const savedLanguage = localStorage.getItem('language');
    const language = savedLanguage && availableLanguages.includes(savedLanguage)
      ? savedLanguage
      : defaultLanguage;

    this.translation.setDefaultLang(defaultLanguage);
    this.translation.use(language);
    localStorage.setItem('language', language);
    this.languageSubject$.next(language);
  }

  getCurrentLanguage() {
    return this.languageSubject$.asObservable().pipe(debounceTime(500));
  }

  changeLanguage(language: string) {
    if (!this.initialized || !this.availableLanguages.includes(language)) {
      return;
    }
    localStorage.setItem('language', language);
    this.translation.use(language);
    this.languageSubject$.next(language);
  }
}
