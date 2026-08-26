import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, concat, from, of, switchMap, tap } from 'rxjs';
import { SeramiEntry, SeramiTranslationsImportResult } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { SeramiParserService } from 'src/app/services/serami-parser.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent {
  list$: Observable<SeramiEntry[]>;
  reloadSerami$: Subject<void>;
  @ViewChild("file") file: ElementRef | null;
  @ViewChild("translationsFile") translationsFile: ElementRef | null;
  private pendingTranslationsImportKey: string | null = null;

  constructor(private Api: ApiService, private Router: Router, private Serami: SeramiParserService) {
    this.file = null;
    this.translationsFile = null;
    this.reloadSerami$ = new Subject<void>();
    this.list$ = concat(of(void 0), this.reloadSerami$).pipe(switchMap(() => this.Api.getSeramiList()));
  }

  openConfig(key: string) {
    this.Router.navigate(["/config/edit", key])
  }

  onFileChange($event: Event) {
    this.readFile($event.target).pipe(
      switchMap(data => this.Serami.parse(data)),
      switchMap(variables => this.Api.updateSerami({ name: "Import", data: variables }))
    ).subscribe(() => {
      self.location.reload();
    })
  }

  readFile(inputValue: any): Observable<string> {
    return from(new Promise<string>(resolve => {
      let file: File = inputValue.files[0];
      let myReader: FileReader = new FileReader();

      myReader.onloadend = function (e) {
        resolve(myReader.result as string)
      }
      myReader.readAsText(file);
    }))
  }

  importSnet2() {
    if (this.file)
      this.file.nativeElement.click();
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

  deleteEntry(entry: SeramiEntry)
  {
    const result = confirm("Vuoi davvero eliminare la configurazione " + entry.name + "?");
    if(result)
      this.Api.deleteSerami(entry.key!).subscribe(() => this.reloadSerami$.next())
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

  private showImportResult(result: SeramiTranslationsImportResult) {
    const skippedCount = result.skippedCsvRows.length;
    let message = `Configurazione "${result.name}" creata.\nTraduzioni applicate: ${result.matched}/${result.totalCsvRows}.`;
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
