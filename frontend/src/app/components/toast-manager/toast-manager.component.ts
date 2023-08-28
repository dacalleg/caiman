import { Component } from '@angular/core';
import { Toast } from 'src/app/classes/interfaces';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-toast-manager',
  templateUrl: './toast-manager.component.html',
  styleUrls: ['./toast-manager.component.scss']
})
export class ToastManagerComponent {
  toasts: Toast[];

  constructor(private ToastManager: ToastService) {
    this.toasts = [];
    this.ToastManager.getToast().subscribe(toast => {
      this.toasts.push(toast);
    })
  }

  ngOnInit(): void {
  }

  remove(toast: Toast) {
    this.toasts.filter(item => item.id !== toast.id);
  }
}
