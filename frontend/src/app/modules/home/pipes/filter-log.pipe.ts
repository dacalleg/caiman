import { Pipe, PipeTransform } from '@angular/core';
import { GroupLogItem, LogType } from 'src/app/classes/interfaces';

@Pipe({
  name: 'filterLog'
})
export class FilterLogPipe implements PipeTransform {

  transform(value: GroupLogItem, types: LogType[]): GroupLogItem {
    return { ...value, logs: value.logs.filter(item => types.includes(item.type)) };
  }

}
