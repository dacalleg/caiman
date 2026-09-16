import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Project } from 'src/app/classes/interfaces';
import { StoreService } from 'src/app/services/store.service';
import { TranslationService } from 'src/app/services/translation.service';
import { GroupTranslationPipe } from './group-translation.pipe';

describe('GroupTranslationPipe', () => {
  let pipe: GroupTranslationPipe;
  let languageSubject: BehaviorSubject<string>;
  let projectSubject: BehaviorSubject<Project>;

  const emptyProject = (): Project => ({
    variables: [],
    view: {
      addressFormat: 16,
      modbus: false,
      modbusEEpromOffset: 4096,
      extendedView: false,
    },
  });

  beforeEach(() => {
    languageSubject = new BehaviorSubject<string>('it');
    projectSubject = new BehaviorSubject<Project>(emptyProject());

    TestBed.configureTestingModule({
      providers: [
        GroupTranslationPipe,
        {
          provide: TranslationService,
          useValue: {
            getCurrentLanguage: () => languageSubject.asObservable(),
          },
        },
        {
          provide: StoreService,
          useValue: {
            getProject: () => projectSubject.asObservable(),
          },
        },
      ],
    });

    pipe = TestBed.inject(GroupTranslationPipe);
  });

  it('returns the translation for the current language when present', async () => {
    projectSubject.next({
      ...emptyProject(),
      groups: [
        {
          name: 'Motore',
          sort: 10,
          translations: { en: 'Motor', fr: 'Moteur' },
        },
      ],
    });
    languageSubject.next('en');

    const result = await firstValueFrom(pipe.transform('Motore'));
    expect(result).toBe('Motor');
  });

  it('falls back to the group name when translation is missing', async () => {
    projectSubject.next({
      ...emptyProject(),
      groups: [{ name: 'Motore', sort: 10, translations: { en: 'Motor' } }],
    });
    languageSubject.next('fr');

    const result = await firstValueFrom(pipe.transform('Motore'));
    expect(result).toBe('Motore');
  });

  it('falls back to the group name when translation is whitespace-only', async () => {
    projectSubject.next({
      ...emptyProject(),
      groups: [{ name: 'Motore', sort: 10, translations: { en: '   ' } }],
    });
    languageSubject.next('en');

    const result = await firstValueFrom(pipe.transform('Motore'));
    expect(result).toBe('Motore');
  });

  it('falls back to the group name when groups metadata is absent', async () => {
    projectSubject.next(emptyProject());
    languageSubject.next('en');

    const result = await firstValueFrom(pipe.transform('Motore'));
    expect(result).toBe('Motore');
  });

  it('emits a new value when the language changes', async () => {
    projectSubject.next({
      ...emptyProject(),
      groups: [
        {
          name: 'Motore',
          sort: 10,
          translations: { it: 'Motore IT', en: 'Motor' },
        },
      ],
    });
    languageSubject.next('it');

    const values: string[] = [];
    const subscription = pipe.transform('Motore').subscribe(value => values.push(value));

    languageSubject.next('en');
    await Promise.resolve();

    expect(values).toContain('Motore IT');
    expect(values[values.length - 1]).toBe('Motor');
    subscription.unsubscribe();
  });

  it('returns an empty string for a null group name', async () => {
    const result = await firstValueFrom(pipe.transform(null));
    expect(result).toBe('');
  });
});
