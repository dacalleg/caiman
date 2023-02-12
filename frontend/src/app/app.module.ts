import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FooterComponent } from './components/footer/footer.component';
import { ComponentStore } from "@ngrx/component-store";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";

import { FormsModule } from "@angular/forms";
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { JwtModule } from '@auth0/angular-jwt';
import { AlertComponent } from './components/alert/alert.component';
import { SharedModule } from './modules/shared/shared.module';
import { AuthService } from './services/auth.service';
import { environment } from 'src/environments/environment';
import { TranslationLoader } from './modules/shared/translations/translation.loader';
import { ApiService } from './services/api.service';
import { TranslationProviderService } from './services/translation-provider.service';

export function tokenGetter() {
  return localStorage.getItem("access_token");
}

@NgModule({
  declarations: [
    AppComponent,
    FooterComponent,
    DashboardComponent,
    AlertComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    SharedModule,
    FormsModule,
    HttpClientModule,
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
        disallowedRoutes: [/backend\/wp-content\/uploads\/.*/, /backend\/wp-json\/jwt-auth\/v1\/token/, /backend\/wp-json\/wp\/v2\/translation/],
      },
    }),
  ],
  providers: [
    AuthService,
    ComponentStore,
    ApiService,
    TranslationProviderService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
