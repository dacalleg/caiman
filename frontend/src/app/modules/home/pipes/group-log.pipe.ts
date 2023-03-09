import { Pipe, PipeTransform } from '@angular/core';
import { GroupLogItem, LogItem } from 'src/app/classes/interfaces';

@Pipe({
  name: 'groupLog'
})
export class GroupLogPipe implements PipeTransform {

  transform(value: LogItem[]): GroupLogItem[] {
    return value.reduce((acc, log) => {
      let group = acc.find(item => item.date.toDateString() === log.date.toDateString());
      if (!group) {
        group = {
          date: new Date(log.date.toDateString()),
          logs: [log] as LogItem[]
        };
        acc.push(group);
      } else {
        group.logs.push(log);
      }
      return acc;
    }, [] as GroupLogItem[]);
  }

}
