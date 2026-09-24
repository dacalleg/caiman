import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Variable } from 'src/app/classes/interfaces';
import {
  ParseVariableJsonError,
  parseAndNormalizeVariableJson,
} from 'src/app/classes/variable-json';

@Component({
  selector: 'app-paste-variable-modal',
  templateUrl: './paste-variable-modal.component.html',
})
export class PasteVariableModalComponent {
  @Input() targetGroup!: string;
  @Input() existingInGroup: Variable[] = [];

  jsonText = '';
  errorMessage: string | null = null;

  constructor(public activeModal: NgbActiveModal) {}

  confirm(): void {
    const result = parseAndNormalizeVariableJson(
      this.jsonText,
      this.targetGroup,
      this.existingInGroup
    );

    if (!result.ok) {
      this.errorMessage = this.messageForError(result.error);
      return;
    }

    this.activeModal.close(result.variable);
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

  onJsonTextChange(): void {
    this.errorMessage = null;
  }

  private messageForError(error: ParseVariableJsonError): string {
    switch (error) {
      case 'empty':
        return 'Incolla il JSON di una variabile.';
      case 'invalid_json':
        return 'Il testo incollato non è JSON valido.';
      case 'array':
        return 'Atteso un oggetto variabile, non un array.';
      case 'serami_entry':
        return 'Sembra una configurazione Serami completa, non una singola variabile.';
      case 'not_object':
        return 'Il JSON deve essere un oggetto variabile.';
    }
  }
}
