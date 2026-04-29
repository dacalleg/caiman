import { Component } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-license-input',
  templateUrl: './license-input.component.html',
  styleUrls: ['./license-input.component.scss']
})
export class LicenseInputComponent {

  licenseCode: string | undefined;

  constructor(private Api: ApiService)
  {

  }

  ransom() {
    if(this.licenseCode)
    {
      this.Api.ransomOrder(this.licenseCode).subscribe({
        complete: () => {
          window.location.href = window.location.origin
        },
        error: (err) => {
          console.log(err.error.message);
        }
      })
    }
  }
}
