import { Pipe, PipeTransform } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Variable } from 'src/app/classes/interfaces';
import { StoreService } from 'src/app/services/store.service';

@Pipe({
  name: 'overrideVariableName'
})
export class OverrideVariableNamePipe implements PipeTransform {

  constructor(private DataStore: StoreService)
  {

  }

  transform(variable: Variable): Observable<string> {
    return this.DataStore.getProject().pipe(
      map(project => project?.device?.info?.serami_var_override.find(item => item.id === variable.hash)),
      map(override => override?.title || variable.name)
    )
  }

}
