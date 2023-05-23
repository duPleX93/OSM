import { fromLonLat } from 'ol/proj';
import View from 'ol/View';
import Map from 'ol/Map';
import Overlay from 'ol/Overlay';
import Control from 'ol/control/Control';
import ZoomControl from 'ol/control/Zoom';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSMSrc from 'ol/source/OSM';
import ImageStaticSrc from 'ol/source/ImageStatic';
import {defaults as defaultInteractions} from "ol/interaction.js";

import mapTypeService from './map-type-service';

const getExtent = (containerId) => containerId === 'forecast-maps'
  ? [1711960.2710301823, 5718704.748758833, 2629499.8699074867, 6292451.594706924]
  : [1711960.2710301823, 5691853.461419132, 2629499.8699074867, 6264660.325289678];

// function applies greyscale to every pixel in canvas
const greyscale = (context) => {
  const canvas = context.canvas;
  const width = canvas.width;
  const height = canvas.height;

  let imageData;
  try {
    imageData = context.getImageData(0, 0, width, height);
  } catch (e) {
    console.log(e);
    return;
  }

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // CIE luminance for the RGB
    let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Show white color instead of black color while loading new tiles:
    if (v === 0.0) {
      v = 255.0;
    }
    data[i + 0] = v; // Red
    data[i + 1] = v; // Green
    data[i + 2] = v; // Blue
    data[i + 3] = 255; // Alpha
  }
  context.putImageData(imageData, 0, 0);
};

// Create color range bar item
const createPaletteBoundItem = (color) => $('<div />')
  .addClass('bar-bound')
  .css('background-color', color);

const showCounterUnit = (counterUnits, key) => {
  if (Array.isArray(counterUnits)) return counterUnits.indexOf(key) !== -1;

  if (typeof counterUnits === 'number') return key % counterUnits === 0;

  return false;
};

const createPaletteItems = (counterUnits) => (items, obj, ind, palette) => {
  const newItems = [];

  if (ind === 0) {
    newItems.push(createPaletteBoundItem(obj.value));
  }

  if (showCounterUnit(counterUnits, obj.key)) {
    const $num = $('<div />').addClass('number');
    //$num.attr('data-value', obj.key);
    const $val = $('<span />').text(obj.key);
    $num.append($val);

    newItems.push($num);
  }

  const nextObj = palette[ind + 1];
  if (nextObj) {
    const $bar = $('<div />')
      .addClass('bar')
      .css('backgroundImage', `linear-gradient(90deg, ${obj.value}, ${nextObj.value})`);

    newItems.push($bar);
  } else {
    newItems.push(createPaletteBoundItem(obj.value));
  }

  return items.concat(newItems);
};

class ColorRangeControl extends Control {
  constructor (options = {}) {
    const $element = $('<div />').attr('class', 'ol-control ol-unselectable color-range-control');
    const $palette = $('<div />').attr('class', 'html-palette');
    const $unit = $('<div />').attr('class', 'palette-unit');
    $element.append($palette, $unit);

    super({
      ...options,
      element: $element.get(0),
    });

    this.$element = $element;
    this.$palette = $palette;
    this.$unit = $unit;
  }

  setColorPalette ({ palette, counterUnits, unit }) {
    this.$palette.empty();
    const $paletteItems = Object
      .entries(palette)
      .map(([key, value]) => ({ key: parseInt(key, 10), value }))
      .sort((a, b) => a.key - b.key)
      .reduce(createPaletteItems(counterUnits), []);

    this.$palette.append($paletteItems);

    this.$unit.html(unit.trim());
  }
}

class MapFactory {
  constructor (mapType, containerId, withExtraVectorObject, withZoom, colorRangeCounterUnits) {
    this.mapType = mapType || 'temperature';
    this.containerId = containerId;
    this.withExtraVectorObject = withExtraVectorObject;
    this.withZoom = withZoom;
    this.colorRangeCounterUnits = colorRangeCounterUnits || [];

    this.$container = $(`#${this.containerId}`);
  }

  init () {
    this.extent = getExtent(this.containerId);

    // Initialize map view
    const view = new View({
      constrainRotation: 0,
      enableRotation: false,
      extent: this.extent,
    });
    const currentMapData = mapTypeService.getCurrentMapData(this.mapType, this.containerId);
    const imageExtent = currentMapData ? currentMapData.imageExtent : null;

    // Create map
    const target = this.$container.children('.map-container').get(0) || this.$container.get(0);
    const map = new Map({
      interactions: defaultInteractions({
        doubleClickZoom: false,
        dragAndDrop: false,
        keyboardPan: false,
        keyboardZoom: false,
        mouseWheelZoom: false,
        select: false
      }),
      layers: [],
      target,
      loadTilesWhileAnimating: true,
      view,
      controls: [],
    });
    this.map = map;

    this.createPopupOverlay();

    // Set layers blend mode to multiply
    const setBlendModeFromSelect = function (evt) {
      evt.context.globalCompositeOperation = 'multiply';
    };
    const resetBlendModeFromSelect = function (evt) {
      evt.context.globalCompositeOperation = 'source-over';
    };
    this.bindLayerListeners = function (layer) {
      layer.on('precompose', setBlendModeFromSelect);
      layer.on('postcompose', resetBlendModeFromSelect);
    };
    this.unbindLayerListeners = function (layer) {
      layer.un('precompose', setBlendModeFromSelect);
      layer.un('postcompose', resetBlendModeFromSelect);
    };
    // Create map layer
    var protocol = location.protocol,
      slashes = protocol.concat("//"),
      host = slashes.concat(window.location.hostname);
    const grayOsmLayer = new TileLayer({
      source: new OSMSrc({
        "crossOrigin": host
      })
    });
    grayOsmLayer.on('postcompose', (event) => {
      greyscale(event.context);
    });
    this.map.addLayer(grayOsmLayer);

    this.setZoomControl(this.withZoom);
    this.setColorRangeControl(this.colorRangeCounterUnits);

    // Create image layer
    this.setImageLayer = (mapType) => {
      const mapImage = mapTypeService.getCurrentMapImage(mapType, this.containerId);
      if (!mapImage) {
        return;
      }
      var imageLayer = new ImageLayer({
        source: new ImageStaticSrc({
          url: mapImage,
          imageExtent: imageExtent,
        }),
        opacity: 1,
      });
      this.map.addLayer(imageLayer);
      if (this.imageLayer) {
        this.map.removeLayer(this.imageLayer);
      }
      this.imageLayer = imageLayer;
      this.bindLayerListeners(imageLayer);
    };
    if (imageExtent) {
      this.setImageLayer(this.mapType);
    }
    // Create border vector layer
    this.borderVectorLayer = mapTypeService.getBorderVectorLayer(this.mapType, this.containerId);
    this.bindLayerListeners(this.borderVectorLayer);
    this.map.addLayer(this.borderVectorLayer);
    //
    // Hungary special vector layers
    if (this.withExtraVectorObject) {
      if (this.withExtraVectorObject === 'withWaters') {
        const watersVectorLayer = mapTypeService.getExtraVectorLayer('hungary_waters_geojson', '#0d96db');
        this.map.addLayer(watersVectorLayer);
      } else if (this.mapType === 'hazardMap') {
        const hazardVectorLayer = mapTypeService.getHazardVectorLayer();
        this.bindLayerListeners(hazardVectorLayer);
        this.map.addLayer(hazardVectorLayer);
      } else if (this.mapType.indexOf('white') !== -1) {
        const whiteChanceVectorLayer = mapTypeService.getWhiteChanceVectorLayer(this.mapType);
        this.bindLayerListeners(whiteChanceVectorLayer);
        this.map.addLayer(whiteChanceVectorLayer);
      } else {
        const countiesVectorLayer = mapTypeService.getExtraVectorLayer('hungary_counties_geojson', 'transparent');
        this.map.addLayer(countiesVectorLayer);
      }
    }

    // Create Markers
    this.setMarkers();

    // Show created time
    this.setCreatedTime();

    // Set center of the map
    this.fitView();
    window.addEventListener('resize', this.fitView.bind(this), false);

    // Initially bind listeners
    this.bindLayerListeners(grayOsmLayer);
  }

  // Popup
  showPopup (html, coords) {
    if (this.popupOverlay) {
      const $popup = $(this.popupOverlay.getElement());
      $popup.html(html);

      this.popupOverlay.setPosition(coords);
    }
  }

  hidePopup () {
    if (this.popupOverlay) {
      const $popup = $(this.popupOverlay.getElement());
      $popup.empty();

      this.popupOverlay.setPosition();
    }
  }

  createPopupOverlay () {
    const $popup = this.$container.children('.map-popup');
    if (!$popup.length) return;

    this.popupOverlay = new Overlay({
      element: $popup.get(0),
      autoPan: true,
      autoPanAnimation: {
        duration: 250,
      },
    });
    this.popupOverlay.setMap(this.map);

    this.map.on('singleclick', (e) => {
      const feature = this.map.forEachFeatureAtPixel(e.pixel, (feature) => feature);
      if (!feature) {
        this.hidePopup();
        return;
      }

      let html;
      if (this.containerId === 'hazard-map') {
        const hazardMap = mapTypeService.getCurrentMapMarkers(this.mapType, this.containerId);
        const hazardData = hazardMap[feature.get('name').split(' ')[0]];
        if (hazardData) {
          const getHazardHtml = (hazard) => {
            const { event, description, level } = hazard;
            const { color, text } = mapTypeService.getHazardLevelData(level);

            return `
              <div class="hazard-level" title="${description}">
                <div class="hazard-level-event">${event}</div>
                <div class="hazard-level-tag" style="background-color: ${color}">${text}</div>
              </div>
            `.trim();
          };

          html = `
            <div class="hazard-name"><span class="icon icon-pin"></span> ${feature.get('name')}</div>
            ${hazardData.map(getHazardHtml).join('')}
          `.trim();
        }
      } else if (feature && feature.get('value')) {
        html = feature.get('icon') + feature.get('value') + feature.get('name');
      }

      if (html) this.showPopup(html, e.coordinate);
      else this.hidePopup();
    });
  }

  setZoomControl (withZoom) {
    this.withZoom = !!withZoom;

    const controls = this.map.getControls();
    if (this.withZoom && !this.zoomControl) {
      this.$container.addClass('has-zoom-control');
      this.zoomControl = new ZoomControl();
      controls.push(this.zoomControl);
    } else if (!this.withZoom && this.zoomControl) {
      controls.remove(this.zoomControl);
      this.zoomControl = undefined;
      this.$container.removeClass('has-zoom-control');
    }

    this.fitView();
  }

  setColorRangeControl (counterUnits = []) {
    this.colorRangeCounterUnits = counterUnits;

    const { colorPalette } = mapTypeService.getCurrentMapData(this.mapType, this.containerId);

    const controls = this.map.getControls();
    if (colorPalette && Object.keys(colorPalette).length) {
      if (!this.colorRangeControl) {
        this.$container.addClass('has-color-range-control');
        this.colorRangeControl = new ColorRangeControl();
        controls.push(this.colorRangeControl);
      }

      const unit = mapTypeService.getUnitType(this.mapType, this.containerId);

      this.colorRangeControl.setColorPalette({
        palette: colorPalette,
        counterUnits: this.colorRangeCounterUnits,
        unit,
      });
    } else if (this.colorRangeControl) {
      controls.remove(this.colorRangeControl);
      this.colorRangeControl = undefined;
      this.$container.removeClass('has-color-range-control');
    }
  }

  setMarkers () {
    if (this.markers) {
      this.markers.forEach((marker) => {
        marker.setMap();
      });

      this.markers = undefined;
    }

    let measurements = mapTypeService.getCurrentMapMarkers(this.mapType, this.containerId) || [];
    if (!Array.isArray(measurements)) return;

    if (this.containerId === 'observations-map') {
      const markersByLonLat = measurements.reduce((markers, { longitude, latitude, created_at: { date } }, ind) => {
        const key = `${longitude}-${latitude}`;
        if (!markers[key] || date > markers[key].date) return { ...markers, [key]: { ind, date } };
        return markers;
      }, {});
      const filteredMarkers = Object.values(markersByLonLat)
        .sort(({ date: date1 }, { date: date2 }) => {
          if (date1 > date2) return 1;
          if (date1 < date2) return -1;
          return 0;
        })
        .map(({ ind }) => measurements[ind]);
      measurements = filteredMarkers;
    }


    this.markers = measurements.map((measurement) => {
      if ($(window).innerWidth() < 768) {
        if (this.containerId === 'water-temperature-map') {
          if ($.inArray(measurement.name, ["Fertőrákos", "Esztergom", "Mohács", "Siófok", "Szeged", "Tiszafüred", "Sárospatak"]) === -1) {
            return;
          }
        } else if ($.inArray(this.containerId, ["white-new-year-chance-map", "white-christmas-chance-map", "white-santa-chance-map"]) === -1) {
          if ($.inArray(measurement.name, ["Győr", "Gyõr", "Gyor", "Budapest", "Debrecen", "Pécs", "Pecs", "Szeged", "Miskolc", "Veszprém"]) === -1) {
            return;
          }
        }
      }
      const { longitude, latitude } = measurement;
      const $element = mapTypeService.getMarkerElem(this.mapType, this.containerId, measurement);
      if (!$element) return undefined;

      const marker = new Overlay({
        position: fromLonLat([longitude, latitude]),
        element: $element.get(0),
        stopEvent: false,
        autoPan: true,
        autoPanAnimation: {
          duration: 250,
        },
      });
      marker.setMap(this.map);

      if (this.containerId === 'observations-map') {
        $element.on('click', () => {
          if ($element.hasClass('open')) return;

          this.$container.find('.map-marker.open').removeClass('open');

          $element.addClass('open');
          marker.setPosition(fromLonLat([longitude, latitude]));
        });

        $element.find('.icon-close').on('click', (e) => {
          e.stopPropagation();

          $element.removeClass('open');
        });
      }

      return marker;
    }).filter(Boolean);

    this.map.render();
  }

  setCreatedTime () {
    if (['water-temperature-map', 'pollen-maps', 'air-pollution-maps'].includes(this.containerId)) return;

    clearTimeout(this.setCreatedTo);

    const created = mapTypeService.getCurrentMapCreated(this.mapType, this.containerId);
    if (!created) {
      if (this.$mapCreated) {
        this.$mapCreated.addClass('d-none');
      }

      return;
    }

    const now = Date.now();
    const createdMin = Math.ceil((now - created.valueOf()) / 60000);
    const createdText = `${createdMin} perce`;

    if (this.$mapCreated) {
      this.$mapCreated.removeClass('d-none');
      this.$mapCreated.find('.value').text(createdText);
    } else {
      const $sectionHead = this.$container.prev('.section-head');
      if (!$sectionHead.length) return;

      this.$mapCreated = $('<div />').attr('class', 'map-created');
      const $icon = $('<span />').attr('class', 'icon icon-clock');
      const $text = $('<span />').attr('class', 'text');
      const $value = $('<strong />').attr('class', 'value').text(createdText);

      $text.append('Frissítve ', $value);
      this.$mapCreated.append($icon, $text);
      $sectionHead.children().eq(0).after(this.$mapCreated);
    }

    const nextTo = 60000 - (now % 60000);
    this.setCreatedTo = setTimeout(() => {
      this.setCreatedTime();
    }, nextTo);
  }

  fitView () {
    const mapSize = this.map.getSize();

    if (!this.mapSize || mapSize[0] !== this.mapSize[0] || mapSize[1] !== this.mapSize[1]) {
      const view = this.map.getView();

      view.fit(this.extent, { constrainResolution: false });

      const zoom = view.getZoom();
      view.setMinZoom(zoom);
      if (this.withZoom) view.setMaxZoom(zoom + 3);
      else view.setMaxZoom(zoom);

      this.mapSize = mapSize;
    }
  }

  changeMap (mapType, colorRangeCounterUnits) {
    this.mapType = mapType;
    this.hidePopup();
    this.setImageLayer(mapType);
    this.setMarkers(mapType);
    this.setColorRangeControl(colorRangeCounterUnits, mapType);
    this.setCreatedTime();
  }
}

export default MapFactory;
