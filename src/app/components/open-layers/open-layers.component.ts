import {Component, OnInit} from '@angular/core';
import Map from "ol/Map";
/*import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import {fromLonLat} from "ol/proj";
import VectorSource from "ol/source/Vector";
import * as hungary from "../../geojson/hungary.json";
import VectorLayer from "ol/layer/Vector";
import {GeoJSON} from "ol/format";*/

@Component({
  selector: 'app-open-layers',
  templateUrl: './open-layers.component.html',
  styleUrls: ['./open-layers.component.scss']
})
export class OpenLayersComponent implements OnInit {
  map?: Map;

  ngOnInit() {
/*    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(hungary),
    });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });


    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([19.503304, 47.162495]),
        zoom: 7,
      }),
    });*/
  }
}
