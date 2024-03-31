import {Pipe, PipeTransform} from '@angular/core';
import { Variable } from 'src/app/classes/interfaces';

@Pipe({
  name: 'sortGroup'
})
export class SortGroupPipe implements PipeTransform {

  transform(value: string[] | null): string[] {
    if (value === null) {
      return [];
    }
    return value.sort((b,a) => b.localeCompare(a));
  }
}
