import { Injectable } from '@angular/core';
import * as L from "leaflet";
import {HttpClient} from "@angular/common/http";
import {map, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class LeafletService {

  constructor(private http: HttpClient) { }

  getGeoJsonPath(fileName: string): string {
    return `/assets/geojson/${fileName}.json`;
  }

  getCountryBorder(): Observable<any> {
    return this.http.get(this.getGeoJsonPath('hungary')).pipe(
      // Should replace lat-lng values because Leaflet uses lat-lng but GeoJSON uses lng-lat format.
      map((res: any) => L.GeoJSON.coordsToLatLngs(res.features[0].geometry.coordinates[0])));
  }

  getWaters(leafletMap: L.Map): Observable<any> {
    const polygonOptions = {
      weight: 2,
      opacity: 1,
      color: 'blue',  //Outline color
      fillOpacity: 0
    }
    return this.http.get(this.getGeoJsonPath('waters')).pipe(
      map((res: any) => {
        let coords: any[] = [];

        res.features.forEach((feature: any) => {
          console.log({feature})
          feature.geometry?.coordinates[0].forEach((coord: any) => {
            console.log({coord})
            coords.push([coord[1], coord[0]]);
          })
          L.polygon(coords, polygonOptions).addTo(leafletMap);
          coords = [];
        })
      })
    );
  }

  getCounties(leafletMap: L.Map): Observable<any> {
    const polygonOptions = {
      weight: 2,
      opacity: 1,
      color: '#293841',  //Outline color
      fillOpacity: 0
    }
    return this.http.get(this.getGeoJsonPath('counties')).pipe(
      map((res: any) => {
        let coords: any[] = [];

        res.features.forEach((feature: any) => {
          feature.geometry?.coordinates[0].forEach((coord: any) => {
            coords.push([coord[1], coord[0]]);
          })
          L.polygon(coords, polygonOptions).addTo(leafletMap);
          coords = [];
        })
      })
    );
  }

  getRegions(leafletMap: L.Map): Observable<any> {
    const polygonOptions = {
      weight: 2,
      opacity: 1,
      color: 'green',  //Outline color
      fillOpacity: 0
    }
    return this.http.get(this.getGeoJsonPath('region')).pipe(
      map((res: any) => {
        let coords: any[] = [];
        res.features.forEach((feature: any) => {
          feature.geometry?.coordinates[0].forEach((coord: any) => {
            coords.push([coord[1], coord[0]]);
          })
          L.polygon(coords, polygonOptions).addTo(leafletMap);
          coords = [];
        })
      })
    );
  }

  getCustomPolygon(name: string): Observable<any> {
    return this.http.get(this.getGeoJsonPath(name)).pipe(
      // Should replace lat-lng values because Leaflet uses lat-lng but GeoJSON uses lng-lat format.
      map((res: any) => L.GeoJSON.coordsToLatLngs(res.features[0].geometry.coordinates[0])));
  }
}
