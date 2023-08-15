import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-operation',
  templateUrl: './operation.component.html',
  styleUrls: ['./operation.component.scss']
})
export class OperationComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    //window.print();
  }

}
