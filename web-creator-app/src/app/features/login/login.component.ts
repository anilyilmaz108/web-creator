import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MockAuthService } from '../../core/services/mock-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly auth = inject(MockAuthService);
  private readonly router = inject(Router);

  email = 'admin@webcreator.dev';
  password = 'Admin123!';
  readonly errorMessage = signal('');

  readonly demoAccounts = [
    { role: 'Superadmin', email: 'owner@webcreator.dev', password: 'Owner123!' },
    { role: 'Admin', email: 'admin@webcreator.dev', password: 'Admin123!' },
    { role: 'Moderator', email: 'moderator@webcreator.dev', password: 'Mod123!' }
  ];

  submit(): void {
    const success = this.auth.login(this.email, this.password);
    if (!success) {
      this.errorMessage.set('E-posta veya sifre hatali.');
      return;
    }

    this.router.navigateByUrl('/dashboard');
  }

  fill(email: string, password: string): void {
    this.email = email;
    this.password = password;
  }
}
