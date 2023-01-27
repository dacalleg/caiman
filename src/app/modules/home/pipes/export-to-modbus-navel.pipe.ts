import {Pipe, PipeTransform} from '@angular/core';
import {map, Observable, take} from "rxjs";
import { Variable } from 'src/app/classes/interfaces';
import { ExportService } from 'src/app/services/export.service';
import { StoreService } from 'src/app/services/store.service';

@Pipe({
  name: 'exportToModbusNavel'
})
export class ExportToModbusNavelPipe implements PipeTransform {


  constructor(private Store: StoreService, private exporter: ExportService) {
  }

  transform(value: Variable): Observable<any> {
    return this.Store.getProject().pipe(
      take(1),
      map(project => this.exporter.variableToModbusNavel([value], project.view.modbusEEpromOffset) as any[]),
    )
  }
}
