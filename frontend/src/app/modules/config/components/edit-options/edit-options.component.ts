import { Component, Input } from '@angular/core';
import { Variable } from 'src/app/classes/interfaces';

@Component({
  selector: 'app-edit-options',
  templateUrl: './edit-options.component.html',
  styleUrls: ['./edit-options.component.scss']
})
export class EditOptionsComponent {


  @Input() variable: Variable | null;
  newOption: string;
  constructor() {
    this.variable = null;
    this.newOption = "";
  }

  addOption() {
    if (this.variable) {
      const pieces = this.newOption.split(":");
      if (!this.variable.values)
        this.variable.values = [];
      this.variable.values.push([pieces[0].trim(), pieces[1].trim()]);
    }
  }

  removeOption(key: string) {
    if (this.variable)
      this.variable.values = this.variable?.values?.filter(k => k[0] !== key)
  }
}
