export type UserRole = 'superadmin' | 'admin' | 'moderator' | 'visitor';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
