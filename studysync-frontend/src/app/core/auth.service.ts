import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { firstValueFrom } from 'rxjs';

interface JwtPayload {
  userId: string;
  role: string;
  sub: string;
  exp: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'studysync_token';
  
  private _token = signal<string | null>(null);
  private _user = signal<User | null>(null);
  
  token = this._token.asReadonly();
  user = this._user.asReadonly();
  isAuthenticated = computed(() => !!this._token());
  
  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
  }
  
  private loadFromStorage() {
    const token = localStorage.getItem(this.tokenKey);
    if (token && !this.isExpired(token)) {
      this._token.set(token);
      this.setUserFromToken(token);
    } else {
      this.logout();
    }
  }
  
  private isExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  
  private setUserFromToken(token: string) {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      this._user.set({
        id: decoded.userId,
        email: decoded.sub,
        firstName: '',
        lastName: '',
        role: decoded.role,
      });
    } catch {
      this._user.set(null);
    }
  }
  
  async login(email: string, password: string): Promise<void> {
    const token = await firstValueFrom(
      this.http.post('/api/auth/login', { email, password }, { responseType: 'text' })
    );
    
    localStorage.setItem(this.tokenKey, token);
    this._token.set(token);
    this.setUserFromToken(token);
  }
  
  async register(email: string, password: string, firstName: string, lastName: string): Promise<void> {
    const token = await firstValueFrom(
      this.http.post('/api/auth/register', { email, password, firstName, lastName }, { responseType: 'text' })
    );
    
    localStorage.setItem(this.tokenKey, token);
    this._token.set(token);
    this.setUserFromToken(token);
  }
  
  logout() {
    localStorage.removeItem(this.tokenKey);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
