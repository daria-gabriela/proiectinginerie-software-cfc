import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { LucideAngularModule } from 'lucide-angular';
import { MatNativeDateModule } from '@angular/material/core';
import {
  BookOpen,
  ChevronLeft,
  ChevronDown,
  Plus,
  Search,
  LogOut,
  Link,
  Upload,
  Download,
  Trash2,
  Settings,
  FileText,
  Folder,
  Users,
  Lightbulb,
  X,
  Check,
  Mail,
  Lock,
  User,
  Sun,
  Moon,
  Loader2,
  Eye,
  UserPlus,
  ArrowRight,
  Archive,
  MessageCircle,
  Send,
  Smile,
  Paperclip,
  Calendar,
  Brain,
  CheckCircle,
  AlertCircle,
  FileType,
  Info,
  AlertTriangle
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    importProvidersFrom(
      MatNativeDateModule,
      LucideAngularModule.pick({
        BookOpen,
        ChevronLeft,
        ChevronDown,
        Plus,
        Search,
        LogOut,
        Link,
        Upload,
        Download,
        Trash2,
        Settings,
        FileText,
        Folder,
        Users,
        Lightbulb,
        X,
        Check,
        Mail,
        Lock,
        User,
        Sun,
        Moon,
        Loader2,
        Eye,
        UserPlus,
        ArrowRight,
        Archive,
        MessageCircle,
        Send,
        Smile,
        Paperclip,
        Calendar,
        Brain,
        CheckCircle,
        AlertCircle,
        FileType,
        Info,
        AlertTriangle
      })
    ),
  ]
};
