import {Pipe, PipeTransform} from '@angular/core';
import {Project, Variable} from "../classes/interfaces";
import {StoreService} from "../services/store.service";
import {map, Observable, take} from "rxjs";
import {ExportService} from "../services/export.service";

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
