import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Translation } from '../classes/interfaces';

@Injectable({
  providedIn: 'root'
})
export class TranslationProviderService {
  translations$: Observable<Translation[]>;

  constructor(private Http: HttpClient) {
    this.translations$ = this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/translation").pipe(
      map(arr => arr.map(item => {
        return {
          id: item.id,
          lang: item.acf.code,
          name: item.title.rendered,
          values: item.acf.translations.reduce((acc: { [key: string]: string }, item: { key: string, value: string }) => {
            acc[item.key] = item.value;
            return acc
          }, {})
        } as Translation
      })),
      tap(data => localStorage.setItem("translations", JSON.stringify(data))),
      catchError(err => {
        let data = localStorage.getItem("translations");
        if(data !== null)
          return of(JSON.parse(data) as Translation[]);
        return throwError(() => err);
      }),
      shareReplay(1)
    );
  }

  getAvailableTranslations() {
    return this.translations$;
  }
}
