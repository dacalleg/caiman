import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

@Pipe({
  name: 'attachmentUrl'
})
export class AttachmentUrlPipe implements PipeTransform {

  constructor(private Api: ApiService) {

  }

  transform(id: number|string): Observable<string> {
    return this.Api.getAttachmentUrl(id);
  }

}
