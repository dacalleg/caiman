import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, debounceTime, take } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  private languageSubject$: BehaviorSubject<string>;

  constructor(private translation: TranslateService) 
  { 
    const savedLanguage = localStorage.getItem("language");
    this.translation.setDefaultLang('it');
    if (savedLanguage !== null)
      this.translation.use(savedLanguage);
    else
    {
      localStorage.setItem("language", "it");
      this.translation.use('it');
    }

    this.languageSubject$ = new BehaviorSubject<string>(this.translation.currentLang);
  }

  getCurrentLanguage() {
    return this.languageSubject$.asObservable().pipe(debounceTime(500));
  }

  changeLanguage(language: string) {
    localStorage.setItem("language", language);
    this.translation.use(language);
    this.languageSubject$.next(language);
  }
}
