import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Variable} from 'src/app/classes/interfaces';
import { Utils } from 'src/app/classes/utils';

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
    if (this.variable) {
      const step = this.variable?.step || 1;

      const min = 0;
      const max = (2 ** this.variable?.bit) - 1;

      const realMin = this.variable.min || min;
      const realMax = this.variable.max || max;
      const values = Utils.getAllMaskValues(this.variable.mask!)

      let res = values.map(i => {
        let val = this.computeGeneratorFunction(i);
        if(!isNaN(+val))
        {
          const test = +val;
          if(test >= realMin && test <= realMax && test % step === 0)
          {
            const name = this.variable!.formatstring.replace("{0}", val);
            return ["" + i, name];
          }
        }
        else
        {
          if(i>=realMin && i<=realMax && i % step === 0)
            return ["" + i, val];
        }
        return null;
      }).filter(item => item !== null).map(item => item![0] + ":" + item![1]).join("\n")

      if(this.list === "")
        this.list = res;
      else
        this.list += "\n" + res;
      this.onListChange(this.list);
    }
  }

  computeGeneratorFunction(value: number)
  {
    if(this.variable && this.variable.genFn)
    {
      let fn = eval(this.variable.genFn);
      return "" + fn(value)
    }
    if(this.variable && this.variable.readExp)
    {
      const val = Utils.convertValuesToRead([this.variable], [value])[0];
      return String(val);
    }
    return "" + value;
  }

  getAllMaskNumber(mask: number)
  {
    let ret = [];
    for(let i=0;i<=mask;i++)
    {
      const test = i & mask;
      if(i === test)
        ret.push(i)
    }
    return ret;
  }

  getAllNumberFromMinMax(min: number, max: number)
  {
    let ret = [];
    for(let i=min;i<=max;i++)
    {
        ret.push(i)
    }
    return ret;
  }
}
