import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'sortGroup'
})
export class SortGroupPipe implements PipeTransform {

  transform(value: string[] | null): string[] {
    if (value === null) {
      return [];
    }
    return value;
  }
}
