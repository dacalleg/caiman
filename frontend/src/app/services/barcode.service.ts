import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BarcodeComponent } from '../components/barcode/barcode.component';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {

  constructor(private modalService: NgbModal) { }

  scan()
  {
    const modalRef = this.modalService.open(BarcodeComponent);
    return from(modalRef.result);
  }
}
