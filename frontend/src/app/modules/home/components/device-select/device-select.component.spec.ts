import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BarcodeService } from 'src/app/services/barcode.service';
import { DeviceSelectComponent } from './device-select.component';

class TranslateStubLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'home.deviceselect.open': 'Apri',
      serial: 'Matricola',
    });
  }
}

describe('DeviceSelectComponent open button', () => {
  let fixture: ComponentFixture<DeviceSelectComponent>;
  let component: DeviceSelectComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeviceSelectComponent],
      imports: [
        FormsModule,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateStubLoader },
        }),
      ],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getAllProducts: () => of([]),
            getInfo: () => of({ logo: '' }),
          },
        },
        {
          provide: BarcodeService,
          useValue: { scan: () => of('') },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function openButton(): HTMLButtonElement | null {
    return fixture.debugElement.query(By.css('form .btn-open'))?.nativeElement ?? null;
  }

  it('disables Apri for Wi-Fi client mode until all fields are filled', () => {
    component.selectOption(2);
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeTrue();

    component.macAddress = 'AA:BB:CC:DD:EE:FF';
    component.serialNumber = '12345';
    component.assistanceCode = 'ABC';
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeFalse();
  });

  it('disables Apri for bridge mode until product is selected', () => {
    component.selectOption(3);
    fixture.detectChanges();

    component.macAddress = 'AA:BB:CC:DD:EE:FF';
    component.serialNumber = '12345';
    component.assistanceCode = 'ABC';
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeTrue();

    component.selectedProduct = 'product-key';
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeFalse();
  });

  it('disables Apri for offline mode until all fields are filled', () => {
    component.selectOption(4);
    fixture.detectChanges();

    component.macAddress = 'AA:BB:CC:DD:EE:FF';
    component.regCode = 'pwd';
    component.serialNumber = '12345';
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeTrue();

    component.selectedProduct = 'product-key';
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeFalse();
  });

  it('enables Apri for report-only mode when serial is provided', () => {
    component.selectOption(1);
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeTrue();

    component.serialNumber = 'SN001';
    fixture.detectChanges();

    expect(openButton()?.disabled).toBeFalse();
  });
});
