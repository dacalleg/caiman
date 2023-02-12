import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  private languageSubject$: BehaviorSubject<string>;

  constructor(private translation: TranslateService) 
  { 
    const savedLanguage = localStorage.getItem("language");
    this.translation.setDefaultLang('it');
    if (savedLanguage)
      this.translation.use(savedLanguage);
    else
      this.translation.use('it');
    this.languageSubject$ = new BehaviorSubject<string>(this.translation.currentLang);
  }

  getCurrentLanguage() {
    return this.languageSubject$.asObservable();
  }

  changeLanguage(language: string) {
    localStorage.setItem("language", language);
    this.translation.use(language);
    this.languageSubject$.next(language);
  }
}
