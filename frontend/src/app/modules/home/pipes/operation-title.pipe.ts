import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { Operation } from 'src/app/classes/interfaces';
import { LOCALE_ID, Inject } from '@angular/core';

@Pipe({
  name: 'operationTitle'
})
export class OperationTitlePipe implements PipeTransform {

  constructor(@Inject(LOCALE_ID) public locale: string) {

  }

  transform(operation: Operation): string {
    let datePipe = new DatePipe(this.locale);
    const date = datePipe.transform(operation.createdAt, 'd/M/Y');
    const confirmed = operation.confirmed_date !== null;
    const confirmedDate = datePipe.transform(operation.confirmed_date, 'd/M/Y');

    let ret = 'Intervento del ' + date;
    if (confirmed) {
      ret = 'Intervento del ' + date + ' - confermato il ' + confirmedDate + " da " + (operation.email_confirmed ? "E-mail" : "Web")

    }
    return ret;
  }

}
