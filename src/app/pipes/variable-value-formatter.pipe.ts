import { variable } from '@angular/compiler/src/output/output_ast';
import { Pipe, PipeTransform } from '@angular/core';
import { DeviceData, Variable, VariableValue } from "../classes/interfaces";

@Pipe({
  name: 'variableValueFormatter'
})
export class VariableValueFormatterPipe implements PipeTransform {

  transform(value: VariableValue | null): string | number | boolean | null {
    if (value === null)
      return null;

    if (value.variable.values) {
      for (let i = 0; i < value.variable.values.length; i++) {
        const item = value.variable.values[i]
        if (parseInt(item[0]) == value.value)
          return item[1];
      }
    }

    if (value.variable.formatstring) {
      return value.variable.formatstring.replace("{0}", "" + value.value);
    }

    return value.value;
  }

}
