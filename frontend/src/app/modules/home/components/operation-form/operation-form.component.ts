import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Operation } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { BuilderService } from 'src/app/services/builder.service';

@Component({
  selector: 'app-operation-form',
  templateUrl: './operation-form.component.html',
  styleUrls: ['./operation-form.component.scss']
})
export class OperationFormComponent {
  @ViewChild("myForm") myForm: NgForm|undefined;
  operation: Operation;
  submitted:boolean;

  constructor(private Api: ApiService, private Builder: BuilderService)
  {
    this.submitted = false;
    this.operation = this.Builder.buildOperation();
  }

  onSubmit() {
    this.submitted = true;
    if(this.myForm?.form.valid)
    {

    }
  }
}
