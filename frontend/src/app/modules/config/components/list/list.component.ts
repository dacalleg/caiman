import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, concat, from, of, switchMap } from 'rxjs';
import { SeramiEntry, SeramiImportModalResult, SeramiTranslationsImportResult } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { SeramiParserService } from 'src/app/services/serami-parser.service';
import { ImportConfigModalComponent } from '../import-config-modal/import-config-modal.component';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent {
  list$: Observable<SeramiEntry[]>;
  reloadSerami$: Subject<void>;
  @ViewChild('file') file: ElementRef | null;
  @ViewChild('translationsFile') translationsFile: ElementRef | null;
  @ViewChild('configFile') configFile: ElementRef | null;
  private pendingTranslationsImportKey: string | null = null;

  constructor(
    private Api: ApiService,
    private Router: Router,
    private Serami: SeramiParserService,
    private modalService: NgbModal
  ) {
    this.file = null;
    this.translationsFile = null;
    this.configFile = null;
    this.reloadSerami$ = new Subject<void>();
    this.list$ = concat(of(void 0), this.reloadSerami$).pipe(switchMap(() => this.Api.getSeramiList()));
  }

  openConfig(key: string) {
    this.Router.navigate(['/config/edit', key]);
  }

  onFileChange($event: Event) {
    this.readFile($event.target).pipe(
      switchMap(data => this.Serami.parse(data)),
      switchMap(variables => this.Api.updateSerami({ name: 'Import', data: variables }))
    ).subscribe(() => {
      self.location.reload();
    });
  }

  readFile(inputValue: any): Observable<string> {
    return from(new Promise<string>(resolve => {
      const file: File = inputValue.files[0];
      const myReader: FileReader = new FileReader();

      myReader.onloadend = function () {
        resolve(myReader.result as string);
      };
      myReader.readAsText(file);
    }));
  }

  importSnet2() {
    if (this.file) {
      this.file.nativeElement.click();
    }
  }

  importConfig() {
    this.configFile?.nativeElement.click();
  }

  onConfigFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      input.value = '';
      return;
    }

    this.readFile(input).subscribe({
      next: content => {
        const config = this.parseConfigJson(content);
        if (!config) {
          alert('Il file selezionato non contiene una configurazione valida');
          input.value = '';
          return;
        }

        const modalRef = this.modalService.open(ImportConfigModalComponent, {
          ariaLabelledBy: 'modal-basic-title',
          centered: true
        });
        modalRef.componentInstance.config = config;

        modalRef.result.then(
          (result: SeramiImportModalResult) => {
            this.Api.importSeramiConfig(result.config, result.keepUuid).subscribe({
              next: importResult => {
                alert(`Configurazione "${importResult.name}" importata con successo.`);
                this.reloadSerami$.next();
              },
              error: error => {
                alert(this.resolveImportError(error));
              }
            });
          },
          () => {}
        );
      },
      complete: () => {
        input.value = '';
      }
    });
  }

  exportConfig(entry: SeramiEntry) {
    if (!entry.key) {
      return;
    }

    this.Api.exportSeramiConfig(entry.key).subscribe(response => {
      const blob = response.body;
      if (!blob) {
        return;
      }

      const filename = this.resolveJsonExportFilename(response.headers.get('Content-Disposition'), entry.name);
      this.downloadBlob(filename, blob);
    });
  }

  duplicateEntry(entry: SeramiEntry) {
    this.Api.getSerami(entry.key!).pipe(
      switchMap(source => {
        const copy: SeramiEntry = structuredClone(source);
        delete copy.key;
        copy.name = `${source.name} (copia)`;
        return this.Api.updateSerami(copy);
      })
    ).subscribe(() => this.reloadSerami$.next());
  }

  deleteEntry(entry: SeramiEntry) {
    const result = confirm('Vuoi davvero eliminare la configurazione ' + entry.name + '?');
    if (result) {
      this.Api.deleteSerami(entry.key!).subscribe(() => this.reloadSerami$.next());
    }
  }

  exportTranslations(entry: SeramiEntry) {
    if (!entry.key) {
      return;
    }

    this.Api.exportSeramiTranslations(entry.key).subscribe(response => {
      const blob = response.body;
      if (!blob) {
        return;
      }

      const filename = this.resolveExportFilename(response.headers.get('Content-Disposition'), entry.name);
      this.downloadBlob(filename, blob);
    });
  }

  importTranslations(entry: SeramiEntry) {
    if (!entry.key) {
      return;
    }
    this.pendingTranslationsImportKey = entry.key;
    this.translationsFile?.nativeElement.click();
  }

  onTranslationsFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const sourceKey = this.pendingTranslationsImportKey;

    if (!file || !sourceKey) {
      this.pendingTranslationsImportKey = null;
      input.value = '';
      return;
    }

    this.readFile(input).pipe(
      switchMap(csv => this.Api.importSeramiTranslations(sourceKey, csv))
    ).subscribe({
      next: result => {
        this.showImportResult(result);
        this.reloadSerami$.next();
      },
      complete: () => {
        this.pendingTranslationsImportKey = null;
        input.value = '';
      }
    });
  }

  private parseConfigJson(content: string): SeramiEntry | null {
    try {
      const parsed = JSON.parse(content) as SeramiEntry;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      if (!parsed.name || typeof parsed.name !== 'string') {
        return null;
      }
      if (!Array.isArray(parsed.data)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private resolveImportError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return 'Impossibile importare: esiste già una configurazione con questo UUID.';
      }
      if (error.error?.message) {
        return error.error.message;
      }
    }
    return 'Errore durante l\'importazione';
  }

  private showImportResult(result: SeramiTranslationsImportResult) {
    const skippedCount = result.skippedCsvRows.length;
    let message = `Configurazione "${result.name}" aggiornata.\nTraduzioni applicate: ${result.matched}/${result.totalCsvRows}.`;
    if (skippedCount > 0) {
      message += `\nRighe CSV ignorate: ${skippedCount}.`;
    }
    alert(message);
  }

  private resolveExportFilename(contentDisposition: string | null, fallbackName: string): string {
    if (contentDisposition) {
      const match = /filename=\"([^\"]+)\"/i.exec(contentDisposition);
      if (match?.[1]) {
        return match[1];
      }
    }

    const safeName = fallbackName.trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_') || 'serami';
    return `${safeName}_translations.csv`;
  }

  private resolveJsonExportFilename(contentDisposition: string | null, fallbackName: string): string {
    if (contentDisposition) {
      const match = /filename=\"([^\"]+)\"/i.exec(contentDisposition);
      if (match?.[1]) {
        return match[1];
      }
    }

    const safeName = fallbackName.trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_') || 'serami';
    return `${safeName}.json`;
  }

  private downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
