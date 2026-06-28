import { Injectable, computed, signal } from '@angular/core';

import { demoUsers } from '../data/demo-data';
import { UserProfile, UserRole } from '../models/auth.models';

const USERS_KEY = 'web-creator-users';
const SESSION_KEY = 'web-creator-session';

@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private readonly usersSignal = signal<UserProfile[]>(this.loadUsers());
  private readonly sessionUserId = signal<string | null>(this.loadSessionUserId());

  readonly users = computed(() => this.usersSignal());
  readonly currentUser = computed(
    () => this.usersSignal().find((user) => user.id === this.sessionUserId()) ?? null
  );
  readonly isAuthenticated = computed(() => !!this.currentUser());

  login(email: string, password: string): boolean {
    const user = this.usersSignal().find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );

    if (!user) {
      return false;
    }

    this.sessionUserId.set(user.id);
    this.persistSession(user.id);
    return true;
  }

  logout(): void {
    this.sessionUserId.set(null);
    this.persistSession(null);
  }

  createUser(payload: Pick<UserProfile, 'name' | 'email' | 'password' | 'role'>): void {
    const nextUser: UserProfile = {
      id: `user-${crypto.randomUUID()}`,
      ...payload
    };
    const nextUsers = [...this.usersSignal(), nextUser];
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);
  }

  startGuestCreatorSession(name = 'Public Creator'): UserProfile {
    const email = `creator-${crypto.randomUUID()}@public.webcreator.local`;
    const user: UserProfile = {
      id: `user-${crypto.randomUUID()}`,
      name,
      email,
      password: '',
      role: 'visitor'
    };

    const nextUsers = [...this.usersSignal(), user];
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);
    this.sessionUserId.set(user.id);
    this.persistSession(user.id);
    return user;
  }

  updateUserRole(userId: string, role: UserRole): void {
    const nextUsers = this.usersSignal().map((user) => (user.id === userId ? { ...user, role } : user));
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);
  }

  private loadUsers(): UserProfile[] {
    const raw = globalThis.localStorage?.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as UserProfile[]) : demoUsers;
  }

  private loadSessionUserId(): string | null {
    return globalThis.localStorage?.getItem(SESSION_KEY) ?? 'user-admin';
  }

  private persistUsers(users: UserProfile[]): void {
    globalThis.localStorage?.setItem(USERS_KEY, JSON.stringify(users));
  }

  private persistSession(userId: string | null): void {
    if (userId) {
      globalThis.localStorage?.setItem(SESSION_KEY, userId);
      return;
    }

    globalThis.localStorage?.removeItem(SESSION_KEY);
  }
}
