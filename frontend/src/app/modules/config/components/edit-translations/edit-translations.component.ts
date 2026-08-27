import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { Variable } from 'src/app/classes/interfaces';
import { TranslationProviderService } from 'src/app/services/translation-provider.service';

interface NameTranslationRow {
  lang: string;
  value: string;
}

interface DescriptionTranslationRow {
  lang: string;
  value: string;
}

@Component({
  selector: 'app-edit-translations',
  templateUrl: './edit-translations.component.html',
  styleUrls: ['./edit-translations.component.scss']
})
export class EditTranslationsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() variable: Variable | null = null;

  nameTranslationRows: NameTranslationRow[] = [];
  descriptionTranslationRows: DescriptionTranslationRow[] = [];
  availableNameLanguages: string[] = [];
  availableDescriptionLanguages: string[] = [];
  private configuredLanguages: string[] = [];
  private languagesSubscription: Subscription | null = null;

  constructor(private translationProvider: TranslationProviderService) {}

  ngOnInit(): void {
    this.languagesSubscription = this.translationProvider.getAvailableLanguages().subscribe(languages => {
      this.configuredLanguages = languages;
      this.syncNameRowsFromVariable();
      this.syncDescriptionRowsFromVariable();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['variable']) {
      this.syncNameRowsFromVariable();
      this.syncDescriptionRowsFromVariable();
    }
  }

  ngOnDestroy(): void {
    this.languagesSubscription?.unsubscribe();
  }

  addNameTranslation(lang: string): void {
    if (!this.variable || !lang) {
      return;
    }
    if (!this.variable.translatedName) {
      this.variable.translatedName = {};
    }
    this.variable.translatedName[lang] = '';
    this.syncNameRowsFromVariable();
  }

  removeNameTranslation(lang: string): void {
    if (!this.variable?.translatedName) {
      return;
    }
    delete this.variable.translatedName[lang];
    this.cleanupNameMap();
    this.syncNameRowsFromVariable();
  }

  onNameTranslationChange(lang: string, value: string): void {
    if (!this.variable) {
      return;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      this.removeNameTranslation(lang);
      return;
    }
    if (!this.variable.translatedName) {
      this.variable.translatedName = {};
    }
    this.variable.translatedName[lang] = value;
    const row = this.nameTranslationRows.find(item => item.lang === lang);
    if (row) {
      row.value = value;
    }
  }

  addDescriptionTranslation(lang: string): void {
    if (!this.variable || !lang) {
      return;
    }
    if (!this.variable.translatedDescription) {
      this.variable.translatedDescription = {};
    }
    this.variable.translatedDescription[lang] = '';
    this.syncDescriptionRowsFromVariable();
  }

  removeDescriptionTranslation(lang: string): void {
    if (!this.variable?.translatedDescription) {
      return;
    }
    delete this.variable.translatedDescription[lang];
    this.cleanupDescriptionMap();
    this.syncDescriptionRowsFromVariable();
  }

  onDescriptionTranslationChange(lang: string, value: string): void {
    if (!this.variable) {
      return;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      this.removeDescriptionTranslation(lang);
      return;
    }
    if (!this.variable.translatedDescription) {
      this.variable.translatedDescription = {};
    }
    this.variable.translatedDescription[lang] = value;
    const row = this.descriptionTranslationRows.find(item => item.lang === lang);
    if (row) {
      row.value = value;
    }
  }

  private syncNameRowsFromVariable(): void {
    const map = this.variable?.translatedName ?? {};
    this.nameTranslationRows = this.orderedLangKeys(map).map(lang => ({
      lang,
      value: map[lang] ?? '',
    }));
    const used = new Set(this.nameTranslationRows.map(row => row.lang));
    this.availableNameLanguages = this.configuredLanguages.filter(lang => !used.has(lang));
  }

  private syncDescriptionRowsFromVariable(): void {
    const map = this.variable?.translatedDescription ?? {};
    this.descriptionTranslationRows = this.orderedLangKeys(map).map(lang => ({
      lang,
      value: map[lang] ?? '',
    }));
    const used = new Set(this.descriptionTranslationRows.map(row => row.lang));
    this.availableDescriptionLanguages = this.configuredLanguages.filter(lang => !used.has(lang));
  }

  private orderedLangKeys(map: { [key: string]: string }): string[] {
    const known = this.configuredLanguages.filter(lang => lang in map);
    const extra = Object.keys(map).filter(
      lang => !this.configuredLanguages.includes(lang)
    );
    return [...known, ...extra];
  }

  private cleanupNameMap(): void {
    if (!this.variable?.translatedName) {
      return;
    }
    if (Object.keys(this.variable.translatedName).length === 0) {
      this.variable.translatedName = undefined;
    }
  }

  private cleanupDescriptionMap(): void {
    if (!this.variable?.translatedDescription) {
      return;
    }
    if (Object.keys(this.variable.translatedDescription).length === 0) {
      this.variable.translatedDescription = undefined;
    }
  }
}
