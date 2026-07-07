import { Component } from '@angular/core';
import { Observable, Subject, filter, map, merge, of, shareReplay, switchMap, take } from 'rxjs';
import { Operation, Project, Registry } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { StoreService } from 'src/app/services/store.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-operation',
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.scss']
})
export class OperationComponent {


  newOperation: boolean;
  project$: Observable<Project>;
  operations$: Observable<Operation[]>;
  registry$: Observable<Registry | null>;
  reloadOperation$: Subject<void>;

  constructor(private Api: ApiService, private Store: StoreService, private Toast: ToastService) {
    this.reloadOperation$ = new Subject();
    this.newOperation = false;
    this.project$ = this.Store.getProject();
    const serial$ = this.project$.pipe(
      filter(p => p.device?.serial != null),
      map(p => p.device!.serial),
      take(1)
    );

    this.operations$ = serial$.pipe(
      switchMap(serial => merge(of(void 0), this.reloadOperation$).pipe(map(() => serial))),
      switchMap(serial => this.Api.getOperations(serial))
    )

    this.registry$ = serial$.pipe(
      switchMap(serial => this.Api.getLastRegisry(serial)),
      shareReplay(1)
    )
  }

  createNewOperation() {
    this.newOperation = true;
  }

  back() {
    this.newOperation = false;
  }

  onOperationSubmitted() {
    this.newOperation = false;
  }

  confirmOperation(operation: Operation) {
    this.Api.confirmOperation(operation.key!).subscribe(() => {
      this.Toast.addSuccessToast("op.confirmed");
      this.reloadOperation$.next();
    }
    )
  }
}
