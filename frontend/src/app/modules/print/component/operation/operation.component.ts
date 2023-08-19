import { AfterViewInit, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, filter, switchMap } from 'rxjs';
import { Operation } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-operation',
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.scss']
})
export class OperationComponent implements AfterViewInit {

  operation$: Observable<Operation>;

  constructor(private ActivatedRoute: ActivatedRoute, private Api: ApiService)
  {
    this.operation$ = this.ActivatedRoute.params.pipe(
      filter(params => params["key"] != null),
      switchMap(params => this.Api.getOperationByKey(params['key']))
    )
  }

  ngAfterViewInit(): void {
    //window.print();
  }

}
