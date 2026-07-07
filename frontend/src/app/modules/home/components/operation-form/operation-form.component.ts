import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Observable, filter, map, switchMap, take, tap } from 'rxjs';
import { Failure, Operation, Project, Registry, User } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { BuilderService } from 'src/app/services/builder.service';
import { StoreService } from 'src/app/services/store.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-operation-form',
  templateUrl: './operation-form.component.html',
  styleUrls: ['./operation-form.component.scss']
})
export class OperationFormComponent {

  @ViewChild("myForm") myForm: NgForm | undefined;
  @Output() submitted: EventEmitter<void>;
  operation: Operation;
  project$: Observable<Project>;
  user$: Observable<User>;
  registry$: Observable<Registry | null>;
  failures$: Observable<Failure[]>

  constructor(
    private Api: ApiService,
    private Builder: BuilderService,
    private Store: StoreService,
    private Auth: AuthService,
    private Toast: ToastService
  ) {
    this.submitted = new EventEmitter();
    this.operation = this.Builder.buildOperation();
    this.Auth.getUserData().pipe(take(1)).subscribe(data => this.operation.data.service = data.fields);
    this.project$ = this.Store.getProject();
    this.failures$ = this.Api.getFailures();
    this.user$ = this.Auth.getUserData().pipe(take(1), map(user => user.fields))
    const serial$ = this.project$.pipe(
      filter(p => p.device?.serial != null),
      map(p => p.device!.serial),
      take(1),
      tap(i => console.log(i))
    );
    this.registry$ = serial$.pipe(switchMap(serial => this.Api.getLastRegisry(serial)));
    serial$.subscribe(serial => this.operation.serial = serial);
  }

  onSubmit() {
    if (this.myForm?.form.valid) {
      this.Api.updateOperation(this.operation).subscribe(() => {
        this.submitted.next();
        this.Toast.addSuccessToast("Intervento registrato con successo")
      });
    }
  }

  onFailureChange(key: string) {
    if (this.operation.data.breakdowns.includes(key))
      this.operation.data.breakdowns = this.operation.data.breakdowns.filter(k => k !== key)
    else
      this.operation.data.breakdowns = this.operation.data.breakdowns.concat(key);
  }
}
