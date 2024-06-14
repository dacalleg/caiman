import { Component } from '@angular/core';

@Component({
  selector: 'app-license-input',
  templateUrl: './license-input.component.html',
  styleUrls: ['./license-input.component.scss']
})
export class LicenseInputComponent {
  licenseCode: string|undefined;

}
