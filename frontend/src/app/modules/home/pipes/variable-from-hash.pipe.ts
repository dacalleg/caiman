import { Pipe, PipeTransform } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { Variable } from 'src/app/classes/interfaces';
import { StoreService } from 'src/app/services/store.service';

@Pipe({
  name: 'variableFromHash'
})
export class VariableFromHashPipe implements PipeTransform {

  constructor(private Store: StoreService) {

  }

  transform(value: string | undefined | null): Observable<Variable|undefined> {
    if (!value) {
      return of(undefined);
    }
    return this.Store.getVariableByHash(value);
  }

}
