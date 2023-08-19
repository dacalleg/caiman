import { Injectable } from '@angular/core';
import { Operation, Registry, User } from '../classes/interfaces';

@Injectable({
  providedIn: 'root'
})
export class BuilderService {


  constructor() { }

  buildRegistry() {
    return {
      serial: "",
      fiscal_code: "",
      business_name: "",
      name: "",
      surname: "",
      email: "",
      address: "",
      street_number: "",
      phone: "",
      mobile: "",
      city: "",
      province: "",
      zip: "",
      country: "",
      purchase_date: new Date(),
      first_ignition_date: new Date(),
      dealer: "",
      invoice: "",
      warranty: "",
      user: "",
    } as Registry;
  }

  buildUser() {
    return {

      fiscal_code: "",
      business_name: "",
      name: "",
      surname:"",
      email:"",
      address:"",
      street_number: "",
      phone: "",
      mobile: "",
      city: "",
      province: "",
      zip: "",
      country: "",
    } as User;
  }

  buildOperation() {
    return {
      serial: "",
      user: "",
      confirmed_date: null,
      email_confirmed: false,
      web_confirmed: false,
      data: {
        type: "",
        description: "",
        replaced_components: "",
        breakdowns: [],
        condition: "",
        warranty: "",
        e_system: "",
        hp_system: "",
        se_system: "",
        li_suitability: "",
        spaces_respected: "",
        presence_ventilation_opening: "",
        vent_opening_appropriate: "",
        vent_opening_free: "",
        correct_sections: "",
        sh_section_limits: "",
        correct_slope: "",
        length_se_sections: 0,
        vs_length: 0,
        bends_45: 0,
        bends_90: 0,
        smoke_pipe_section: 0,
        chimney_section: 0,
        t_inspection: "",
        conservation_status: "",
        exhaust_duct_leaks: "",
        roof_smoke_exhaust: "",
        windproof_chimney: false,
        chimney_insulation: false,
        draught_classification: 0,
        draught_value: 0
      }
    } as Operation
  }
}
