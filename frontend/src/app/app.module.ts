import { APP_INITIALIZER, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FooterComponent } from './components/footer/footer.component';
import { ComponentStore } from "@ngrx/component-store";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";

import { FormsModule } from "@angular/forms";
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { JwtHelperService, JwtModule } from '@auth0/angular-jwt';
import { AlertComponent } from './components/alert/alert.component';
import { SharedModule } from './modules/shared/shared.module';
import { AuthService } from './services/auth.service';
import { environment } from 'src/environments/environment';
import { TranslationLoader } from './modules/shared/translations/translation.loader';
import { ApiService } from './services/api.service';
import { TranslationProviderService } from './services/translation-provider.service';
import { HeaderInterceptor } from './interceptors/header.interceptor';
import { TranslationService } from './services/translation.service';
import { ServiceWorkerModule } from '@angular/service-worker';
import { HeaderComponent } from './components/header/header.component';
import {Eye, EyeSlash, Search, InfoCircle, Pen, PersonCircle, Wifi, List, QuestionCircle, QrCode, X} from 'ng-bootstrap-icons/icons';
import { BootstrapIconsModule } from 'ng-bootstrap-icons';
import { ToastManagerComponent } from './components/toast-manager/toast-manager.component';
import { ToastService } from './services/toast.service';
import { AppUpdateService } from './services/app-update.service';
import {BarcodeComponent} from "./components/barcode/barcode.component";
import {ZXingScannerModule} from "@zxing/ngx-scanner";
import { firstValueFrom, tap } from 'rxjs';

const icons = {
  Eye,
  EyeSlash,
  Search,
  InfoCircle,
  Pen,
  PersonCircle,
  Wifi,
  List,
  QuestionCircle,
  QrCode,
  X
};

const jwtHelper = new JwtHelperService();

export function tokenGetter() {
  const token = localStorage.getItem("access_token");
  if (!token || jwtHelper.isTokenExpired(token)) {
    return null;
  }
  return token;
}

export const initializeAppUpdates = (appUpdateService: AppUpdateService): (() => Promise<void>) => {
  return () => appUpdateService.initialize();
};

export const initializeTranslations = (
  provider: TranslationProviderService,
  translation: TranslationService
): (() => Promise<void>) => {
  return () => firstValueFrom(
    provider.getAvailableLanguages().pipe(
      tap(languages => translation.initialize(languages))
    )
  ).then(() => undefined);
};

@NgModule({
  declarations: [
    AppComponent,
    FooterComponent,
    DashboardComponent,
    AlertComponent,
    HeaderComponent,
    ToastManagerComponent,
    BarcodeComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    SharedModule,
    FormsModule,
    HttpClientModule,
    ZXingScannerModule,
    BootstrapIconsModule.pick(icons),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useClass: TranslationLoader,
        deps: [TranslationProviderService]
      }
    }),
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: [environment.host],
        disallowedRoutes: [
          //wp-content\/uploads\/.*/,
          /wp-json\/jwt-auth\/v1\/token/,
          /wp-json\/wp\/v2\/translation/,
          /wp-json\/caiman\/v1\/forgot-password/,
          /wp-json\/caiman\/v1\/info/],
      },
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),

  ],
  providers: [
    AuthService,
    ComponentStore,
    ApiService,
    TranslationProviderService,
    TranslationService,
    ToastService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HeaderInterceptor,
      multi: true
    },
    { provide: APP_INITIALIZER, useFactory: initializeAppUpdates, multi: true, deps: [AppUpdateService] },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslations,
      multi: true,
      deps: [TranslationProviderService, TranslationService]
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
