import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly STORAGE_KEY = 'studysync-theme';

    // Signal to track dark mode state
    isDarkMode = signal(this.getInitialTheme());

    constructor() {
        // Apply theme changes reactively
        effect(() => {
            this.applyTheme(this.isDarkMode());
        });
    }

    private getInitialTheme(): boolean {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored !== null) {
            return stored === 'dark';
        }
        // Default to system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    private applyTheme(isDark: boolean): void {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem(this.STORAGE_KEY, isDark ? 'dark' : 'light');
    }

    toggleTheme(): void {
        this.isDarkMode.update(current => !current);
    }

    setDarkMode(isDark: boolean): void {
        this.isDarkMode.set(isDark);
    }
}
