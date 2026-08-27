import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SeramiGroup } from 'src/app/classes/interfaces';
import { AVAILABLE_LANGUAGES } from 'src/app/services/translation-provider.service';

interface TranslationRow {
  lang: string;
  value: string;
}

@Component({
  selector: 'app-edit-group-translations',
  templateUrl: './edit-group-translations.component.html',
  styleUrls: ['./edit-group-translations.component.scss']
})
export class EditGroupTranslationsComponent implements OnChanges {
  @Input() group: SeramiGroup | null = null;

  translationRows: TranslationRow[] = [];
  availableLanguages: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group']) {
      this.syncRowsFromGroup();
    }
  }

  addTranslation(lang: string): void {
    if (!this.group || !lang) {
      return;
    }
    if (!this.group.translations) {
      this.group.translations = {};
    }
    this.group.translations[lang] = '';
    this.syncRowsFromGroup();
  }

  removeTranslation(lang: string): void {
    if (!this.group?.translations) {
      return;
    }
    delete this.group.translations[lang];
    this.cleanupTranslationsMap();
    this.syncRowsFromGroup();
  }

  onTranslationChange(lang: string, value: string): void {
    if (!this.group) {
      return;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      this.removeTranslation(lang);
      return;
    }
    if (!this.group.translations) {
      this.group.translations = {};
    }
    this.group.translations[lang] = value;
    const row = this.translationRows.find(item => item.lang === lang);
    if (row) {
      row.value = value;
    }
  }

  private syncRowsFromGroup(): void {
    const map = this.group?.translations ?? {};
    this.translationRows = this.orderedLangKeys(map).map(lang => ({
      lang,
      value: map[lang] ?? '',
    }));
    const used = new Set(this.translationRows.map(row => row.lang));
    this.availableLanguages = AVAILABLE_LANGUAGES.filter(lang => !used.has(lang));
  }

  private orderedLangKeys(map: { [key: string]: string }): string[] {
    const known = AVAILABLE_LANGUAGES.filter(lang => lang in map);
    const extra = Object.keys(map).filter(
      lang => !AVAILABLE_LANGUAGES.includes(lang as typeof AVAILABLE_LANGUAGES[number])
    );
    return [...known, ...extra];
  }

  private cleanupTranslationsMap(): void {
    if (!this.group?.translations) {
      return;
    }
    if (Object.keys(this.group.translations).length === 0) {
      this.group.translations = undefined;
    }
  }
}
