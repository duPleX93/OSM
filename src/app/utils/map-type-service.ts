import $ from 'jquery';

import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSrc from 'ol/source/Vector';
import GeoJSONFormat from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import FillStyle from 'ol/style/Fill';
import StrokeStyle from 'ol/style/Stroke';


const hazardLevelData = {
  1: {
    color: '#ffc800',
    text: 'Elsőfokú',
  },
  2: {
    color: '#eb7100',
    text: 'Másodfokú',
  },
  3: {
    color: '#b92000',
    text: 'Harmadfokú',
  },
};

const pollenLevelData = {
  0: {
    color: '#7fa4b7',
    text: 'Nincs adat',
  },
  1: {
    color: '#99ca40',
    text: 'Alacsony',
  },
  2: {
    color: '#ffb930',
    text: 'Közepes',
  },
  3: {
    color: '#e88438',
    text: 'Magas',
  },
  4: {
    color: '#e84538',
    text: 'Nagyon magas',
  },
  '-10': {
    color: '#c4ef75',
    text: 'Nincs jelen',
  },
};

const whiteChanceLevelColors = {
  1: 'rgba(91, 91, 91, .9)',
  2: 'rgba(151, 149, 150, .9)',
  3: 'rgba(185, 185, 185, .9)',
  4: 'rgba(255, 254, 255, .9)',
};

const whiteLevelData = {
  1: {
    color: '#6f87b8',
    text: '0-30%',
  },
  2: {
    color: '#7189dc',
    text: '30-50%',
  },
  3: {
    color: '#94b3ef',
    text: '50-70%',
  },
  4: {
    color: '#ffffff',
    text: '70-100%',
  }
};

const defaultMapSettings = {
  colorPalette: {},
  endLatitude: 49,
  endLongitude: 24,
  startLatitude: 45.3,
  startLongitude: 15,
};

const getMapConfig = (mapType: any, containerId: any) => {
  const mapConfigs = window.koponyeg.config.maps || {};
  let mapConfig;

  if (containerId === 'main-map') {
    mapConfig = mapConfigs.currentWeatherMap && mapConfigs.currentWeatherMap[mapType];
  } else if (containerId === 'air-pollution-maps') {
    mapConfig = mapConfigs.airPollution && mapConfigs.airPollution[mapType];
  } else if (containerId === 'pollen-maps') {
    const { created, measurements = {} } = mapConfigs.pollen || {};
    const typeCfg = measurements[mapType] || {};
    mapConfig = {
      created,
      ...typeCfg,
    };
  } else if (containerId === 'forecast-maps') {
    mapConfig = {
      measurements: (mapConfigs.dailyForecast && mapConfigs.dailyForecast[mapType]) || [],
    };
  } else {
    mapConfig = mapConfigs[mapType];
  }

  if (!mapConfig) mapConfig = {};
  if (!mapConfig.settings) {
    mapConfig = {
      ...mapConfig,
      settings: defaultMapSettings,
    };
  }

  return JSON.parse(JSON.stringify(mapConfig));
};

const getValueStr = (value: any, unit = '') => value.toString().replace(/(\d+)\.(\d+)$/, '$1,$2') + unit;

const vectorSources = {};
const getVectorSource = (name: any) => {
  if (!vectorSources[name]) {
    vectorSources[name] = new VectorSrc({
      url: `${window.koponyeg.appURL}/js/${name}.json`,
      format: new GeoJSONFormat(),
    });
  }

  return vectorSources[name];
};

const service = {
  getUnitType: (mapType: any, containerId: any) => {
    if (mapType === 'rain' || mapType === 'rainfall' || mapType === 'lastHourRainMap') {
      return ' mm';
    } else if (mapType === 'wind' || mapType === 'maximumWindMap') {
      return ' km/h';
    } else if (mapType === 'humidity') {
      return '%';
    } else if (mapType === 'temperature' || mapType === 'waterTemperature') {
      return '°C';
    } else if (mapType === 'snowDepth') {
      return ' cm';
    } else if (containerId === 'air-pollution-maps') {
      return ' µg/m<sup>3</sup>';
    } else if (containerId === 'pollen-maps') {
      return '';
    } else if (mapType.indexOf('white') !== -1) {
      return '';
    }
    return '°C';
  },
  getCurrentMapData: (mapType: any, containerId: any) => {
    const mapConfig = getMapConfig(mapType, containerId);
    const currentMapData = mapConfig.settings;

    currentMapData.imageExtent = fromLonLat([currentMapData.startLongitude, currentMapData.startLatitude]).concat(fromLonLat([currentMapData.endLongitude, currentMapData.endLatitude]));

    return currentMapData;
  },
  getCurrentMapCreated: (mapType: any, containerId: any) => {
    const mapConfig = getMapConfig(mapType, containerId);
    const currentMapData = mapConfig.created;

    if (currentMapData) {
      const match = currentMapData.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
      if (match) {
        const parts = match.slice(1).map((part: any, ind: any) => (ind === 1 ? parseInt(part, 10) - 1 : parseInt(part, 10)));
        return new Date(...parts);
      }
    }
  },
  getCurrentMapMarkers: (mapType: any, containerId: any) => {
    const mapConfig = getMapConfig(mapType, containerId);
    const currentMapData = mapConfig.measurements;

    return currentMapData;
  },
  getCurrentMapImage: (mapType: any, containerId: any) => {
    const mapConfig = getMapConfig(mapType, containerId);
    const currentMapData = mapConfig.image;

    return currentMapData;
  },
  getPollenLevelData: (level: any) => pollenLevelData[level] || {},
  getHazardLevelData: (level: any) => hazardLevelData[level] || {},
  getWhiteLevelData: (level: any) => whiteLevelData[level] || {},
  getBorderVectorLayer: (mapType: any, containerId: any) => {
    var mapImage = service.getCurrentMapImage(mapType, containerId);
    const vectorSource = getVectorSource('hungary_geojson');
    var vectorStyle = new Style({
      fill: new FillStyle({
        color: ((typeof mapImage !== 'undefined' || mapType === 'hazardMap') ? 'rgba(0, 0, 0, 0.15)' : 'rgba(113, 191, 68, 0.5)'),
      }),
      stroke: new StrokeStyle({
        color: '#0d96db',
        width: 2,
      }),
    });
    return new VectorLayer({
      source: vectorSource,
      style: vectorStyle,
    });
  },
  getExtraVectorLayer: (geoJson: any, fillColor: any) => {
    const vectorSource = getVectorSource(geoJson);
    var vectorStyle = new Style({
      fill: new FillStyle({
        color: fillColor,
      }),
      stroke: new StrokeStyle({
        color: '#0d96db',
        width: 1,
      }),
    });
    return new VectorLayer({
      source: vectorSource,
      style: vectorStyle,
    });
  },
  getHazardVectorLayer: () => {
    const hazardMap = window.koponyeg.config.maps.hazardMap.measurements;
    var styleCache = {};
    const vectorSource = getVectorSource('hungary_counties_geojson');
    var defaultStyle = new Style({
      fill: new FillStyle({
        color: '#71bf44',
      }),
      stroke: new StrokeStyle({
        color: '#c0dbb3',
        width: 1,
      }),
    });

    const getMaxLevelData = (hazardData: any) => {
      const hazardLevel = hazardData.reduce((maxLevel: any, { level }) => (level > maxLevel ? level : maxLevel), 0);
      return hazardLevelData[hazardLevel] || {};
    };

    function styleFunction (feature: any) {
      var county = feature.get('name').split(' ')[0];
      if (!hazardMap[county]) {
        return [defaultStyle];
      }
      if (!styleCache[county]) {
        const { color } = getMaxLevelData(hazardMap[county]);
        styleCache[county] = new Style({
          fill: new FillStyle({
            color,
          }),
          stroke: new StrokeStyle({
            color: '#c0dbb3',
            width: 1,
          }),
        });
      }
      return [styleCache[county]];
    }

    return new VectorLayer({
      source: vectorSource,
      style: styleFunction,
    });
  },
  getWhiteChanceVectorLayer: (mapType: any) => {
    const chanceMap = window.koponyeg.config.maps[mapType];
    var styleCache = {};
    const vectorSource = getVectorSource('hungary_region_geojson');
    var defaultStyle = new Style({
      fill: new FillStyle({
        color: 'transparent',
      }),
      stroke: new StrokeStyle({
        color: '#0d96db',
        width: 1,
      }),
    });

    function styleFunction (feature: any) {
      var county = feature.get('name').split(' ')[0];

      var checkRegion = false,
        regionLabel = "",
        regionColor = "";

      $(chanceMap["measurements"]).each(function (idx: any) {
        if (county === this.name ||
          (county === "Nyugat-Dunántúl" && this.name === "Észak-Dunántúl") ||
          (county === "Közép-Dunántúl" && this.name === "Balaton") ||
          (county === "Dél-Alföld" && this.name === "Dél-Magyarország") ||
          (county === "Észak-Alföld" && this.name === "Kelet-Magyarország")
        ) {
          checkRegion = true;
          regionLabel = this.name;
          regionColor = whiteLevelData[this.value]["color"];
        }
      });

      if (checkRegion === false) {
        return [defaultStyle];
      }
      if (!styleCache[county]) {
        styleCache[county] = new Style({
          fill: new FillStyle({
            color: regionColor,
          }),
          stroke: new StrokeStyle({
            color: '#0d96db',
            width: 1,
          }),
        });
      }
      return [styleCache[county]];
    }

    return new VectorLayer({
      source: vectorSource,
      style: styleFunction,
    });
  },
  getMarkerElem: (mapType: any, containerId: any, measurement: any) => {
    const { name, value } = measurement;
    const $element = $('<div />')
      .attr('class', 'map-marker');

    if (containerId === 'pollen-maps' && value === 0) return undefined;

    if (containerId === 'forecast-maps') {
      if (measurement.sky_icon) {
        const $weatherIcon = $('<div />')
          .attr('class', `weather-icon ${measurement.sky_icon} nappal`);
        $element.append($weatherIcon);
      }

      const $tempInfo = $('<div />')
        .attr('class', 'temp-info');
      const $tempMax = $('<div />')
        .attr('class', 'temp temp-max')
        .text(getValueStr(measurement.max_temp, '°'));
      const $tempMin = $('<div />')
        .attr('class', 'temp temp-min')
        .text(getValueStr(measurement.min_temp, '°'));

      $tempInfo.append($tempMax, '<hr>', $tempMin);
      $element.append($tempInfo);

      const $weatherInfo = $('<div />')
        .attr('class', 'weather-info');
      const $windInfo = $('<div />')
        .attr('class', 'info info-wind');
      const $windIcon = $('<div />')
        .attr('class', 'icon icon-wind');
      $windInfo.append($windIcon, '<br>', getValueStr(measurement.wind, ' km/h'));
      const $rainInfo = $('<div />')
        .attr('class', 'info info-rain');
      const $rainIcon = $('<div />')
        .attr('class', 'icon icon-rain');
      $rainInfo.append($rainIcon, '<br>', getValueStr(measurement.rain, ' mm'));

      $weatherInfo.append($windInfo, '<hr>', $rainInfo);
      $element.append($weatherInfo);

      return $element;
    }

    if (containerId === 'observations-map') {
      const $weatherIcon = $('<div />')
        .attr('class', `weather-icon ${measurement.sky_icon} nappal`);
      $element.append($weatherIcon);

      const $infoContainer = $('<div />')
        .attr('class', 'info-container');

      const $closeIcon = $('<a />')
        .attr('class', 'icon icon-close');
      $infoContainer.append($closeIcon);

      const $weather = $('<div />')
        .attr('class', 'weather')
        .text(measurement.extra_data.name);
      $infoContainer.append($weather);

      const $place = $('<div />')
        .attr('class', 'place');
      const $pinIcon = $('<span />')
        .attr('class', 'icon icon-pin');
      $place.append($pinIcon, measurement.city);
      $infoContainer.append($place);

      if (measurement.temperature != null || (measurement.wind_velocity && measurement.wind_velocity.name)) {
        const $tempWind = $('<div />')
          .attr('class', 'temp-wind');

        if (measurement.temperature != null) {
          const $temp = $('<div />')
            .attr('class', 'temp')
            .text(getValueStr(measurement.temperature, '°'));
          $tempWind.append($temp);
        }
        if (measurement.wind_velocity && measurement.wind_velocity.name) {
          const $wind = $('<div />')
            .attr('class', 'wind')
            .text(measurement.wind_velocity.name);
          $tempWind.append($wind);
        }

        $infoContainer.append($tempWind);
      }

      if (measurement.image) {
        const $img = $('<div />')
          .attr('class', 'img')
          .css('background-image', `url('${measurement.image.list_index_medium_url}')`);
        $infoContainer.append($img);
      }

      const $dateUser = $('<div />')
        .attr('class', 'date-user');

      const $date = $('<div />')
        .attr('class', 'date')
        .text(measurement.created_at.date.replace(/:\d{2}(\.\d+)?$/, ''));
      const $user = $('<div />')
        .attr('class', 'user')
        .text(measurement.user);
      $dateUser.append($date, $user);
      $infoContainer.append($dateUser);

      $element.append($infoContainer);

      return $element;
    }

    // FIXME: don't delete! uncomment when the weather icons are fixed for the temperature maps
    if ((containerId === 'temperature-map' || (containerId === 'main-map' && mapType === 'temperature')) && measurement.sky_icon) {
      const $weatherIcon = $('<div />')
        .attr('class', `weather-icon ${measurement.sky_icon}`);
      $element.append($weatherIcon);
    }

    if (['rain-map', 'last-hour-rain-map'].includes(containerId) || (containerId === 'main-map' && mapType === 'rain')) {
      const $icon = $('<div />').attr('class', 'icon icon-rain');
      $element.attr('title', name).append($icon);
    } else if (['wind-map', 'maximum-wind-map'].includes(containerId) || (containerId === 'main-map' && mapType === 'wind')) {
      const $icon = $('<div />').attr('class', 'icon icon-wind');
      $element.attr('title', name).append($icon);
    } else if (name && !(containerId === 'main-map' && mapType === 'temperature')) {
      const $icon = $('<div />').attr('class', 'icon icon-pin');
      const $name = $('<div />')
        .attr('class', 'name');
      $name.append($icon, name);
      $element.append($name);
    } else if (name) {
      $element.attr('title', name);
    }

    if (typeof value !== 'undefined') {
      const $value = $('<div />')
        .attr('class', 'value');

      if (containerId === 'pollen-maps') {
        const {color, text} = service.getPollenLevelData(value);
        $value
          .css('background-color', color)
          .text(text);
      } else if (mapType.indexOf("white") !== -1) {
        const {color, text} = service.getWhiteLevelData(value);
        $value
          .text(text);
        $element.addClass("no-max-width");
        $element.addClass("no-marker-icon");
      } else {
        const unit = service.getUnitType(mapType, containerId);
        $value
          .html(getValueStr(value, unit));
      }

      $element.append($value);
    }

    if (['wind-map', 'maximum-wind-map'].includes(containerId) || (containerId === 'main-map' && mapType === 'wind')) {
      const windDirection = containerId === 'maximum-wind-map' ? measurement.max_wind_direction : measurement.wind_direction;

      if (windDirection) {
        const $windDirection = $('<div />')
          .attr('class', 'wind-direction text-gray')
          .text(windDirection);
        $element.append($windDirection);
      }
    }

    return $element;
  },
};
export default service;
