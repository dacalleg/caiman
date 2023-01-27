import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterVariable'
})
export class FilterVariablePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
