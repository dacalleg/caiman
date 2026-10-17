import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ApiService } from './services/api.service';
import { TranslationService } from './services/translation.service';
import { AppComponent } from './app.component';

describe('AppComponent theme-color meta', () => {
  let meta: Meta;

  beforeEach(async () => {
    document.documentElement.style.setProperty('--theme-window-bar', '#262626');

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        Meta,
        { provide: TranslationService, useValue: { initialize: () => undefined } },
        { provide: ApiService, useValue: {} },
      ],
    }).compileComponents();

    meta = TestBed.inject(Meta);
  });

  it('syncs theme-color meta tag from CSS variable on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const tag = meta.getTag('name="theme-color"');
    expect(tag?.content).toBe('#262626');
  });
});
