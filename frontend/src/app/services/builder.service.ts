import { Injectable } from '@angular/core';
import { Registry } from '../classes/interfaces';

@Injectable({
  providedIn: 'root'
})
export class BuilderService {

  constructor() { }

  buildRegistry()
  {
    return {
      serial: "",
      fiscal_code: "",
      business_name: "",
      name: "",
      surname: "",
      email: "",
      address: "",
      street_number:  "",
      phone:  "",
      mobile:  "",
      city:  "",
      province:  "",
      zip:  "",
      country:  "",
      purchase_date: new Date(),
      first_ignition_date: new Date(),
      dealer: "",
      invoice: "",
      warranty: "",
      user: "",
    } as Registry;
  }
}
