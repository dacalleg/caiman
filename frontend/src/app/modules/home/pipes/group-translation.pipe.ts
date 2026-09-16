import { Pipe, PipeTransform } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { StoreService } from 'src/app/services/store.service';
import { TranslationService } from 'src/app/services/translation.service';

@Pipe({
  name: 'groupTranslation'
})
export class GroupTranslationPipe implements PipeTransform {

  constructor(
    private translation: TranslationService,
    private store: StoreService
  ) {}

  transform(groupName: string | null): Observable<string> {
    return combineLatest([
      this.translation.getCurrentLanguage(),
      this.store.getProject()
    ]).pipe(
      map(([lang, project]) => {
        if (!groupName) {
          return '';
        }
        const metadata = project?.groups?.find(group => group.name === groupName);
        const translated = metadata?.translations?.[lang]?.trim();
        return translated || groupName;
      })
    );
  }
}
