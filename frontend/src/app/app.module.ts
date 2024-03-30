import { APP_INITIALIZER, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FooterComponent } from './components/footer/footer.component';
import { ComponentStore } from "@ngrx/component-store";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";

import { FormsModule } from "@angular/forms";
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { JwtModule } from '@auth0/angular-jwt';
import { AlertComponent } from './components/alert/alert.component';
import { SharedModule } from './modules/shared/shared.module';
import { AuthService } from './services/auth.service';
import { environment } from 'src/environments/environment';
import { TranslationLoader } from './modules/shared/translations/translation.loader';
import { ApiService } from './services/api.service';
import { TranslationProviderService } from './services/translation-provider.service';
import { HeaderInterceptor } from './interceptors/header.interceptor';
import { TranslationService } from './services/translation.service';
import { ServiceWorkerModule, SwUpdate } from '@angular/service-worker';
import { filter, from } from 'rxjs';
import { HeaderComponent } from './components/header/header.component';
import {Eye, EyeSlash, Search, InfoCircle, Pen, PersonCircle, Wifi, List, QuestionCircle, QrCode} from 'ng-bootstrap-icons/icons';
import { BootstrapIconsModule } from 'ng-bootstrap-icons';
import { ToastManagerComponent } from './components/toast-manager/toast-manager.component';
import { ToastService } from './services/toast.service';
import {BarcodeComponent} from "./components/barcode/barcode.component";
import { NgxScannerQrcodeModule, LOAD_WASM } from 'ngx-scanner-qrcode';

LOAD_WASM().subscribe();


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
  QrCode
};

export function tokenGetter() {
  return localStorage.getItem("access_token");
}

export const checkForUpdates = (swUpdate: SwUpdate): (() => Promise<any>) => {
  return (): Promise<void> =>
    new Promise((resolve) => {
      swUpdate.checkForUpdate();

      from(swUpdate.activateUpdate())
        .pipe(filter(value => value === true))
        .subscribe(() => {
          window.location.reload();
      });

      resolve();
    });
};

@NgModule({
  declarations: [
    AppComponent,
    FooterComponent,
    DashboardComponent,
    AlertComponent,
    HeaderComponent,
    ToastManagerComponent,
    BarcodeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    SharedModule,
    FormsModule,
    HttpClientModule,
    NgxScannerQrcodeModule,
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
          /backend\/wp-content\/uploads\/.*/,
          /backend\/wp-json\/jwt-auth\/v1\/token/,
          /backend\/wp-json\/wp\/v2\/translation/,
          /backend\/wp-json\/caiman\/v1\/forgot-password/,
          /backend\/wp-json\/caiman\/v1\/info/],
      },
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
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
    { provide: APP_INITIALIZER, useFactory: checkForUpdates, multi: true, deps: [SwUpdate] },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
