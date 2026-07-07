import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  currentPassword = '';
  password = '';
  repeatPassword = '';
  errorCode: string | null = null;
  submitting = false;

  constructor(
    private Auth: AuthService,
    private Toast: ToastService,
    private Router: Router
  ) {}

  onSubmit() {
    const validationError = this.validatePasswords();
    if (validationError) {
      this.errorCode = validationError;
      return;
    }

    this.errorCode = null;
    this.submitting = true;

    this.Auth.changePassword(this.currentPassword, this.password).subscribe({
      next: () => {
        this.Toast.addSuccessToast('profile.change_password.success');
        this.Router.navigate(['/dashboard/profile']);
      },
      error: (error) => {
        this.errorCode = error.error?.error_code ?? 'generic';
        this.submitting = false;
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  private validatePasswords(): string | null {
    if (!this.currentPassword)
      return 'invalid_password';
    if (this.password.length < 8)
      return 'password_short';
    if (this.password !== this.repeatPassword)
      return 'password_not_match';
    return null;
  }
}
