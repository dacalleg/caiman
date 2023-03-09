import { Pipe, PipeTransform } from '@angular/core';
import { Variable, VariableValue } from 'src/app/classes/interfaces';

@Pipe({
  name: 'variableValueFormatter'
})
export class VariableValueFormatterPipe implements PipeTransform {

  transform(value: number, variable: Variable): string | number | boolean | null {
    if (value === null)
      return null;

    let calculated = value;

    if (variable.values) {
      for (let i = 0; i < variable.values.length; i++) {
        const item = variable.values[i]
        if (parseInt(item[0]) == calculated)
          return item[1];
      }
    }

    if (variable.formatstring) {
      return variable.formatstring.replace("{0}", "" + calculated);
    }

    return calculated;
  }

}
