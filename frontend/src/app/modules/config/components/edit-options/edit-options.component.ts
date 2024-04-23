import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Variable} from 'src/app/classes/interfaces';

@Component({
  selector: 'app-edit-options',
  templateUrl: './edit-options.component.html',
  styleUrls: ['./edit-options.component.scss']
})
export class EditOptionsComponent implements OnChanges {


  @Input() variable: Variable | null;
  list: string;

  constructor() {
    this.variable = null;
    this.list = "";
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.variable && this.variable.values)
      this.list = this.variable.values.map(item => item[0] + ":" + item[1]).join("\n")
  }

  onListChange($event: string) {
    this.list = $event;
    if (this.variable) {
      const lines = $event.split("\n");
      const items = lines.map(line => line.split(":"));

      this.variable.values = items.filter(i => i.length >= 2).map(arr => [arr[0], arr.slice(1).join(":")])
    }
  }

  generateAllOptions() {
    if (this.variable && this.variable.values) {
      const step = this.variable?.step || 1;
      const min = this.variable?.min || 0;
      const max = this.variable?.max || 0;
      for (let i = min; i <= max; i = i + step) {
        let val = this.computeGeneratorFunction(i);
        const name = this.variable.formatstring.replace("{0}", val);
        this.variable?.values?.push(["" + i, name]);
      }
      this.list = this.variable.values.map(item => item[0] + ":" + item[1]).join("\n")
    }
  }

  computeGeneratorFunction(value: number)
  {
    if(this.variable && this.variable.genFn)
    {
      let fn = eval(this.variable.genFn);
      return "" + fn(value)
    }
    return "" + value;
  }
}
