import { Pipe, PipeTransform } from '@angular/core';
import { map, Observable } from 'rxjs';
import { StoreService } from 'src/app/services/store.service';

@Pipe({
  name: 'overrideGroupName'
})
export class OverrideGroupNamePipe implements PipeTransform {

  constructor(private DataStore: StoreService)
  {

  }

  transform(group: string): Observable<string> {
    return this.DataStore.getProject().pipe(
      map(project => project?.device?.info?.serami_group_override.find(item => item.name === group)),
      map(override => override?.title || group)
    )
  }

}
