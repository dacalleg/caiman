import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, map, merge, of, shareReplay, switchMap, take } from 'rxjs';
import { Operation } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-confirm-operation',
  templateUrl: './confirm-operation.component.html',
  styleUrls: ['./confirm-operation.component.scss']
})
export class ConfirmOperationComponent {

  key$: Observable<string>;
  operation$: Observable<Operation>;
  reload$: Subject<void>;

  constructor(private ActiveRoute: ActivatedRoute, private Api: ApiService, private Toast: ToastService) {
    this.reload$ = new Subject<void>();
    this.key$ = this.ActiveRoute.params.pipe(
      map(p => p["key"])
    )

    this.operation$ = this.key$.pipe(
      switchMap(key => merge(of(void 0), this.reload$).pipe(map(() => key))),
      switchMap(key => this.Api.getOperationByKey(key)),
      shareReplay(1)
    )
  }

  confirm() {
    this.operation$.pipe(
      take(1),
      switchMap(op => this.Api.confirmOperation(op.key!, op.data.registry!.email))
    ).subscribe(() => {
      this.Toast.addSuccessToast("Il report è stato confermato!");
      this.reload$.next();
    });

  }
}
