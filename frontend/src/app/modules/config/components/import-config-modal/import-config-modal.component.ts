import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { catchError, of } from 'rxjs';
import { SeramiEntry, SeramiImportModalResult } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-import-config-modal',
  templateUrl: './import-config-modal.component.html',
  styleUrls: ['./import-config-modal.component.scss']
})
export class ImportConfigModalComponent implements OnInit {
  @Input() config!: SeramiEntry;

  keepUuid = false;
  uuidExists = false;
  isCheckingUuid = false;

  constructor(
    public activeModal: NgbActiveModal,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    if (this.config.key) {
      this.checkUuidExists();
    }
  }

  get uuidLabel(): string {
    return this.config.key ?? '';
  }

  get hasUuid(): boolean {
    return !!this.config.key;
  }

  get canConfirm(): boolean {
    if (!this.hasUuid) {
      return true;
    }
    if (this.isCheckingUuid) {
      return false;
    }
    return !(this.keepUuid && this.uuidExists);
  }

  onKeepUuidChange(): void {
    if (this.keepUuid && this.config.key) {
      this.checkUuidExists();
    }
  }

  confirm(): void {
    if (!this.canConfirm) {
      return;
    }

    const result: SeramiImportModalResult = {
      config: this.config,
      keepUuid: this.keepUuid
    };
    this.activeModal.close(result);
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

  private checkUuidExists(): void {
    if (!this.config.key) {
      this.uuidExists = false;
      return;
    }

    this.isCheckingUuid = true;
    this.api.getSerami(this.config.key).pipe(
      catchError(() => of(null))
    ).subscribe(entry => {
      this.uuidExists = entry !== null;
      this.isCheckingUuid = false;
    });
  }
}
