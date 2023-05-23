import { AfterViewInit, Component} from '@angular/core';
import * as L from 'leaflet';
import {LeafletService} from "../../api/leaflet.service";


@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.scss']
})
export class LeafletComponent implements AfterViewInit {
  map: any;

  options: L.MapOptions = {
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
    zoom: 7,
    center: L.latLng(47.162495, 19.503304)
  };

  constructor(private leafletService: LeafletService) {
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.drawCounties();
    this.drawCountryBorder();
    //this.drawWaters();
    this.drawRegions();
    this.drawCustomPolygon('test1', '#ffc800');
    this.drawCustomPolygon('test2', '#eb7100');
    this.drawMarkers();
  }

  initMap(): void {
    this.map = L.map('map', {
      center: [ 47.162495, 19.503304 ],
      zoom: 8
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 8,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    tiles.addTo(this.map);

    // Bounce thingy that holds you at the correct place of the map
    this.map.setMaxBounds(this.map.getBounds());


    /*    /!*BORDER*!/
        for (const c of HungaryGeoJson) {
          const lon = c.geometry.coordinates[0];
          const lat = c.geometry.coordinates[1];
          const marker = L.marker([lat, lon]);

          marker.addTo(map);
        }*/
  }

  drawCountryBorder(): void {
    this.leafletService.getCountryBorder().subscribe(coords => {
      const polygonOptions = {
        weight: 2,
        opacity: 1,
        color: '#1A2E3A',  //Outline color
        fillColor: 'red',
        fillOpacity: 0.4,
      }
      L.polygon(coords, polygonOptions).addTo(this.map);
      //this.map.fitBounds(polygon.getBounds());  //- zoom to polygon
    });
  }

  drawWaters(): void {
    this.leafletService.getWaters(this.map).subscribe(coords => {
      /*const polygonOptions = {
        weight: 2,
        opacity: 1,
        color: 'red',  //Outline color
        fillOpacity: 0
      }
      L.polygon(coords, polygonOptions).addTo(this.map);*/
    });
  }

  drawCounties(): void {
    this.leafletService.getCounties(this.map).subscribe(coords => {
/*      const polygonOptions = {
        weight: 2,
        opacity: 1,
        color: 'red',  //Outline color
        fillOpacity: 0
      }
      L.polygon(coords, polygonOptions).addTo(this.map);*/
      //this.map.fitBounds(polygon.getBounds());  //- zoom to polygon
    });
  }

  drawRegions(): void {
    this.leafletService.getRegions(this.map).subscribe(coords => {
      /*      const polygonOptions = {
              weight: 2,
              opacity: 1,
              color: 'red',  //Outline color
              fillOpacity: 0
            }
            L.polygon(coords, polygonOptions).addTo(this.map);*/
      //this.map.fitBounds(polygon.getBounds());  //- zoom to polygon
    });
  }

  drawMarkers(): void {
    /*const customIcon = L.icon({
      iconUrl: 'my-icon.png',
      iconSize: [38, 95],
      iconAnchor: [22, 94],
      popupAnchor: [-3, -76],
      shadowUrl: 'my-icon-shadow.png',
      shadowSize: [68, 95],
      shadowAnchor: [22, 94]
    });*/

    const customHtmlIcon = (temp: number) => L.divIcon({
      className: 'my-div-icon',
      html: `<span class="temperature">${temp}°C</span>`
    });

    // Kaposvár
    L.marker([46.359360, 17.796764], {icon: customHtmlIcon(35)}).addTo(this.map);
    // Kaposvár mellett
    L.marker([46.359360, 17.9], {icon: customHtmlIcon(12)}).addTo(this.map);
    // Budapest
    L.marker([47.497913, 19.040236]).addTo(this.map);
  }

  drawCustomPolygon(area: string, fillColor: string): void {
    this.leafletService.getCustomPolygon(area).subscribe(coords => {
      const polygonOptions = {
        opacity: 0,
        fillColor,
        fillOpacity: 0.4,
      }
      L.polygon(coords, polygonOptions).addTo(this.map);
      //this.map.fitBounds(polygon.getBounds());  //- zoom to polygon
    });
  }
}
