import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FileMinus } from 'ng-bootstrap-icons/icons';
import { concatMap, ignoreElements, last, lastValueFrom, map, Observable, of, Subject, switchMap, tap } from 'rxjs';
import { OptimizationInput, OptimizationOutput, Variable } from 'src/app/classes/interfaces';
import { Optimization } from 'src/app/classes/optimization';
import struct from 'src/app/classes/struct';
import { DeviceService } from 'src/app/services/device.service';
import { ModalService } from 'src/app/services/modal.service';
import { StoreService } from 'src/app/services/store.service';


@Component({
  selector: 'app-optimization',
  templateUrl: './optimization.component.html',
  styleUrls: ['./optimization.component.scss']
})
export class OptimizationComponent implements OnInit {

  @ViewChild('content') content: any;
  variables$: Observable<Variable[]>;
  destroy$: Subject<void>;
  modal: NgbModalRef | null;
  inputs: OptimizationInput[];
  output: OptimizationOutput;

  constructor(
    private NgbModal: NgbModal,
    private modalService: ModalService,
    private Store: StoreService,
    private Device: DeviceService) {
    this.inputs = [];
    this.output = { variable: null, target: 0 };
    this.variables$ = this.Store.getVariables();
    this.destroy$ = new Subject<void>();
    this.modal = null;
    this.modalService.getOptimizationModal().subscribe(() => {
      this.modal = this.NgbModal.open(this.content, { ariaLabelledBy: 'modal-basic-title' });
      this.modal.result.then((result) => {
      }, (reason) => {
      });
    })
  }

  async runOptimization() {
    /*let optim = new Optimization();
    const typePipe = new TypePipe();
    let obj = async (X: number[]) => {
      let i = 0;
      console.log(X);
      let obs$ = of(...X).pipe(
        map(value => {
          const s = struct(this.inputs[i].variable?.pattern);
          const type = typePipe.transform(this.inputs[i].variable);
          if (type === "string")
            return s.pack(value);
          else
            return s.pack(+value);
        }),
        concatMap(value => this.Device.write(this.inputs[i].variable!, new Uint8Array(value)).pipe(
          tap(() => i = i + 1)
        )
        ),
        last(),
        switchMap(() => this.Device.read(this.output.variable!).pipe(
          map(value => Math.abs(value as number - this.output.target))
        ) as Observable<number>)
      )
      return lastValueFrom(obs$);
    }

    let solution = await optim.nelderMead(obj, this.inputs.map(item => item.from), { minErrorDelta: 0.001, zeroDelta: 1 });
    console.log("solution is at " + JSON.stringify(solution));*/
  }


  ngOnInit(): void {
  }


  addInput() {
    this.inputs.push({
      variable: null,
      from: 0,
      to: 0
    } as OptimizationInput)
  }
}
