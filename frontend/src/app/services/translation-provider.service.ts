import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Translation } from '../classes/interfaces';

export const AVAILABLE_LANGUAGES = ['it', 'en'] as const;

@Injectable({
  providedIn: 'root'
})
export class TranslationProviderService {
  private translationsByLang = new Map<string, Observable<{ [key: string]: string }>>();

  constructor(private Http: HttpClient) {}

  getAvailableTranslations(): Observable<Translation[]> {
    return of(AVAILABLE_LANGUAGES.map((lang, id) => ({
      id,
      lang,
      name: lang,
      values: {}
    })));
  }

  getTranslation(lang: string): Observable<{ [key: string]: string }> {
    if (!this.translationsByLang.has(lang)) {
      this.translationsByLang.set(lang, this.fetchTranslation(lang));
    }
    return this.translationsByLang.get(lang)!;
  }

  private fetchTranslation(lang: string): Observable<{ [key: string]: string }> {
    return this.Http.get<{ [key: string]: string }>(
      `${environment.endpoint}/api/translations/${lang}`
    ).pipe(
      tap(values => localStorage.setItem(`translations:${lang}`, JSON.stringify(values))),
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
