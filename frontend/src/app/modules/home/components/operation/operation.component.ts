import { Component } from '@angular/core';

@Component({
  selector: 'app-operation',
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.scss']
})
export class OperationComponent {

  newOperation: boolean;

  constructor() {
    this.newOperation = false;
  }

  createNewOperation() {
    this.newOperation = true;
  }

  back() {
    this.newOperation = false;
  }
}
