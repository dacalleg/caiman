import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Observable, filter, map, switchMap, take, tap } from 'rxjs';
import { Operation, Project, Registry, User } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { BuilderService } from 'src/app/services/builder.service';
import { StoreService } from 'src/app/services/store.service';

@Component({
  selector: 'app-operation-form',
  templateUrl: './operation-form.component.html',
  styleUrls: ['./operation-form.component.scss']
})
export class OperationFormComponent {
  @ViewChild("myForm") myForm: NgForm|undefined;
  operation: Operation;
  submitted:boolean;
  project$: Observable<Project>;
  user$: Observable<User>;
  registry$: Observable<Registry | null>;

  constructor(private Api: ApiService, private Builder: BuilderService, private Store: StoreService, private Auth: AuthService)
  {
    this.submitted = false;
    this.operation = this.Builder.buildOperation();
    this.project$ = this.Store.getProject();
    this.user$ = this.Auth.getUserData().pipe(map(user => user.fields))
    const serial$ = this.project$.pipe(
      filter(p => p.device?.info.serial != null),
      map(p => p.device!.info.serial!),
      take(1),
      tap(i => console.log(i))
    );
    this.registry$ = serial$.pipe(switchMap(serial => this.Api.getLastRegisry(serial)));
    serial$.subscribe(serial => this.operation.serial = serial);
  }

  onSubmit() {
    this.submitted = true;
    this.Api.updateOperation(this.operation).subscribe();
    /*if(this.myForm?.form.valid)
    {

    }*/
  }
}
