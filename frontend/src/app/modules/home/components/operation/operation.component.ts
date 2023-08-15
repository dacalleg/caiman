import { Component } from '@angular/core';
import { Observable, filter, map, switchMap, take } from 'rxjs';
import { Operation, Project } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { StoreService } from 'src/app/services/store.service';

@Component({
  selector: 'app-operation',
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.scss']
})
export class OperationComponent {

  newOperation: boolean;
  project$: Observable<Project>;
  operations$: Observable<Operation[]>;

  constructor(private Api: ApiService, private Store: StoreService) {
    this.newOperation = false;
    this.project$ = this.Store.getProject();
    const serial$ = this.project$.pipe(
      filter(p => p.device?.info.serial != null),
      map(p => p.device!.info.serial!),
      take(1)
    );

    this.operations$ = serial$.pipe(
      switchMap(serial => this.Api.getOperations(serial))
    )
  }

  createNewOperation() {
    this.newOperation = true;
  }

  back() {
    this.newOperation = false;
  }
}
