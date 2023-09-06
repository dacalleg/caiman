import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, map, switchMap } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-confirm-operation',
  templateUrl: './confirm-operation.component.html',
  styleUrls: ['./confirm-operation.component.scss']
})
export class ConfirmOperationComponent {
  key$: Observable<string>;

  constructor(private ActiveRoute: ActivatedRoute, private Api: ApiService)
  {
    this.key$ = this.ActiveRoute.params.pipe(
      map(p => p["key"])
    )
  }
}
