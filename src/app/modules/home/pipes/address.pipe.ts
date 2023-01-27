import {Pipe, PipeTransform} from '@angular/core';
import { ViewOption } from 'src/app/classes/interfaces';

@Pipe({
  name: 'address'
})
export class AddressPipe implements PipeTransform {

  transform(value: number | null, type: string | null, options: ViewOption | null = null): number | null {
    if (value === null)
      return null;
    if (options === null) {
      return value;
    }
    if (options.modbus) {
      value = Math.floor(value / 2);
      if (type === "eeprom")
        value = value + options.modbusEEpromOffset;
    }
    return value;
  }

}
