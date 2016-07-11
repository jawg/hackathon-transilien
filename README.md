##Jawg Widgets
===================

OpenSource Javascript widgets for OpenStreetMap maps.  
This Library allows you to make a seamless integration of a map on your websites.  
It uses the latest User Experience guidelines and best practices, and does not require a lot of coding skills for integration.  

Configuration
-------------

This is a specific version of Jawg Widgets preconfigured for Transilien.

Screenshots
-------------

![Base map widget](/images/jawg4.png)
![Floors widget](/images/jawg3.png)  
![Markers-Menu widget](/images/jawg1.png)
![Markers widget](/images/jawg2.png)

Dependencies
-------------

To be able to use Jawg Widgets in your project, you need to import Leaflet.

```
<link rel="stylesheet" href="http://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css">
```

```
<script src="http://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.js"></script>
```

You can access the Leaflet map related to Jawg Widgets, using the Jawg object : 
```
Jawg.map
```


Widgets
-------------

By default, the script will search for the html element with the id 'jawgmaps', and initialize the map in it.

This map can be customize with widgets:

Widgets are used to add more features on your map according to your needs.
You can find 4 widgets : search, pois, pois-menu, refresh

To enable the widgets, you need to call the activateWidgets function in the Jawg object with one string array, containing the different widgets you wish to activate: 

```
Example : 

Jawg.activateWidgets(["refresh", "pois", "search", "pois-menu"]);
```

If needed, you can target another element, and change the map configuration, calling the method init in the Jawg object with 2 arguments:
>- A map configuration object
>- The ID of the HTML element to inject the map into

```  
Example : 

Jawg.init(myConf, "my_map_id");

```
 
Here is an example of the myConf object : 
```
var mapConf = {
  "tileServer": "https://my.tyle.server/{z}/{x}/{y}.png",
  "floorLayerServer": "https://my.tyle.server/{0}/{z}/{x}/{y}.png",
  "poiServer": "https://my.poi.storage.server",
  "initialZoom": 11,
  "initialLocation": [48.862499, 2.336400],
  "displayFloorZoom": 15,
  "apiKey": "012345678901234567890123456789",
  "datasetId": "my_dataset"
};
```
Attributes :
>- tileServer: The generic URL for the tile server
>- floorLayerServer: The generic URL for the floors tile server
>- poiServer: The URL for the POI server
>- initialZoom: The starting zoom on the map
>- initialLocation: The starting location on the map
>- displayFloorZoom: The zoom level where floors are displayed,
>- apiKey: The apiKey related to the poi server account,
>- datasetId: The dataset id of the POIs displayed


**Licence**
===========
Copyright (C) 2000-2016 eBusiness Information
 
 This file is part of Jawg Widgets.
 
 Jawg Widgets is free software: you can redistribute it and/or modify it under the terms of the GNU  General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 
Jawg Widgets is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without  even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License along with Jawg Widgets.  If not, see <http://www.gnu.org/licenses/>.

**Contributors**
===========
jasonconard  
anthonysalembier  
kbottero
