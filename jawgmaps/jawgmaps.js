/**
 * Copyright (C) 2000-2016 eBusiness Information
 *
 * This file is part of Jawg Widgets.
 *
 * Jawg Widgets is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jawg Widgets is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Jawg Widgets.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Created by Anthony Salembier and Jason Conard.
 * Edited by Kevin Bottero
 */


////Basic configuration for Transilien Hackathon
var mapConf = {
  "tileServer": "https://tile.transilien.jawg.io/{z}/{x}/{y}.png",
  "floorLayerServer": "https://tile.transilien.jawg.io/{0}/{z}/{x}/{y}.png",
  "poiServer": "https://storage.transilien.jawg.io",
  "initialZoom": 11,
  "initialLocation": [48.862499, 2.336400],
  "displayFloorZoom": 15,
  "apiKey": "da032aadaf3efe7fec2fa5808ea2111f25d105e89c6b9196401a8b822fa3c902",
  "datasetId": "dataset_transilien",
  "osmSearch": true,
  "searchZoom": 18
};


/**
 * This is the Jawg interface
 *
 *  By default Jawg will affect the DOM element with the id : "jawgmaps"
 *  with a configuration by default.
 *
 *  You can specify a different configuration and element using Jawg.init() method
 *
 *  You can access directly the Leaflet map by : Jawg.map
 *
 *  You can activate different widget with the function : Jawg.activateWidgets
 *  Available widgets :
 *    "refresh" : A refresh button
 *    "pois" : Import POIs from transilien
 *    "search" : Search bar (for POI and itinerary)
 *    "pois-menu" : Display available POIs on a menu
 *  (Jawg.activateWidgets(["refresh", "pois", "search", "pois-menu"]))
 *
 */
var Jawg = {};

(function() {
  "use strict";

  Jawg.init = init;
  Jawg.map = null;
  Jawg._filterParams = new Map();
  Jawg._utils = {
    callHttpReq : callHttpReq,
    removeClass: removeClass,
    addClass: addClass
  };

  Jawg.activateWidgets = activateWidgets;

  var layerThemes = [];
  var currentLayerTheme = 0;

  var flagMarkerMenu = false;

  /**
   * Default launch on jawgmaps element
   */
  if (document.getElementById("jawgmaps")) {
    init(mapConf);
      activateFloors();
  }

  /**
   * Initialize Jawg to a specific DOM element with the given configuration
   * @param mapConfig Configuration of the map
   * @param mapId (default : 'jawgmaps') Id of the DOM element where the map should be insert
   */
  function init(mapConfig, mapId) {
    if (!mapId) {
      mapId = "jawgmaps";
    }
    if (!mapConfig) {
      mapConfig = {};
    }
    Jawg._conf = mapConfig;

    initMapConf(mapConfig);

    initMapDomNode(mapId);

    initLeafletMap(mapId);
  }

  function activateWidgets(widgets) {
    if (widgets.indexOf("refresh") != -1) { activateRefreshButton() }
    if (widgets.indexOf("floors") != -1) { activateFloors() }
    if (widgets.indexOf("pois") != -1) { activatePois() }
    if (widgets.indexOf("search") != -1) { activateSearch() }
    if (widgets.indexOf("pois-menu") != -1) { activateMarkerMenu() }
  }

  //-------------------------------------------------//
  //----------------- Init Functions ----------------//
  //-------------------------------------------------//
  /**
   * Set the configuration
   * @param mapConfig
     */
  function initMapConf(mapConfig) {
    /* Default icon sizes*/
    var sizes = {
      small: [41, 41],
      medium: [48, 48],
      large: [60, 60]
    };
    /*Return variable is defined, default value else*/
    var defaultBoolean = function(booleanItem, defaultVal) {
      if (booleanItem !== null && booleanItem !== undefined) {
        return booleanItem;
      } else {
        return defaultVal;
      }
    };

    /*Configuration*/
    //Map config
    mapConfig.tileServer = mapConfig.tileServer || "";
    mapConfig.minZoom = mapConfig.minZoom || 3;
    mapConfig.maxZoom = mapConfig.maxZoom || 22;
    //Map starting point
    mapConfig.mapBounds = mapConfig.mapBounds || [[85, -180], [-65, 180]];
    mapConfig.initialLocation = mapConfig.initialLocation || [48.862499, 2.336400];
    mapConfig.initialZoom = mapConfig.initialZoom || 11;
    //Floors
    mapConfig.displayFloorZoom = mapConfig.displayFloorZoom || 15;
    mapConfig.floorLayerServer = mapConfig.floorLayerServer || "";
    //POI
    mapConfig.poiServer = mapConfig.poiServer || "";
    mapConfig.apiKey = mapConfig.apiKey || "";
    mapConfig.datasetId = mapConfig.datasetId || "";
    mapConfig.poiIconSizes = mapConfig.poiIconSizes || sizes;
    mapConfig.poiLoadFactor = mapConfig.poiLoadFactor || 0.1;
    mapConfig.poiTriggerFactor = mapConfig.poiTriggerFactor || 0.1;
    mapConfig.clickMarker = defaultBoolean(mapConfig.clickMarker, false);
    mapConfig.points = [];
    mapConfig.types = [];
    //Marker Menu
    mapConfig.markerMenuPanelPosition = mapConfig.markerMenuPanelPosition || "right";
    mapConfig.markerMenuClickMarker = mapConfig.markerMenuClickMarker || true;
    //Search
    mapConfig.searchZoom = mapConfig.searchZoom || 18;
    mapConfig.osmSearch = mapConfig.osmSearch || false;
  }

  /**
   * Add HTML nodes corresponding to the map
   * @param mapId
   */
  function initMapDomNode(mapId) {
    var mapSample = document.getElementById(mapId);
    Jawg._rootElement = mapSample;

    var display = 'classic';
    var parentDisplay = getComputedStyle(mapSample.parentNode).display;
    if (parentDisplay.indexOf('flex') >= 0) {
      display = 'flexible';
    }

    mapSample.setAttribute('class', 'map-container ' + display);


    var mapContent = document.createElement('div');
    mapContent.setAttribute('class', 'map-content ' + display);

    var mapElem = document.createElement('div');
    mapElem.setAttribute('id', mapId + '-map');
    mapElem.setAttribute('class', 'map-view ' + display);

    mapContent.appendChild(mapElem);
    mapSample.appendChild(mapContent);
  }

  /**
   * Initialize the Leaflet map
   * @param mapId
   */
  function initLeafletMap(mapId) {

    // Add "maxBounds : mapConfig.mapBounds", on the options of map if you want to prohibit drawing the map outside the bounds.
    Jawg.map = L.map(mapId + '-map', {
      maxZoom: Jawg._conf.maxZoom,
      minZoom: Jawg._conf.minZoom,
      zoomControl: false
    });
    var options = {
      attribution: '<a href="http://openstreetmap.fr/" target="_blank">OpenStreetMap</a> | <a href="http://jawg.io/" target="_blank">Jawg</a>',
      maxZoom: Jawg._conf.maxZoom,
      maxNativeZoom: Jawg._conf.maxZoom
    };

    L.tileLayer(Jawg._conf.tileServer, options).addTo(Jawg.map);

    var markerClusterGroup = new L.FeatureGroup();
    Jawg.map.markerGroup = markerClusterGroup;
    Jawg.map.addLayer(markerClusterGroup);

    new L.Control.Zoom({position: 'topright'}).addTo(Jawg.map);

    if (Jawg._conf.fitBounds) {
      Jawg.map.fitBounds(Jawg._conf.fitBounds);
    } else {
      Jawg.map.setView(Jawg._conf.initialLocation, Jawg._conf.initialZoom);
    }
  }

  //-------------------------------------------------//
  //----------------- Refresh Button ----------------//
  //-------------------------------------------------//
  /**
   * Activate the refresh button
   */
  function activateRefreshButton() {
    var mapSample = Jawg._rootElement;

    var refreshButton = document.createElement('div');
    refreshButton.className = 'map-refresh';
    refreshButton.innerHTML = '<i class="fa fa-undo"></i>';
    mapSample.appendChild(refreshButton);

    refreshButton.addEventListener('click', function() {
      if (Jawg._conf.fitBounds) {
        Jawg.map.fitBounds(Jawg._conf.fitBounds);
      } else {
        Jawg.map.setView(Jawg._conf.initialLocation, Jawg._conf.initialZoom);
      }
    });
  }


  //-------------------------------------------------//
  //---------------------- Floor --------------------//
  //-------------------------------------------------//
  /**
   * Activate floors plugins on the map
   */
  function activateFloors() {
    var stations;
    var timeOut;
    var floorsList;
    var currentFloor = 0;
    var availableFloors;
    var floorsLayer;
    var floorLayerServer =  Jawg._conf.floorLayerServer;
    var selectedBtn = null;
    var floorsWrapper;

    var initWidget = function () {
      floorsWrapper = document.createElement('div');
      floorsWrapper.setAttribute('class', 'floors-wrapper');
      Jawg._rootElement.appendChild(floorsWrapper);
    };

    /**
     * Callback on floor file received.
     * @param data
     */
    var floorsReceived = function (data) {
      stations = data;
      floorsList = new Set();
      if (stations) {
        stations.forEach(function (station) {
          station.floors.forEach(function (floor) {
            floorsList.add(floor);
          });
        });
      }
      updateFloors();
    };

    /**
     * Find the floors in the current bounds
     */
    function askForComputeFloors() {
      if (timeOut) {
        clearTimeout(timeOut);
      }
      timeOut = setTimeout(computeFloors, 300);
    }

    /**
     * Find the floors on the current screen
     * /!\ Do not call directly, call askForComputeFloors() /!\
     */
    function computeFloors() {
      var newFloors = new Set();

      if (stations) {
        stations.forEach(function (station) {
          var stationBound = L.latLngBounds(L.latLng(station.south, station.west), L.latLng(station.north, station.east));

          if (stationBound.intersects(Jawg.map.getBounds())) {
            station.floors.forEach(function (floor) {
              newFloors.add(floor);
            });
          }
        });
      }

      availableFloors = Array.from(newFloors).sort(function (a, b) {
        return b - a;
      });

      drawBtns();

      // if the current floor is not part of floors, switch to floor 0
      if (availableFloors.indexOf(currentFloor) == -1 ||
        //if the floors aren't display anymore switch to floor 0
        (currentFloor !== 0 && Jawg.map.currentZoom <= Jawg._conf.displayFloorZoom)) {
        selectFloor(0);
      }
    }

    /**
     * Change the layer on the map for the given floor.
     * @param floor
     */
    var selectFloor = function (floor) {
      if (currentFloor != floor) {
        currentFloor = floor;
        floorsLayer.setUrl(floorLayerServer.replace('{0}', currentFloor));
      }
    };

    /**
     * Set the floor layer configuration
     */
    var initFloors = function () {
      floorsLayer = L.tileLayer(floorLayerServer.replace('{0}', '0'), {
        minZoom: Jawg._conf.minZoom,
        maxZoom: Jawg._conf.maxZoom
      });
      floorsLayer.setZIndex(4000);
      floorsLayer.addTo(Jawg.map);

      Jawg.map.on('move', function () {
        updateFloors();
      });

      Jawg.map.on('zoomend', function () {
        updateFloors();
      });

      callGetFloorsRequest();
    };

    /**
     * Depending on zoom, compute floors or hide all btns.
     */
    var updateFloors = function () {
      if (Jawg.map.getZoom() > Jawg._conf.displayFloorZoom) {
        askForComputeFloors();
      } else {
        selectFloor(0);
        clearBtns();
      }
    };

    /**
     * Create btns for all floors available.
     */
    var drawBtns = function () {
      clearBtns();

      availableFloors.forEach(function (floor) {
        var floorBtn = document.createElement('div');
        floorBtn.textContent = floor;
        floorBtn.floorValue = floor;
        floorBtn.addEventListener('click', function (evt) {
          clickFloor(evt.target);
        });
        if (floor == currentFloor) {
          floorBtn.setAttribute('class', 'floor-btn selected-btn');
          selectedBtn = floorBtn;
        } else {
          floorBtn.setAttribute('class', 'floor-btn un-selected-btn');
        }

        floorsWrapper.appendChild(floorBtn);
      });

    };

    /**
     * Remove all floors btns
     */
    var clearBtns = function () {
      //remove all the previous btns
      while (floorsWrapper.firstChild) {
        floorsWrapper.removeChild(floorsWrapper.firstChild);
      }
    };

    //-------------------------------------------------//
    //------------------- Request  --------------------//
    //-------------------------------------------------//

    /**
     * Get Floor.json file containing all the BBox.
     */
    var callGetFloorsRequest = function () {
      Jawg._utils.callHttpReq('GET', "https://media.transilien.jawg.io/floors/floors.json")
        .success(function (response) {
          floorsReceived(response);
        });
    };

    //-------------------------------------------------//
    //------------------- Listener --------------------//
    //-------------------------------------------------//

    /**
     * Listener on floors btn click event
     * @param target The btn selected
     */
    var clickFloor = function (target) {
      if (selectedBtn != null) {
        selectedBtn.setAttribute('class', 'floor-btn un-selected-btn');
      }
      target.setAttribute('class', 'floor-btn selected-btn');
      selectedBtn = target;
      selectFloor(target.floorValue);
    };

    //-------------------------------------------------//
    //---------------------- Init ---------------------//
    //-------------------------------------------------//

    initWidget();
    initFloors();
  }

  //-------------------------------------------------//
  //---------------------- POI ----------------------//
  //-------------------------------------------------//
  /**
   * Display POI on the map
   */
  function activatePois() {

    /**
     * Does the current box cross the trigger
     * @param current the box to test
     * @param trigger the trigger box
     * @returns {boolean} true if the currentBox cross the trigger
     */
    var shouldReload = function(current, trigger) {
      return !(current.getWest() > trigger.getWest() &&
      current.getEast() < trigger.getEast() &&
      current.getSouth() > trigger.getSouth() &&
      current.getNorth() < trigger.getNorth());
    };

    /**
     * Enlarge a Bounding Box of a given percentage
     * @param boundingBox The Bounding Box to enlarge
     * @param factor The factor of the enlarge (in percent)
     * @returns {*} the enlarged Bounding Box
     */
    var enlarge = function(boundingBox, factor) {
      var deltaLng = (boundingBox.getEast() - boundingBox.getWest()) * factor;
      var deltaLat = (boundingBox.getNorth() - boundingBox.getSouth()) * factor;
      var southWest = L.latLng(boundingBox.getSouth() - deltaLat / 2, boundingBox.getWest() - deltaLng / 2);
      var northEast = L.latLng(boundingBox.getNorth() + deltaLat / 2, boundingBox.getEast() + deltaLng / 2);
      return L.latLngBounds(southWest, northEast);
    };

    /**
     * Get type associated to a given POI
     * @param point
     * @returns {*}
       */
    var getPoiType = function(point) {
      for (var i = 0; i < Jawg._conf.types.length; i++) {
        var currentType = Jawg._conf.types[i];
        if (point.typeId === currentType.id) {
          return currentType;
        }
      }
      return null;
    };

    /**
     * Add parameters to POI request (like floors)
     * @returns {string}
     */
    var filterParams = function() {
      var params = "";
      Jawg._filterParams.each(function(key, value) {
        if (value.length > 0) {
          params += '&' + key + '=' + value;
        }
      });
      return params;
    };

    /**
     * Get Pois from the poi server (according to the current bounds)
     * @param options
     * @returns {*}
     */
    var getPois = function(options) {
      var params = '?';
      var box;

      if (options && options.box) {
        box = options.box;
      }
      if (box) {
        params += "&bbox=(" + box.getWest() + "," +
            box.getSouth() + "," +
            box.getEast() + "," +
            box.getNorth() + ")";
      }

      params += "&zoom=" + Jawg.map.getZoom();
      params += filterParams();

      var header = {
        'Api-Key': Jawg._conf.apiKey
      };
      return Jawg._utils.callHttpReq('GET', Jawg._conf.poiServer + '/' + Jawg._conf.datasetId + '/poi' + params, header)
          .success(function(points) {

            var diffPoints = Jawg._conf.points.filter(function(p) {
              var i;
              for (i = 0; i < points.length; ++i) {
                if (points[i].id === p.id) {
                  return false;
                }
              }
              return true;
            });

            diffPoints.forEach(function(point) {
              Jawg.map.markerGroup.removeLayer(point.marker);
            });

            var newPoints = points.filter(function(p) {
              var i;
              for (i = 0; i < Jawg._conf.points.length; ++i) {
                if (Jawg._conf.points[i].id === p.id) {
                  return false;
                }
              }
              return true;
            });

            newPoints.forEach(function(point) {
              point.latLngTable = [point.latLng.lat, point.latLng.lng];
              point.typeItem = getPoiType(point);
              point.typeItem.enable = true;
              point.iconUrl = Jawg._conf.poiServer + '/' + Jawg._conf.datasetId + '/icon/' + point.typeItem.icon + '/' + point.typeItem.iconSize + '?apiKey=' + Jawg._conf.apiKey;

              var currentMarker = null;
              var anchorX = point.typeItem.anchorX;
              var anchorY = point.typeItem.anchorY;
              var popupAnchorX = -anchorX + ( Jawg._conf.poiIconSizes[point.typeItem.iconSize][0] / 2 );
              var popupAnchorY = -anchorY;

              var icon = L.icon({
                iconUrl: point.iconUrl,
                iconAnchor: [anchorX, anchorY],
                popupAnchor: [popupAnchorX, popupAnchorY]
              });
              currentMarker = L.marker([point.latLng.lat, point.latLng.lng], {icon: icon});

              point.marker = currentMarker;
              point.enable = true;
              Jawg.map.markerGroup.addLayer(currentMarker);

              var itemNameStr = '<h4>' + point.name + '</h4>';
              if (!Jawg._conf.clickMarker) {
                currentMarker.bindPopup(itemNameStr);

                currentMarker.on('click', function() {
                });

                // Leaflet bug, simple click isn't triggered and dbclick is triggered as a simple one.
                currentMarker.on('dbclick', function() {
                  currentMarker.togglePopup();
                });
              }
            });
            Jawg._conf.points = Jawg._conf.points.filter(function(i) {return diffPoints.indexOf(i) < 0;}).concat(newPoints);

            if (flagMarkerMenu) {
              activateMarkerMenu();
            }

          }).error(function() {
            Jawg._conf.points = [];
          });
    };

    /**
     * Load POI if we are out of the previously loaded boundaries
     * @param forceRefresh
     */
    var reloadPoisIfNeeded = function(forceRefresh) {
      if (Jawg._reloadTimer) {
        window.clearTimeout(Jawg._reloadTimer);
      }
      Jawg._reloadTimer = window.setTimeout(function() {
        var currentBoundingBox = Jawg.map.getBounds();
        //if it's the first time
        var option;
        if (!Jawg._triggerBoundingBox) {
          option = {
            box: enlarge(currentBoundingBox, Jawg._conf.poiLoadFactor)
          };
          Jawg._triggerBoundingBox = enlarge(currentBoundingBox, Jawg._conf.poiTriggerFactor);
          getPois(option);
          return;
        }
        //if we are out of the trigger Box
        if (forceRefresh || shouldReload(currentBoundingBox, Jawg._triggerBoundingBox)) {
          option = {
            box: enlarge(currentBoundingBox, Jawg._conf.poiLoadFactor)
          };

          //get pois
          getPois(option);
          Jawg._triggerBoundingBox = enlarge(currentBoundingBox, Jawg._conf.poiTriggerFactor);
        }
      }, 300);
    };


    if (Jawg._conf.poiServer.length > 0) {
      var header = {
        'Api-Key': Jawg._conf.apiKey
      };
      Jawg._utils.callHttpReq('GET', Jawg._conf.poiServer + '/' + Jawg._conf.datasetId + '/type', header)
        .success(function(types) {
          Jawg._conf.types = types;
        }).error(function() {
        Jawg._conf.types = [];
      }).then(function() {
        var option = {
          box: enlarge(Jawg.map.getBounds(), Jawg._conf.poiLoadFactor)
        };
        getPois(option)
        .then(function() {
          Jawg._utils.callHttpReq('GET', Jawg._conf.poiServer + '/' + Jawg._conf.datasetId + '/layer/', header)
            .success(function(layers) {
              Jawg._conf.layers = layers;
            }).error(function() {
            Jawg._conf.layers = [];
          });
        });
      });
    }

    Jawg.map.on('move', function() {
      reloadPoisIfNeeded(false);
    });

    Jawg.map.on('zoomend', function() {
      reloadPoisIfNeeded(true);
    });
  }

  //-------------------------------------------------//
  //--------------------- Search --------------------//
  //-------------------------------------------------//
  /**
   * Activate the search bar in the map
   */
  function activateSearch() {
    var searchMarker;
    var templatesFunctions = {
      getSearchWidget : function(){
        var elem = document.createElement('div');
        elem.className = 'search-widget search-widget-closed';
        elem.innerHTML =
          '<div class="search-widget-container">' +
          '<div class="search-widget-button"><i class="fa fa-search"></i></div>' +
          '<div class="search-widget-reduce"><i class="fa fa-caret-left"></i></div>' +
          '<div class="search-panel-content">' +
          '<div class="search-input">' +
          '<input class="map-search"/>' +
          '<div class="clickable search-input-icon eye-btn"><i class="fa fa-eye"></i></div>' +
          '<div class="clickable search-input-icon del-btn"><i class="fa fa-times"></i></div>' +
          '</div>' +
          '<div class="iti-search search-widget-itinerary"></div>' +
          '<div class="search-widget-content">' +
          '<div class="search-widget-results"></div>' +
          '<div class="search-widget-iti-panel"></div>' +
          '</div>' +
          '<div class="iti-close clickable search-widget-close-iti">' +
          '<span> Close itinerary </span>' +
          '</div>' +
          '</div>' +
          '</div>';
        return elem;
      },

      getField : function(notVisible) {
        var elem = document.createElement('div');
        elem.className = 'search-elem clickable';
        var innerHTML = '';
        if (notVisible) {
          innerHTML +=
            '<i class="fa fa-eye-slash"></i>' +
            '&nbsp;';
        }
        innerHTML += '<span class="name"></span>';
        elem.innerHTML = innerHTML;
        return elem;
      },

      getItinerary : function() {
        var elem = document.createElement('div');
        elem.innerHTML =
          '<div class="search-input">' +
          '<input class="itinerary-search"/>' +
          '<div class="clickable search-input-icon eye-btn"><i class="fa fa-eye"></i></div>' +
          '<div class="clickable search-input-icon del-btn"><i class="fa fa-times"></i></div>' +
          '</div>' +
          '<div class="iti-types clickable">' +
          '<div class="iti-type iti-type-car"><i class="fa fa-car"></i></div>' +
          '<div class="iti-type iti-type-bicycle" style="display:none"><i class="fa fa-bicycle"></i></div>' +
          '<div class="iti-type iti-type-pedestrian" style="display:none"><i class="fa fa-male"></i></div>' +
          '<div class="iti-type iti-type-bus"><i class="fa fa-bus"></i></div>' +
          '</div>';

        return elem;
      },

      getItineraryPanel : function() {
        var elem = document.createElement('div');
        elem.className = 'search-widget-iti';
        elem.innerHTML =
          '<h3>Itinerary :</h3>' +
          '<div class="tpl-dist"></div>' +
          '<div class="tpl-time"></div>' +
          '<div class="tpl-desc"></div>' +
          '<div class="tpl-pagination">' +
          '<div class="tplp-back clickable"><i class="fa fa-arrow-left"></i></div>' +
          '<div class="tplp-page">' +
          '<span class="tplp-text">' +
          'Page <span class="tplp-current"></span> on <span class="tplp-end"></span>' +
          '</span>' +
          '</div>' +
          '<div class="tplp-next clickable"><i class="fa fa-arrow-right"></i></div>' +
          '</div>';
        return elem;
      },

      getManeuver : function() {
        var elem = document.createElement('div');
        elem.className = 'tpl-maneuver';
        elem.innerHTML =
          '<div class="tplm-text">' +
          '<span class="tpl-maneuver-desc"></span>' +
          '</div>' +
          '<div class="tplm-dist">' +
          '<span> </span>' +
          '</div>';
        return elem;
      },

      getNavitia : function() {
        var elem = document.createElement('div');
        elem.className = 'search-widget-journey';
        elem.innerHTML =
          '<h4 class="journey-title"></h4>' +
          '<p class="journey-desc">' +
          '<span class="jd-steps"></span>' +
          '<br/><span class="jd-dep"></span>' +
          '<br/><span class="jd-arr"></span>' +
          '</p>' +
          '<p class="journey-sections"></p>';
        return elem;
      }
    };

    var routePagination = {
      page : 0,
      nbPage : 0,
      itemPerPage: 10,
      nextPage : function() { this.page = this.page < this.nbPage-1 ? this.page+1 : this.page; },
      previousPage : function() { this.page = this.page > 0 ? this.page-1 : this.page; }
    };

    var photonRequest = null;
    var gouvRequest = null;
    var textLength = 0;
    var currentSearchField = null;

    var itiTypesId = ['iti-type-car', 'iti-type-bicycle', 'iti-type-pedestrian', 'iti-type-bus'];
    var currentItiType = itiTypesId[0];

    var mainItem = templatesFunctions.getSearchWidget();
    var mapContainerElem = Jawg._rootElement.querySelector('.map-content');
    mapContainerElem.appendChild(mainItem);

    var containers = {
      'itinerary' : mainItem.querySelector('.search-widget-itinerary'),
      'results' : mainItem.querySelector('.search-widget-results'),
      'itineraryPanel' : mainItem.querySelector('.search-widget-iti-panel'),
      'closeItinerary' : mainItem.querySelector('.search-widget-close-iti'),
      'itineraryTypes' : null
    };

    containers.closeItinerary.addEventListener('click', function() {
      if(containers.itineraryPanel.style.display === 'none') {
        containers.itineraryPanel.style.display = 'block' ;
        containers.closeItinerary.querySelector('span').textContent = 'Close itinerary';
      } else {
        containers.itineraryPanel.style.display = 'none';
        containers.closeItinerary.querySelector('span').textContent = 'Open itinerary';
      }
    });

    Jawg._searchWidgetOpen = false;
    Jawg._toggleSearchWidgetOpen = function() {
      Jawg._searchWidgetOpen = !Jawg._searchWidgetOpen;

      if(Jawg._searchWidgetOpen) {
        mainItem.className = 'search-widget search-widget-open';

        if (Jawg._markersWidgetOpen !== null && Jawg._markersWidgetOpen !== undefined) {
          Jawg._markersWidgetOpen = true;
          Jawg._toggleMarkersWidgetOpen();
        }
        if (Jawg._toggleLayerMenu && Jawg._layerMenuOpened) {
          Jawg._toggleLayerMenu();
        }

      } else {
        mainItem.className = 'search-widget search-widget-closed';
      }
    };

    var reduceElem = mainItem.querySelector('.search-widget-reduce');
    reduceElem.addEventListener("click", function() {
      Jawg._toggleSearchWidgetOpen();
    });

    /*--------------------- Mapping of API data -----------------------*/

    /**
     * Map an item with photon data
     * @param photonItem
     * @returns {{latlng: *[], name: (Object|*), bounds: *[]}}
     */
    var mapPhoton = function(photonItem){
      // Get photon POI data
      var photonLatlng = photonItem.geometry.coordinates;
      var photonBounds = photonItem.properties.extent;

      var latlng = [photonLatlng[1], photonLatlng[0]];
      var bounds = photonBounds ? [ [photonBounds[1],photonBounds[0]] , [photonBounds[3],photonBounds[2]] ] : null;

      var labelTab = ['name', 'housenumber', 'street', 'city', 'state', 'country'];

      // Build the label according to labelTab fields
      var label = labelTab.reduce(function (previousValue, now, index, arr) {
        var returnedLabel = photonItem.properties[now];

        var separator = ', ';

        // Test if we have a number, dont show ','
        if (index > 0 && !isNaN(photonItem.properties[arr[index - 1]])) {
          separator = ' ';
        }

        if (!previousValue || !previousValue.length) {
          return returnedLabel;
        } else if (returnedLabel) {
          return previousValue + separator + returnedLabel;
        } else {
          return previousValue;
        }
      }, 0);
      return {'latlng' : latlng, 'name': label, 'bounds' : bounds};
    };

    /**
     * Map an item with adresse.data.gouv data
     * @param gouvItem
     * @returns {{latlng: *[], name: *, bounds: null}}
     */
    var mapGouv = function(gouvItem){
      var gouvLatlng = gouvItem.geometry.coordinates;
      var latlng = [gouvLatlng[1], gouvLatlng[0]];
      var label = gouvItem.properties.label;
      return {'latlng' : latlng, 'name': label, 'bounds' : null};
    };

    /**
     * Map an item with conf points
     * @param point
     * @returns {{latlng: *[], name: *, internal: boolean}}
     */
    var mapPoints = function(point){
      return {'latlng' : point.latLngTable, 'name' : point.name, 'internal' : true};
    };

    /*------------------------------------------------------------------*/
    /*--------------------- Itinerary management ----------------------*/
    /*----------------------------------------------------------------*/

    /**
     * Show the itinerary panel and the 4 types buttons
     */
    var showItinerary = function() {
      // Bind the itinerary field
      var itiSearchClone = templatesFunctions.getItinerary();
      containers.itinerary.appendChild(itiSearchClone);
      containers.itineraryTypes = mainItem.querySelector('.iti-types');
      var itinerarySearchElem = mainItem.querySelector(".itinerary-search");
      itinerarySearchElem.addEventListener("keyup", keyupEvent, false);
      itinerarySearchElem.addEventListener("click",
        function() {
          showSearchResults();
        }
      );

      var currentItiTypeDomItem = itiSearchClone.querySelector('.'+currentItiType);
      currentItiTypeDomItem.className = currentItiTypeDomItem.className.replace(' selected','') + ' selected';

      // Bind type buttons
      itiTypesId.forEach(function(itiType){
        itiSearchClone.querySelector('.'+itiType).addEventListener('mousedown', function(){
          var thatElem = this;
          var lastType = itiSearchClone.querySelector('.'+currentItiType);
          lastType.className = lastType.className.replace(' selected','');
          currentItiType = itiType;
          thatElem.className = thatElem.className + ' selected';
          showSearchResults(true);
        });
      });
    };

    /**
     * Set the view of routes from API
     * @param result
     * @param mapper
     */
    var routeView = function(result, mapper) {
      var routes = mapper(result);


      var cloneNav = templatesFunctions.getItineraryPanel();

      cloneNav.querySelector('.tpl-dist').textContent = 'Travel distance: ' + routeDistance(routes.distance);
      cloneNav.querySelector('.tpl-time').textContent = 'Travel time: ' + routeTime(routes.time);
      cloneNav.querySelector('.tpl-desc').textContent = '';

      routePagination.nbPage = Math.ceil(routes.maneuvers.length / routePagination.itemPerPage);
      routePagination.page = 0;

      cloneNav.querySelector('.tplp-current').textContent = routePagination.page+1;
      cloneNav.querySelector('.tplp-end').textContent = routePagination.nbPage;

      var routeDescriptor = cloneNav.querySelector('.tpl-desc');
      var currentPage = cloneNav.querySelector('.tplp-current');

      var refreshRouteView = function() {
        currentPage.textContent = routePagination.page+1;
        var visibleManeuvers = routes.maneuvers.slice(routePagination.page*routePagination.itemPerPage, (routePagination.page+1)*routePagination.itemPerPage);
        routeDescriptor.textContent = '';
        visibleManeuvers.forEach(function(maneuver){

          var cloneManeuver = templatesFunctions.getManeuver();
          cloneManeuver.querySelector('.tpl-maneuver-desc').textContent = maneuver.text;
          cloneManeuver.querySelector('.tplm-dist').querySelector('span').textContent = routeDistance(maneuver.distance);

          routeDescriptor.appendChild(cloneManeuver);

        });
      };

      refreshRouteView();

      cloneNav.querySelector('.tplp-back').addEventListener('click', function(){
        routePagination.previousPage();
        refreshRouteView();
      });

      cloneNav.querySelector('.tplp-next').addEventListener('click', function(){
        routePagination.nextPage();
        refreshRouteView();
      });


      containers.itineraryPanel.appendChild(cloneNav);


      addClass(containers.closeItinerary, 'shown');
    };


    /*

     Owner : OSRM
     API here : https://github.com/Project-OSRM/osrm-backend/wiki/Server-api
     Decode function found HERE : https://github.com/Project-OSRM/osrm-frontend/blob/master/WebContent/routing/OSRM.RoutingGeometry.js

     This program is free software; you can redistribute it and/or modify
     it under the terms of the GNU AFFERO General Public License as published by
     the Free Software Foundation; either version 3 of the License, or
     any later version.
     This program is distributed in the hope that it will be useful,
     but WITHOUT ANY WARRANTY; without even the implied warranty of
     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
     GNU General Public License for more details.
     You should have received a copy of the GNU Affero General Public License
     along with this program; if not, write to the Free Software
     Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
     or see http://www.gnu.org/licenses/agpl.txt.
     */
    // OSRM routing geometry
    // [renders routing geometry]

    //decode compressed route geometry
    var decodeOSRM = function(encoded, precision) {
      precision = Math.pow(10, -precision);
      var len = encoded.length, index=0, lat=0, lng = 0, array = [];
      while (index < len) {
        var b, shift = 0, result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        //array.push( {lat: lat * precision, lng: lng * precision} );
        array.push( [lat * precision, lng * precision] );
      }
      return array;
    };

    var getOSRMData = function(osrmResults) {
      var routeGeometry = decodeOSRM(osrmResults.route_geometry, 6);
      var instructions = osrmResults.route_instructions;

      var locations = [];

      if(Jawg._itinerary) {
        Jawg.map.removeLayer(Jawg._itinerary);
      }
      Jawg._itinerary = L.polyline(routeGeometry, {color: 'blue'});
      Jawg.map.addLayer(Jawg._itinerary);
      Jawg.map.fitBounds(Jawg._itinerary.getBounds());

      var routes = {
        'time' : 0,
        'distance' : 0,
        'maneuvers' : []
      };

      var i;
      for (i = 0; i<instructions.length; i++) {
        var currentInstruction = instructions[i];
        routes.time += currentInstruction[4];
        routes.distance += currentInstruction[2]/1000.0;
        var maneuver = {
          'time' :  currentInstruction[4],
          'distance' : currentInstruction[2]/1000.0,
          'lat' : routeGeometry[currentInstruction[3]][0],
          'lon' : routeGeometry[currentInstruction[3]][1],
          'text' : currentInstruction[1],
          'icon' : ''
        };
        routes.maneuvers.push(maneuver);
      }

      return routes;

    };

    /**
     * Set the view of navitiaData
     * @param navitiaData
     */
    var navitiaJourneyView = function(navitiaData){
      var journeys = navitiaData.journeys;
      journeys.forEach(function(journey, index){

        var jDuration = routeTime(journey.duration);
        var jSteps = journey.sections.length;
        var jDep = navitiaTime(journey.departure_date_time);
        var jArr = navitiaTime(journey.arrival_date_time);

        var templateNavitia = templatesFunctions.getNavitia();
        var titleNavField = templateNavitia.querySelector('.journey-title');
        titleNavField.textContent = 'Journey n°' + (index+1) + ' - ' +jDuration;

        templateNavitia.querySelector('.jd-steps').textContent = 'Steps: ' + jSteps;
        templateNavitia.querySelector('.jd-dep').textContent = 'Departure time: ' + jDep;
        templateNavitia.querySelector('.jd-arr').textContent = 'ArrivalTime: ' + jArr;

        var sections = journey.sections;
        var sectionsDescriptor = '<ol>';
        sections.forEach(function(section) {
          sectionsDescriptor += '<li>';
          if(section.type === 'waiting'){
            sectionsDescriptor += '<i class="fa fa-street-view"></i> Wait ' + routeTime(section.duration);
          } else if(section.type === 'street_network' || section.type === 'transfer') {
            sectionsDescriptor += '<i class="fa fa-male"></i> Walk ' + routeTime(section.duration) +
              '<br/> From: <strong>' + section.from.name + '</strong>' +
              '<br/> To: <strong>' + section.to.name + '</strong>';
          } else if(section.type === 'public_transport') {
            sectionsDescriptor += '<i class="fa fa-train"></i> '+section.display_informations.physical_mode + ' '+ section.display_informations.label +
              '<br/> Direction: <strong>' + section.display_informations.direction + '</strong>' +
              '<br/> ' + navitiaTime(section.departure_date_time) +'-'+ navitiaTime(section.arrival_date_time) +
              '<br/> From: <strong>' + section.from.name + '</strong>' +
              '<br/> To: <strong>' + section.to.name + '</strong>' +
              '<br/> Duration: '+ routeTime(section.duration);
          }
          sectionsDescriptor += '</li>';
        });
        templateNavitia.querySelector('.journey-sections').innerHTML = sectionsDescriptor + '</ol>';

        containers.itineraryPanel.appendChild(templateNavitia);
        addClass(containers.closeItinerary, 'shown');
      });
    };

    /**
     * Search itinerary with from to latlng according to the current type
     * @param from
     * @param to
     */
    var searchItinerary = function(from, to) {

      //Clear description of route when asking new request
      containers.itineraryPanel.textContent = '';

      var fromStr = '';
      var toStr = '';

      if(currentItiType === 'iti-type-bus'){

        fromStr = from[1] + ';' + from[0];
        toStr = to[1] + ';' + to[0];
        var dateTime = navitiaDate(new Date());

        Jawg._utils.callHttpReq('GET',
            'http://api.navitia.io/v1/journeys?from='+fromStr+'&to='+toStr+'&datetime='+dateTime,
          { 'Authorization' : '82b082ec-424c-4e84-ac51-3d499d575be1'})
          .success(navitiaJourneyView);
      } else {

        fromStr = from[0] + ',' + from[1];
        toStr = to[0] + ',' + to[1];

        var request = "http://router.project-osrm.org/viaroute?loc="+fromStr+"&loc="+toStr+"&instructions=true";

        Jawg._utils.callHttpReq('GET', request).success(function(data) {
          routeView(data, getOSRMData);
        });

      }
    };

    /*------------------- Simple search management --------------------*/

    /**
     * Show a searched location and bind the click
     * @param searchItem
     */
    var showSearchItem = function(searchItem) {
      // Add the template in the view
      var notVisible = false;
      if (searchItem.internal) {
        for (var i = 0; i < Jawg._conf.points.length && !notVisible; i++) {
          if (!Jawg._conf.points[i].enable && Jawg._conf.points[i].name === searchItem.name) {
            notVisible = true;
          }
        }
      }
      var searchElemClone = templatesFunctions.getField(notVisible);
      searchElemClone.querySelector('.name').textContent = searchItem.name;
      containers.results.appendChild(searchElemClone);

      // Bind the new elem for click (need to search the last .search-elem created)
      var searchElemJS = document.querySelectorAll('.search-elem');
      var lastElem = searchElemJS[searchElemJS.length-1];

      lastElem.addEventListener("click", function(){ clickOnResult(searchItem); } );
    };

    /**
     * Event when clicking on a searched item
     * @param searchItem
     */
    var clickOnResult = function(searchItem) {
      if(!searchItem) {
        return false;
      }

      if(searchItem.bounds) {
        Jawg.map.fitBounds(searchItem.bounds);
      } else {
        Jawg.map.setView(searchItem.latlng, Jawg._conf.searchZoom);
      }

      if(searchMarker) {
        Jawg.map.removeLayer(searchMarker);
        searchMarker = null;
      }
      if(!searchItem.internal) {
        searchMarker = new L.marker(searchItem.latlng);
        Jawg.map.addLayer(searchMarker);
      }

      currentSearchField.value = searchItem.name;
      currentSearchField.latlng = searchItem.latlng;
      currentSearchField.bounds = searchItem.bounds;
      containers.results.textContent = '';

      var itiItem = mainItem.querySelector('.itinerary-search');
      var locItem = mainItem.querySelector('.map-search');

      if(!itiItem) {
        showItinerary(true);
        itiItem = mainItem.querySelector('.itinerary-search');
      }

      if(itiItem.value && locItem.value) {
        searchItinerary(locItem.latlng, itiItem.latlng);
      }

      var parent = currentSearchField.parentNode;
      var focusBtn = parent.querySelector('.eye-btn');
      var delBtn = parent.querySelector('.del-btn');

      addClass(focusBtn, 'shown');
      addClass(delBtn, 'shown');

      focusBtn.parentField = delBtn.parentField = currentSearchField; // sibling search field

      focusBtn.addEventListener('click', function(){
        if(this.parentField.bounds) {
          Jawg.map.fitBounds(this.parentField.bounds);
        } else {
          Jawg.map.setView(this.parentField.latlng, Jawg._searchZoom);
        }

        if(searchMarker) {
          Jawg.map.removeLayer(searchMarker);
          searchMarker = null;
        }

        if(!searchItem.internal) {
          searchMarker = new L.marker(this.parentField.latlng);
          Jawg.map.addLayer(searchMarker);
        }

      });

      delBtn.addEventListener('click', function(){
        this.parentField.value = '';

        removeClass(focusBtn, 'shown');
        removeClass(delBtn, 'shown');

        if(searchMarker) {
          Jawg.map.removeLayer(searchMarker);
          searchMarker = null;
        }

        if(Jawg._itinerary) {
          Jawg.map.removeLayer(Jawg._itinerary);
          Jawg._itinerary = null;
        }

        if(locItem === this.parentField) {
          containers.itinerary.textContent = '';
        }

        containers.itineraryPanel.style.display = "none";
        containers.closeItinerary.style.display = "none";
        containers.itineraryTypes.style.display = "none";

      });
    };

    /*-------------------------- Listeners ----------------------------*/

    var showSearchResults = function(acceptFirst) {
      if(photonRequest) {
        photonRequest.abort();
      }

      if(gouvRequest) {
        gouvRequest.abort();
      }

      var photonSearch = [];
      var gouvSearch = [];

      var endSearch = function() {

        // Filter and map points to be readable on the view
        var pointsSearch = Jawg._conf.points.filter(
          function(currentPoint){
            var name = '';
            if(currentPoint.name) {
              name = currentPoint.name.toLowerCase();
            }

            var value = currentSearchField.value.toLowerCase();
            return name.indexOf(value) >= 0 && value !== '';
          }).map(mapPoints);
        var searchTab = pointsSearch.concat(gouvSearch).concat(photonSearch);

        // Clean the search results
        containers.results.textContent = '';

        if(acceptFirst) {
          clickOnResult(searchTab[0]);
        } else {
          searchTab.forEach(function(item){
            showSearchItem(item);
          });
        }

      };

      var callGouvRequest = function() {
        if(currentSearchField.value.length > 0) {
          Jawg._utils.callHttpReq('GET', 'http://api-adresse.data.gouv.fr/search/?q='+currentSearchField.value)
            .success(function(gouvResult) {
              gouvSearch = gouvResult.features.map(mapGouv);
            }).then(endSearch);
        } else {
          endSearch();
        }
      };

      if(currentSearchField) {
        if(Jawg._conf.osmSearch) {
          photonRequest = Jawg._utils.callHttpReq('GET', 'http://photon.komoot.de/api/?q='+currentSearchField.value)
            .success(function(photonResult) {
              photonSearch = photonResult.features.map(mapPhoton);
            }).then(callGouvRequest);
        } else {
          endSearch();
        }
      }
    };

    /**
     * Bind the keyup on search textfields
     */
    var keyupEvent = function(e) {
      currentSearchField = this;
      var acceptFirst = e.which == 13 || e.which == 9;

      if(textLength != currentSearchField.value.length) {
        if (currentSearchField.value.length === 0) {
          containers.results.textContent = '';
        } else {
          showSearchResults(acceptFirst);
        }
      }

      textLength = currentSearchField.value.length;
    };

    var launchSearchElem = mainItem.querySelector('.search-widget-button');
    launchSearchElem.addEventListener("click", function() {
      if(Jawg._searchWidgetOpen) {
        showSearchResults(true);
      } else {
        Jawg._toggleSearchWidgetOpen();
      }
    });


    // Bind the search field

    var mapSearchElem = mainItem.querySelector('.map-search');
    mapSearchElem.addEventListener("keyup", keyupEvent, false);
    mapSearchElem.addEventListener("click", function() {
      showSearchResults();
    } );


    Jawg.map.on('click', function(){
      containers.results.textContent = '';
    });

    /*----------------------- Utils functions -------------------------*/

    /**
     * Transform a number (in seconds) to a readable number in minutes or hours
     * @param number
     * @returns {number}
     */
    var routeTime = function(number) {
      var time = +number / 60.0; //Parsing in minutes
      if(time > 60) {
        var hour = Math.floor(time/60);
        var min = Math.floor(time%60);
        if(min < 10){
          min = '0'+min;
        }
        time = hour + 'h' + min + 'min';
      } else {
        time = Math.round(time) + 'min';
      }

      return time;
    };

    /**
     * Transform a number into distance readable view
     * @param number
     * @returns {string}
     */
    var routeDistance = function(number) {
      if(+number < 1){
        return Math.round(+number*1000)+'m';
      }else if(+number < 10){
        return (Math.round(+number*10)/10)+'km';
      }else {
        return Math.round(+number)+'km';
      }
    };

    /**
     * Put a zero before one char numbers
     * @param num
     * @returns {string}
     */
    var convertTime = function(num) {
      if(num < 10) {
        return '0'+num;
      } else {
        return ''+num;
      }
    };

    /**
     * Convert a date to be readable by navitia api YYYYMMDDThhmmss
     * @param date
     * @returns {string}
     */
    var navitiaDate = function(date) {
      var month = convertTime(date.getMonth()+1);
      var day = convertTime(date.getDate());
      var hours = convertTime(date.getHours());
      var minutes = convertTime(date.getMinutes());

      return '' + date.getFullYear() + month + day + 'T' + hours + minutes;
    };

    /**
     * Transform a navitia duration to be readable
     * @param date
     * @returns {string}
     */
    var navitiaTime = function(date) {
      if(date) {
        var time = date.split('T')[1];
        var hour = time.substring(0,2);
        var minutes = time.substring(2,4);
        return hour+'h'+minutes;
      }
      return '';
    };
  }

  //-------------------------------------------------//
  //------------------ Markers menu -----------------//
  //-------------------------------------------------//
  function activateMarkerMenu() {

    if (Jawg._conf.points.length === 0) {
      flagMarkerMenu = true;
      return;
    }

    var savedZoom = Jawg.map.getZoom();
    var popup;

    var position = Jawg._conf.markerMenuPanelPosition;
    var poiPanel = document.createElement('div');
    var poiContent = document.createElement('div');
    var map = Jawg._rootElement.querySelector('.map-content');

    var selectedPoint = null;
    var mode = 'list';

    function filterFields(obj) {
      return function(key, value) {
        if (key === 'marker') {
          return '';
        }
        return value;
      }
    }

    var findIn = function(str, obj) {
      if (obj) {
        str = str.toLowerCase();
        var strObj = JSON.stringify(obj, filterFields(obj)).toLowerCase();
        return strObj.indexOf(str) >= 0;
      } else {
        return false;
      }
    };

    var initWidget = function() {
      poiPanel.setAttribute('class', 'poi-widget-panel' + ' panel-' + position);
      poiContent.setAttribute('class', 'poi-widget-panel-content');

      Jawg._rootElement.appendChild(poiPanel);

      var showPanelBtn = document.createElement('div');
      showPanelBtn.setAttribute('class', 'poi-widget-show-btn');

      var poiContainer = document.createElement('div');
      poiContainer.setAttribute('class', 'poi-widget-container');


      var showPanelBtnIcon = document.createElement('i');
      showPanelBtnIcon.setAttribute('class', 'fa fa-chevron-left');


      showPanelBtn.appendChild(showPanelBtnIcon);
      poiPanel.appendChild(showPanelBtn);
      poiContainer.appendChild(poiContent);
      poiPanel.appendChild(poiContainer);

      Jawg._markersWidgetOpen = false;
      Jawg._toggleMarkersWidgetOpen = function(){
        Jawg._utils.addClass(Jawg._rootElement, 'markers-' + position);
        Jawg._utils.addClass(map, 'markers-' + position);

        if (position === 'left') {
          showPanelBtnIcon.setAttribute('class', 'fa fa-chevron-left');
        } else if (position === 'right') {
          showPanelBtnIcon.setAttribute('class', 'fa fa-chevron-right');
        } else if (position === 'bottom') {
          showPanelBtnIcon.setAttribute('class', 'fa fa-chevron-down');
        } else if (position === 'top') {
          showPanelBtnIcon.setAttribute('class', 'fa fa-chevron-up');
        }

        if (Jawg._markersWidgetOpen) {
          Jawg._markersWidgetOpen = false;
          poiPanel.setAttribute('class', 'poi-widget-panel' + ' panel-' + position + ' poi-panel-close');
        } else {
          Jawg._markersWidgetOpen = true;
          poiPanel.setAttribute('class', 'poi-widget-panel' + ' panel-' + position + ' poi-panel-open');

          if (Jawg._searchWidgetOpen != null && Jawg._searchWidgetOpen !== undefined) {
            Jawg._searchWidgetOpen = true;
            Jawg._toggleSearchWidgetOpen();
          }
          if (Jawg._toggleLayerMenu && Jawg._layerMenuOpened) {
            Jawg._toggleLayerMenu();
          }

        }
        setTimeout(function() { Jawg.map.invalidateSize(true) }, 300);
      };

      showPanelBtn.addEventListener('click', Jawg._toggleMarkersWidgetOpen);
      Jawg._markersWidgetOpen = !Jawg._markersWidgetOpen;

      Jawg._toggleMarkersWidgetOpen()
    };

    Jawg.map.on('moveend', function(){
      if (mode === 'list') {
        modeList();
      }
    });

    var modePoi = function() {
      mode = 'list';
      poiContent.textContent = '';

      var point = selectedPoint;
      var type = point.typeItem;



      var poiHeader = document.createElement('div');
      poiHeader.setAttribute('class', 'poi-widget-header');
      var pointPan = document.createElement('div');
      pointPan.setAttribute('class', 'poi-widget-point-pan');

      var pointPanBack = document.createElement('div');
      pointPanBack.setAttribute('class', 'poi-widget-point-pan-back');

      var pointPanBackIcon = document.createElement('i');
      pointPanBackIcon.setAttribute('class', 'fa fa-arrow-circle-left');

      //var pointPanBackSpan = document.createElement('span');
      //pointPanBackSpan.textContent = ' Go back to list.';

      var pointPanHead = document.createElement('div');
      pointPanHead.setAttribute('class', 'poi-widget-point-pan-head');

      var pointPanDetails = document.createElement('div');
      pointPanDetails.setAttribute('class', 'poi-widget-point-pan-details');

      var pointElemPictureContainer = document.createElement('div');
      pointElemPictureContainer.setAttribute('class', 'poi-widget-point-pan-head-pic');

      var pointElemPicture = document.createElement('img');
      if (type.icon) {
        pointElemPicture.setAttribute('src', point.iconUrl);
      }

      var pointElemName = document.createElement('div');
      pointElemName.setAttribute('class', 'poi-widget-point-pan-name');

      var pointElemNameSpan = document.createElement('span');
      pointElemNameSpan.textContent = point.name;

      pointPanBack.appendChild(pointPanBackIcon);
      pointPan.appendChild(pointPanBack);

      pointElemPictureContainer.appendChild(pointElemPicture);
      pointPanHead.appendChild(pointElemPictureContainer);
      pointElemName.appendChild(pointElemNameSpan);

      poiHeader.appendChild(pointPanBack);
      poiHeader.appendChild(pointElemName);

      pointPan.appendChild(pointPanHead);
      pointPan.appendChild(pointPanDetails);
      poiContent.appendChild(poiHeader);
      poiContent.appendChild(pointPan);


      var valuesKey = Object.keys(point.fields);

      if (valuesKey) {
        valuesKey.forEach(function(value, index){
          if (value && point.fields[value] && point.fields[value].length > 0) {
            var valueElem = document.createElement('div');
            var valueUp = value.charAt(0).toUpperCase() + value.slice(1);
            valueElem.textContent = valueUp +' : '+ point.fields[value];
            pointPanDetails.appendChild(valueElem);
          }
        });
      }


      // CLICK ON BACK BUTTON
      pointPanBack.addEventListener('click', function(){
        if (savedZoom < Jawg.map.getZoom()) {
          Jawg.map.setZoom(savedZoom);
        }
        if (popup) {
          Jawg.map.closePopup();
        }
        modeList();
      });
    };

    var searchingStr = '';
    var searchItems = null;

    var showList = function() {

      var shownBounds = Jawg.map.getBounds();

      var i = 0;

      Jawg._conf.points.forEach( function(point) {
        var type = point.typeItem;


        if (shownBounds.contains(point.latLngTable) && point.enable && type && findIn(searchingStr, point)) {

          if (i < 100) {

            var pointElem = document.createElement('div');
            pointElem.setAttribute('class', 'poi-widget-point');
            pointElem.point = point;

            var pointElemPictureContainer = document.createElement('div');
            pointElemPictureContainer.setAttribute('class', 'poi-widget-point-pic');
            pointElem.appendChild(pointElemPictureContainer);

            var pointElemPicture = document.createElement('img');
            if (type && type.icon) {
              pointElemPicture.setAttribute('src', point.iconUrl);
            }
            pointElemPictureContainer.appendChild(pointElemPicture);

            var pointElemRight = document.createElement('div');
            pointElemRight.setAttribute('class', 'poi-widget-point-right');
            pointElem.appendChild(pointElemRight);

            var pointElemName = document.createElement('span');
            pointElemName.setAttribute('class', 'poi-widget-point-name');
            pointElemName.textContent = point.name;
            pointElemRight.appendChild(pointElemName);

            var values = point.values;

            searchItems.appendChild(pointElem);

            // ADD EVENT ON PANEL BUTTONS
            pointElem.addEventListener('click', function(){
              savedZoom = Jawg.map.getZoom();
              Jawg.map.setView(this.point.latLng, Jawg._conf.maxZoom);
              point.marker.openPopup();
              selectedPoint = this.point;

              popup = L.popup().setContent(pointElem.point.name);
              pointElem.point.marker.bindPopup(popup);
              pointElem.point.marker.openPopup();

              modePoi();
              if (!Jawg._markersWidgetOpen) {
                Jawg._toggleMarkersWidgetOpen();
              }

            });

          }

          i++;


          // ADD EVENT ON MARKERS
          if (Jawg._conf.markerMenuClickMarker) {
            point.marker.removeEventListener('click');
            point.marker.on('click', function(){
              savedZoom = Jawg.map.getZoom();
              Jawg.map.setView(point.latLngTable, Jawg._conf.maxZoom);
              selectedPoint = point;

              popup = L.popup().setContent(point.name);
              point.marker.bindPopup(popup);
              point.marker.openPopup();

              modePoi();
              if (!Jawg._markersWidgetOpen) {
                Jawg._toggleMarkersWidgetOpen();
              }
            });
          }
        }
      });

      if (i >= 100) {
        var limitElem = document.createElement('div');
        limitElem.style.padding = '10px';
        limitElem.style.fontSize = '12px';
        limitElem.textContent = '100 points on ' + i +' shown, specify more criterias.';
        searchItems.appendChild(limitElem);
      }

      if (poiContent.textContent.length === 0) {
        searchItems.textContent = "You have no points available here, move the map to find one.";
        searchItems.style.padding = '10px';
        searchItems.style.boxSizing = 'border-box';
      } else {
        searchItems.style.padding = '0px';
        searchItems.style.boxSizing = 'auto';
      }

    };

    var modeList = function() {

      mode = 'list';
      poiContent.textContent = '';

      var searchPoi = document.createElement('div');
      searchPoi.className = 'poi-widget-search';
      searchPoi.innerHTML =
          '<input type="text"/>' +
          '<div class="search-icon">' +
          '<i class="fa fa-search"></i>' +
          '</div>';
      poiContent.appendChild(searchPoi);

      searchItems = document.createElement('div');
      searchItems.className = 'poi-widget-list-search';
      poiContent.appendChild(searchItems);

      var search = searchPoi.querySelector('input');
      search.value = searchingStr;
      search.addEventListener('keyup', function(){
        searchingStr = this.value;
        searchItems.innerHTML = '';
        showList();
      });

      showList();
    };

    initWidget();
    modeList();
  }

  //-------------------------------------------------//
  //---------------------- Utils --------------------//
  //-------------------------------------------------//

  /**
   * Handle http request
   * @param method
   * @param url
   * @param headers
   * @returns {XMLHttpRequest}
   */
  function callHttpReq(method, url, headers) {
    var hreq = new XMLHttpRequest();

    hreq.onreadystatechange = function() {
      if (hreq.readyState == 4) {
        if (hreq.status >= 200 && hreq.status < 300) {
          if (hreq.successFunction) {
            hreq.successFunction(JSON.parse(hreq.responseText));
          }
        } else if (hreq.status >= 400 && hreq.status < 600) {
          if (hreq.errorFunction) {
            hreq.errorFunction();
          } else {
            console.error('Error status : ' + hreq.status);
          }
        }
        if (hreq.thenFunction) {
          hreq.thenFunction();
        }
      }
    };

    hreq.error = function(callback) {
      hreq.errorFunction = callback;
      return hreq;
    };

    hreq.success = function(callback) {
      hreq.successFunction = callback;
      return hreq;
    };

    hreq.then = function(callback) {
      hreq.thenFunction = callback;
      return hreq;
    };

    hreq.open(method, url, true);

    if (headers) {
      var headersKeys = Object.keys(headers);
      headersKeys.forEach(function(headerKey) {
        hreq.setRequestHeader(headerKey, headers[headerKey]);
      });
    }

    hreq.send(null);
    return hreq;
  };

  function addClass(elem, clazz) {
    if (elem.className.indexOf(clazz) < 0) {
      if (elem.className.length !== 0) {
        elem.className += " ";
      }
      elem.className += clazz;
    }
  }

  function removeClass(elem, clazz) {
    elem.className = elem.className.replace(' ' + clazz, '').replace(clazz + ' ', '').replace(clazz, '');
  }

  function Map() {
    this.keys = [];
    this.data = {};

    this.put = function(key, value) {
      if (!this.data[key]) {
        this.keys.push(key);
      }
      this.data[key] = value;
    };

    this.get = function(key) {
      return this.data[key];
    };

    this.remove = function(key) {
      var index = this.keys.indexOf(key);
      if (index > -1) {
        this.keys.splice(index, 1);
      }
      this.data[key] = null;
    };

    this.removeAll = function() {
      this.keys.splice(0, this.keys.length);
      this.data = {};
    };

    this.each = function(fn) {
      if (typeof fn != 'function') {
        return;
      }
      var len = this.keys.length;
      for (var i = 0; i < len; i++) {
        var k = this.keys[i];
        fn(k, this.data[k], i);
      }
    };

    this.entrys = function() {
      var len = this.keys.length;
      var entrys = new Array(len);
      for (var i = 0; i < len; i++) {
        entrys[i] = {
          key: this.keys[i],
          value: this.data[i]
        };
      }
      return entrys;
    };

    this.isEmpty = function() {
      return this.keys.length === 0;
    };

    this.size = function() {
      return this.keys.length;
    };
  }
})();
