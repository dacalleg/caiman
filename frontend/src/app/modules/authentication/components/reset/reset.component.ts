import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss']
})
export class ResetComponent {
  email: string;
  error: string|null = null;
  finish: boolean = false;

  constructor(private authService: AuthService) {
    this.email = "";
  }

  reset()
  {
    this.authService.requestResetPassword(this.email).subscribe({
      error: (error) => {
        this.error = error.error.message;
      },
      complete: () => {
        this.finish = true;
      }
    });
  }
}
