import { TranslateLoader } from '@ngx-translate/core';
import { map } from "rxjs/operators";
import { Observable } from "rxjs";
import { ApiService } from 'src/app/services/api.service';
import { TranslationProviderService } from 'src/app/services/translation-provider.service';

export class TranslationLoader implements TranslateLoader {

    constructor(private Provider: TranslationProviderService) {
    }

    public getTranslation(lang: string): Observable<{ [key: string]: string }> {
        return this.Provider.getAvailableTranslations().pipe(
            map(arr => arr.find(item => item.lang === lang)),
            map(translation => {
                if (!translation) return {};
                return translation.values;
            })
        );
    }
}
