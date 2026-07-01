import { TranslateLoader } from '@ngx-translate/core';
import { Observable } from "rxjs";
import { TranslationProviderService } from 'src/app/services/translation-provider.service';

export class TranslationLoader implements TranslateLoader {

    constructor(private Provider: TranslationProviderService) {
    }

    public getTranslation(lang: string): Observable<{ [key: string]: string }> {
        return this.Provider.getTranslation(lang);
    }
}
