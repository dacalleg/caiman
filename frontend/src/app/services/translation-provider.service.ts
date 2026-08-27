import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Translation } from '../classes/interfaces';

@Injectable({
  providedIn: 'root'
})
export class TranslationProviderService {
  private translationsByLang = new Map<string, Observable<{ [key: string]: string }>>();
  private availableLanguages$: Observable<string[]>;

  constructor(private Http: HttpClient) {
    this.availableLanguages$ = this.Http
      .get<string[]>(`${environment.endpoint}/api/translations`)
      .pipe(
        catchError(() => of([])),
        shareReplay(1)
      );
  }

  getAvailableLanguages(): Observable<string[]> {
    return this.availableLanguages$;
  }

  getAvailableTranslations(): Observable<Translation[]> {
    return this.getAvailableLanguages().pipe(
      map(languages => languages.map((lang, id) => ({
        id,
        lang,
        name: lang,
        values: {}
      })))
    );
  }

  getTranslation(lang: string): Observable<{ [key: string]: string }> {
    if (!this.translationsByLang.has(lang)) {
      this.translationsByLang.set(lang, this.fetchTranslation(lang));
    }
    return this.translationsByLang.get(lang)!;
  }

  private fetchTranslation(lang: string): Observable<{ [key: string]: string }> {
    return this.getAvailableLanguages().pipe(
      switchMap(languages => {
        if (languages.length === 0) {
          const cached = localStorage.getItem(`translations:${lang}`);
          if (cached !== null) {
            return of(JSON.parse(cached) as { [key: string]: string });
          }
          return of({});
        }
        if (!languages.includes(lang)) {
          return throwError(() => new Error(`Language not configured: ${lang}`));
        }
        return this.Http.get<{ [key: string]: string }>(
          `${environment.endpoint}/api/translations/${lang}`
        );
      }),
      tap(values => {
        if (Object.keys(values).length > 0) {
          localStorage.setItem(`translations:${lang}`, JSON.stringify(values));
        }
      }),
      catchError(err => {
        const cached = localStorage.getItem(`translations:${lang}`);
        if (cached !== null) {
          return of(JSON.parse(cached) as { [key: string]: string });
        }
        return throwError(() => err);
      }),
      shareReplay(1)
    );
  }
}
