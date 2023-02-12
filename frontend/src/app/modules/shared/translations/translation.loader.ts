import { TranslateLoader } from '@ngx-translate/core';
import { environment } from "../../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs/operators";
import { Observable } from "rxjs";

export interface Translation {
    id: number,
    lang: string,
    name: string,
    values: { [key: string]: string };
}

export class TranslationLoader implements TranslateLoader {

    constructor(private http: HttpClient) {
    }

    public getTranslation(lang: string): Observable<{ [key: string]: string }> {
        return this.http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/translation?language=" + lang).pipe(
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
            map(arr => arr.find(item => item.lang === lang)),
            map(translation => {
                if (!translation) return {};
                return translation.values;
            })
        );
    }
}
