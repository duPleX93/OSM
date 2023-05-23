import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { LeafletComponent } from './components/leaflet/leaflet.component';
import {LeafletModule} from "@asymmetrik/ngx-leaflet";
import { OpenLayersComponent } from './components/open-layers/open-layers.component';
import {HttpClientModule} from "@angular/common/http";
import {LeafletService} from "./api/leaflet.service";

@NgModule({
  declarations: [
    AppComponent,
    LeafletComponent,
    OpenLayersComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    LeafletModule
  ],
  providers: [LeafletService],
  bootstrap: [AppComponent]
})
export class AppModule { }
