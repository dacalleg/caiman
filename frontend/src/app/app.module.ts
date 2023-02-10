import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FooterComponent } from './components/footer/footer.component';
import { ComponentStore } from "@ngrx/component-store";

import { FormsModule } from "@angular/forms";
import { HttpClientModule } from '@angular/common/http';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { JwtModule } from '@auth0/angular-jwt';
import { AlertComponent } from './components/alert/alert.component';
import { SharedModule } from './modules/shared/shared.module';
import { AuthService } from './services/auth.service';
import { environment } from 'src/environments/environment';

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
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: [environment.host],
        disallowedRoutes: [/backend\/wp-content\/uploads\/.*/, /backend\/wp-json\/jwt-auth\/v1\/token/],
      },
    }),
  ],
  providers: [
    AuthService,
    ComponentStore,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
