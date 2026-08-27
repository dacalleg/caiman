import { Pipe, PipeTransform } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Variable } from 'src/app/classes/interfaces';
import { TranslationService } from 'src/app/services/translation.service';

@Pipe({
  name: 'variableTranslation'
})
export class VariableTranslationPipe implements PipeTransform {

  constructor(private translation: TranslationService) {}

  transform(variable: Variable | null, field: 'name' | 'description'): Observable<string> {
    return this.translation.getCurrentLanguage().pipe(
      map(lang => this.resolveVariableTranslation(variable, field, lang))
    );
  }

  private resolveVariableTranslation(
    variable: Variable | null,
    field: 'name' | 'description',
    lang: string
  ): string {
    if (!variable) {
      return '';
    }

    const translations = field === 'name'
      ? variable.translatedName
      : variable.translatedDescription;
    const translated = translations?.[lang]?.trim();
    if (translated) {
      return translated;
    }

    return field === 'name'
      ? (variable.name ?? '')
      : (variable.description ?? '');
  }
}
