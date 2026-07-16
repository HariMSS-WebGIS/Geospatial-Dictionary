// GIS & WebGIS Dictionary - Core Application Logic

// Register Service Worker for PWA (Offline Support)
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('[Service Worker] Registered successfully', reg.scope))
      .catch((err) => console.error('[Service Worker] Registration failed', err));
  });
}

// Global Application State
const state = {
  currentCategory: 'all',
  searchQuery: '',
  activeLetter: '',
  selectedTermId: null,
  isSpeaking: false,
  speechUtterance: null,
  activeWikiResult: null,
  customTerms: [], // Memory cache for custom terms to prevent fetch loops on typing
  isAdmin: new URLSearchParams(window.location.search).get('admin') === 'true' // Secret admin mode for deletion
};

// Strict list of geospatial/mapping technology software, formats, and methods to validate search results
const SPATIAL_KEYWORDS = [
  'gis', 'webgis', 'geospatial', 'raster', 'geojson', 'crs', 'wms', 'wfs', 'postgis', 
  'leaflet', 'openlayers', 'geoprocessing', 'kml', 'geotiff', 'dem', 'dsm', 'dtm', 'wmts', 
  'photogrammetry', 'remote sensing', 'orthophoto', 'orthorectification', 'lidar', 'shapefile', 
  'spatial index', 'geocoding', 'spatial join', 'map projection', 'spatial database', 'geodatabase',
  'arcgis', 'qgis', 'mapbox', 'openstreetmap', 'geopackage', 'geodetic', 'geodesy',
  'gnss', 'insar', 'gcp', 'gsd', 'wcs', 'csw', 'gml', 'srs', 'wgs', 'utm', 'epsg', 'ogc',
  'geostatistics', 'topography', 'cartography', 'geographic coordinate', 'spatial coordinate',
  'geographic information', 'spatial analysis', 'spatial data', 'spatial query', 'spatial reference',
  'satellite imagery', 'aerial imagery', 'spectral signature', 'spectral reflectance',
  'image processing', 'digital image processing', 'pixel', 'multispectral', 'hyperspectral', 'spatial filter', 'convolution', 'spectral',
  'projection', 'reprojection', 'reproject', 'coordinate system', 'reference system', 'ellipsoid', 'geoid', 'datum',
  'image fusion', 'data fusion', 'sensor fusion', 'fusion', 'image registration', 'registration', 'sensor', 'sensors', 'imaging', 'pan-sharpening', 'pansharpening', 'resampling', 'interpolation'
];

// Mapping common geospatial user queries to exact Wikipedia article titles
const SEARCH_ALIASES = {
  'resolution merge': 'pansharpening',
  'resolution merging': 'pansharpening',
  'image merge': 'pansharpening',
  'pan sharpening': 'pansharpening',
  'pan-sharpening': 'pansharpening',
  'image fusion': 'image fusion',
  'data fusion': 'image fusion',
  'sensor fusion': 'sensor fusion',
  'bundle block': 'bundle adjustment',
  'bundle block adjustment': 'bundle adjustment',
  'reprojection': 'map projection',
  'reprojecting': 'map projection',
  'reproject': 'map projection',
  'repojection': 'map projection',
  'dtm': 'digital elevation model',
  'dem': 'digital elevation model',
  'dsm': 'digital elevation model',
  'gcp': 'ground control point',
  'gcps': 'ground control point',
  'crs': 'spatial reference system',
  'srs': 'spatial reference system',
  'gsd': 'ground sample distance',
  'orthorectification': 'orthophoto',
  'orthorectified': 'orthophoto',
  'gnss': 'satellite navigation',
  'global navigation satellite system': 'satellite navigation',
  'gps': 'global positioning system'
};

// Local pre-curated fallback terms for concepts that lack specific Wikipedia pages
const LOCAL_FALLBACK_TERMS = {
  'gnss': {
    title: 'GNSS (Global Navigation Satellite System)',
    definition: 'A general term for satellite navigation systems that provide global geospatial positioning.',
    explanation: 'GNSS (Global Navigation Satellite System) refers to a constellation of satellites providing signals from space that transmit positioning and timing data to GNSS receivers. The receivers then use this data to determine their location. By definition, GNSS provides global coverage. Examples of GNSS constellations include the United States GPS, Russia\'s GLONASS, Europe\'s Galileo, and China\'s BeiDou. GNSS is widely used in surveying, mapping, GIS data collection, and navigation.',
    category: 'gnss',
    referencesUrl: 'https://en.wikipedia.org/wiki/Satellite_navigation'
  },
  'gps': {
    title: 'GPS (Global Positioning System)',
    definition: 'A United States-owned satellite navigation system that provides positioning, navigation, and timing services.',
    explanation: 'The Global Positioning System (GPS) is a utility that provides users with positioning, navigation, and timing (PNT) services. This system consists of three segments: the space segment, the control segment, and the user segment. GPS is a subset constellation under the global umbrella of GNSS.',
    category: 'gnss',
    referencesUrl: 'https://en.wikipedia.org/wiki/Global_Positioning_System'
  },
  'tie point': {
    title: 'Tie Point',
    definition: 'A point in a 3D reconstruction or photogrammetric block that is common to two or more overlapping images.',
    explanation: 'Tie points are identified in multiple overlapping photos and are used to tie the images together during block adjustment (aerial triangulation). They are essential for computing camera positions and generating high-accuracy orthomosaics and digital elevation models. Tie points can be identified manually by an operator (manual tie points) or automatically by image-matching algorithms like SIFT or SURF (automatic tie points).',
    category: 'photogrammetry',
    referencesUrl: 'https://en.wikipedia.org/wiki/Photogrammetry'
  },
  'tie points': {
    title: 'Tie Point',
    definition: 'A point in a 3D reconstruction or photogrammetric block that is common to two or more overlapping images.',
    explanation: 'Tie points are identified in multiple overlapping photos and are used to tie the images together during block adjustment (aerial triangulation). They are essential for computing camera positions and generating high-accuracy orthomosaics and digital elevation models. Tie points can be identified manually by an operator (manual tie points) or automatically by image-matching algorithms like SIFT or SURF (automatic tie points).',
    category: 'photogrammetry',
    referencesUrl: 'https://en.wikipedia.org/wiki/Photogrammetry'
  },
  'bundle block': {
    title: 'Bundle Block Adjustment',
    definition: 'A mathematical technique used in photogrammetry to determine the 3D coordinates of points and the camera calibration parameters from multiple overlapping images.',
    explanation: 'Bundle block adjustment solves for the positions and orientations of all cameras, as well as the 3D positions of tie points, by minimizing the reprojection error between the observed pixel coordinates and the projected 3D points. It is the core algorithm behind modern 3D mapping and photogrammetry software.',
    category: 'photogrammetry',
    referencesUrl: 'https://en.wikipedia.org/wiki/Bundle_adjustment'
  },
  'bundle block adjustment': {
    title: 'Bundle Block Adjustment',
    definition: 'A mathematical technique used in photogrammetry to determine the 3D coordinates of points and the camera calibration parameters from multiple overlapping images.',
    explanation: 'Bundle block adjustment solves for the positions and orientations of all cameras, as well as the 3D positions of tie points, by minimizing the reprojection error between the observed pixel coordinates and the projected 3D points. It is the core algorithm behind modern 3D mapping and photogrammetry software.',
    category: 'photogrammetry',
    referencesUrl: 'https://en.wikipedia.org/wiki/Bundle_adjustment'
  },
  'zindex': {
    title: 'Z-Index (Spatial)',
    definition: 'A property or index value determining the stacking order of overlapping spatial layers on a map.',
    explanation: 'In WebGIS and cartography, z-index (or z-level) determines which vector or raster layer is drawn on top of others. Layers with a higher z-index overlap layers with a lower z-index. Proper management of z-index is critical in web mapping libraries (like Leaflet, OpenLayers, or Mapbox GL) to ensure that points, lines, and polygon base maps are rendered in the correct visual hierarchy.',
    category: 'webgis',
    referencesUrl: 'https://en.wikipedia.org/wiki/Web_mapping'
  },
  'z-index': {
    title: 'Z-Index (Spatial)',
    definition: 'A property or index value determining the stacking order of overlapping spatial layers on a map.',
    explanation: 'In WebGIS and cartography, z-index (or z-level) determines which vector or raster layer is drawn on top of others. Layers with a higher z-index overlap layers with a lower z-index. Proper management of z-index is critical in web mapping libraries (like Leaflet, OpenLayers, or Mapbox GL) to ensure that points, lines, and polygon base maps are rendered in the correct visual hierarchy.',
    category: 'webgis',
    referencesUrl: 'https://en.wikipedia.org/wiki/Web_mapping'
  }
};

// Default Pre-seeded GIS/WebGIS Dictionary Database (with responsive SVG illustrations)
const PRESEEDED_TERMS = [
  {
    id: 'gnss',
    term: 'GNSS (Global Navigation Satellite System)',
    category: 'gnss',
    definition: 'A general term for satellite navigation systems that provide global geospatial positioning.',
    explanation: 'GNSS (Global Navigation Satellite System) refers to a constellation of satellites providing signals from space that transmit positioning and timing data to GNSS receivers. The receivers then use this data to determine their location. By definition, GNSS provides global coverage. Examples of GNSS constellations include the United States GPS, Russia\'s GLONASS, Europe\'s Galileo, and China\'s BeiDou. GNSS is widely used in surveying, mapping, GIS data collection, and navigation.',
    references: [
      { label: 'Wikipedia - Satellite Navigation (GNSS)', url: 'https://en.wikipedia.org/wiki/Satellite_navigation' },
      { label: 'FAA - GNSS Service Overview', url: 'https://www.faa.gov/about/office_org/headquarters_offices/ato/service_units/techops/navservices/gnss' }
    ],
    related: ['GIS', 'Ground Control Point', 'Spatial Reference System', 'RTK (Real-Time Kinematic)'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Space segment / Orbit -->
      <circle cx="200" cy="150" r="100" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6,4"/>
      
      <!-- Earth -->
      <circle cx="200" cy="150" r="45" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="2"/>
      <path d="M 180 120 Q 200 135 220 120" fill="none" stroke="#10b981" stroke-width="1.5"/>
      <path d="M 170 145 Q 190 160 210 140 Q 230 160 235 145" fill="none" stroke="#10b981" stroke-width="1.5"/>
      <text x="200" y="154" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">EARTH</text>
      
      <!-- GNSS Satellite 1 -->
      <g transform="translate(100, 150)">
        <rect x="-10" y="-5" width="20" height="10" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
        <line x1="-25" y1="0" x2="-10" y2="0" stroke="#f59e0b" stroke-width="3"/>
        <line x1="10" y1="0" x2="25" y2="0" stroke="#f59e0b" stroke-width="3"/>
        <!-- Signal wave -->
        <path d="M 0 10 Q 15 25 30 40" fill="none" stroke="#3b82f6" stroke-width="1" stroke-dasharray="3,2" transform="rotate(45)"/>
      </g>
      
      <!-- GNSS Satellite 2 -->
      <g transform="translate(200, 50)">
        <rect x="-10" y="-5" width="20" height="10" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
        <line x1="-25" y1="0" x2="-10" y2="0" stroke="#f59e0b" stroke-width="3"/>
        <line x1="10" y1="0" x2="25" y2="0" stroke="#f59e0b" stroke-width="3"/>
        <!-- Signal wave -->
        <path d="M 0 10 L 0 50" fill="none" stroke="#3b82f6" stroke-width="1" stroke-dasharray="3,2"/>
      </g>
      
      <!-- GNSS Satellite 3 -->
      <g transform="translate(300, 150)">
        <rect x="-10" y="-5" width="20" height="10" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
        <line x1="-25" y1="0" x2="-10" y2="0" stroke="#f59e0b" stroke-width="3"/>
        <line x1="10" y1="0" x2="25" y2="0" stroke="#f59e0b" stroke-width="3"/>
        <!-- Signal wave -->
        <path d="M 0 10 Q -15 25 -30 40" fill="none" stroke="#3b82f6" stroke-width="1" stroke-dasharray="3,2" transform="rotate(-45)"/>
      </g>
      
      <text x="200" y="270" fill="#3b82f6" font-size="12" font-weight="bold" text-anchor="middle">SATELLITE CONSTELLATION (GNSS)</text>
    </svg>`
  },
  {
    id: 'gps',
    term: 'GPS (Global Positioning System)',
    category: 'gnss',
    definition: 'A satellite navigation constellation owned by the United States that provides geopositioning and timing data.',
    explanation: 'The Global Positioning System (GPS), originally Navstar GPS, is a satellite-based radionavigation system owned by the United States government and operated by the United States Space Force. It is one of the global navigation satellite systems (GNSS) that provides geolocation and time information to a GPS receiver anywhere on or near the Earth where there is an unobstructed line of sight to four or more GPS satellites.',
    references: [
      { label: 'GPS.gov - Official Site', url: 'https://www.gps.gov/' },
      { label: 'Wikipedia - GPS', url: 'https://en.wikipedia.org/wiki/Global_Positioning_System' }
    ],
    related: ['GNSS', 'Ground Control Point', 'Spatial Reference System'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Trilateration diagram -->
      <circle cx="150" cy="120" r="80" fill="none" stroke="#3b82f6" stroke-dasharray="3,3" stroke-width="1.5"/>
      <circle cx="250" cy="120" r="90" fill="none" stroke="#ef4444" stroke-dasharray="3,3" stroke-width="1.5"/>
      <circle cx="200" cy="220" r="75" fill="none" stroke="#10b981" stroke-dasharray="3,3" stroke-width="1.5"/>
      
      <!-- Intersecting User Point -->
      <circle cx="190" cy="150" r="5" fill="#fbbf24"/>
      <text x="190" y="142" fill="#fbbf24" font-size="10" font-weight="bold" text-anchor="middle">USER RECEIVER</text>
      
      <!-- Satellites -->
      <circle cx="150" cy="40" r="4" fill="#3b82f6"/>
      <text x="150" y="32" fill="#3b82f6" font-size="9" text-anchor="middle">Sat A</text>
      
      <circle cx="340" cy="120" r="4" fill="#ef4444"/>
      <text x="340" y="112" fill="#ef4444" font-size="9" text-anchor="middle">Sat B</text>
      
      <circle cx="200" cy="295" r="4" fill="#10b981"/>
      <text x="200" y="287" fill="#10b981" font-size="9" text-anchor="middle">Sat C</text>
      
      <text x="200" y="15" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">TRILATERATION POSITIONING (GPS)</text>
    </svg>`
  },
  {
    id: 'rtk',
    term: 'RTK (Real-Time Kinematic)',
    category: 'gnss',
    definition: 'A satellite navigation technique used to enhance the precision of position data derived from satellite-based positioning systems.',
    explanation: 'Real-Time Kinematic (RTK) positioning is a satellite navigation technique used to enhance the precision of position data derived from global navigation satellite systems (GNSS) like GPS, GLONASS, Galileo, and BeiDou. It uses measurements of the phase of the signal\'s carrier wave, rather than the information content of the signal, and relies on a single reference station or interpolated virtual station to provide real-time corrections, providing up to centimeter-level accuracy.',
    references: [
      { label: 'Wikipedia - Real-Time Kinematic', url: 'https://en.wikipedia.org/wiki/Real-time_kinematic' }
    ],
    related: ['GNSS', 'Ground Control Point', 'GIS'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Satellite -->
      <g transform="translate(200, 40)">
        <rect x="-10" y="-5" width="20" height="10" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
        <line x1="-25" y1="0" x2="-10" y2="0" stroke="#f59e0b" stroke-width="3"/>
        <line x1="10" y1="0" x2="25" y2="0" stroke="#f59e0b" stroke-width="3"/>
      </g>
      
      <!-- Base Station (Reference) -->
      <g transform="translate(100, 220)">
        <path d="M 0 0 L -15 30 L 15 30 Z" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
        <circle cx="0" cy="0" r="4" fill="#ef4444"/>
        <text x="0" y="45" fill="#3b82f6" font-size="10" font-weight="bold" text-anchor="middle">BASE STATION</text>
      </g>
      
      <!-- Rover Station (User) -->
      <g transform="translate(300, 220)">
        <line x1="0" y1="0" x2="0" y2="30" stroke="#10b981" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="5" fill="#10b981"/>
        <text x="0" y="45" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">ROVER (USER)</text>
      </g>
      
      <!-- Satellite to Base and Rover signals -->
      <line x1="200" y1="40" x2="100" y2="220" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="200" y1="40" x2="300" y2="220" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4"/>
      
      <!-- Base to Rover correction signal -->
      <path d="M 120 220 L 280 220" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,3"/>
      <text x="200" y="210" fill="#ef4444" font-size="9" text-anchor="middle">Real-time Corrections</text>
      
      <text x="200" y="285" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">RTK DIFFERENTIAL CORRECTION</text>
    </svg>`
  },
  {
    id: 'glonass',
    term: 'GLONASS',
    category: 'gnss',
    synonyms: 'Global Navigation Satellite System, Russian GNSS',
    definition: 'The Russian satellite navigation system providing global positioning and timing corrections.',
    explanation: 'GLONASS (Globalnaya Navigatsionnaya Sputnikovaya Sistema) is a space-based satellite navigation system operated by the Russian Aerospace Forces. It provides an alternative to the United States\' Global Positioning System (GPS) and is the second alternative navigational system in operation with global coverage and of comparable precision. GLONASS consists of 24 active satellites in 3 orbital planes, which enables receivers globally to calculate their coordinates.',
    references: [
      { label: 'Wikipedia - GLONASS', url: 'https://en.wikipedia.org/wiki/GLONASS' }
    ],
    related: ['GNSS', 'GPS', 'Galileo', 'BeiDou'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Earth -->
      <circle cx="200" cy="150" r="30" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="1.5"/>
      <text x="200" y="153" fill="#10b981" font-size="8" font-weight="bold" text-anchor="middle">EARTH</text>
      <!-- Orbital plane 1 -->
      <ellipse cx="200" cy="150" rx="110" ry="40" fill="none" stroke="#64748b" stroke-width="1" transform="rotate(30, 200, 150)"/>
      <!-- Orbital plane 2 -->
      <ellipse cx="200" cy="150" rx="110" ry="40" fill="none" stroke="#64748b" stroke-width="1" transform="rotate(-30, 200, 150)"/>
      <!-- Orbital plane 3 -->
      <ellipse cx="200" cy="150" rx="110" ry="40" fill="none" stroke="#64748b" stroke-width="1" transform="rotate(90, 200, 150)"/>
      <!-- Satellites -->
      <circle cx="105" cy="95" r="4" fill="#fbbf24"/>
      <circle cx="295" cy="205" r="4" fill="#fbbf24"/>
      <circle cx="105" cy="205" r="4" fill="#fbbf24"/>
      <circle cx="295" cy="95" r="4" fill="#fbbf24"/>
      <circle cx="200" cy="40" r="4" fill="#fbbf24"/>
      <circle cx="200" cy="260" r="4" fill="#fbbf24"/>
      <text x="200" y="285" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">GLONASS 3-PLANE CONSTELLATION</text>
    </svg>`
  },
  {
    id: 'galileo',
    term: 'Galileo',
    category: 'gnss',
    synonyms: 'European GNSS, Galileo Navigation',
    definition: 'The European Union\'s global satellite navigation system, designed for high-precision civilian use.',
    explanation: 'Galileo is a global navigation satellite system (GNSS) created by the European Union through the European Space Agency (ESA) and European Union Agency for the Space Programme (EUSPA). One of Galileo\'s primary aims is to provide an independent high-precision positioning system upon which European nations can rely, separate from GPS and GLONASS. It offers sub-meter accuracy to civilian users in its free basic service, and centimeter-level accuracy for commercial applications.',
    references: [
      { label: 'ESA - Galileo Overview', url: 'https://www.esa.int/Applications/Navigation/Galileo' }
    ],
    related: ['GNSS', 'GPS', 'GLONASS', 'BeiDou'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Earth -->
      <circle cx="200" cy="150" r="30" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="1.5"/>
      <text x="200" y="153" fill="#10b981" font-size="8" font-weight="bold" text-anchor="middle">EARTH</text>
      <!-- Circular orbits -->
      <circle cx="200" cy="150" r="95" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="200" cy="150" r="115" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2"/>
      <!-- Satellites -->
      <circle cx="132" cy="82" r="4.5" fill="#3b82f6"/>
      <circle cx="268" cy="218" r="4.5" fill="#3b82f6"/>
      <circle cx="95" cy="190" r="4.5" fill="#3b82f6"/>
      <circle cx="305" cy="110" r="4.5" fill="#3b82f6"/>
      <text x="200" y="285" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">GALILEO HIGH-PRECISION ORBITS</text>
    </svg>`
  },
  {
    id: 'beidou',
    term: 'BeiDou',
    category: 'gnss',
    synonyms: 'BDS, Chinese GNSS, BeiDou Navigation',
    definition: 'The Chinese satellite navigation system providing global positioning coverage.',
    explanation: 'The BeiDou Navigation Satellite System (BDS) is a Chinese satellite navigation system. It consists of two separate satellite constellations. The first BeiDou system was a regional service deactivated in 2012. The BeiDou-3 constellation completed global deployment in 2020. BDS offers high-precision positioning, navigation, timing, and short-message communication capabilities.',
    references: [
      { label: 'Wikipedia - BeiDou', url: 'https://en.wikipedia.org/wiki/BeiDou' }
    ],
    related: ['GNSS', 'GPS', 'GLONASS', 'Galileo'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Earth -->
      <circle cx="200" cy="150" r="30" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="1.5"/>
      <!-- Orbit ring showing MEO and GEO -->
      <circle cx="200" cy="150" r="80" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="4,2"/>
      <circle cx="200" cy="150" r="120" fill="none" stroke="#475569" stroke-width="1.5"/>
      <!-- Satellites -->
      <circle cx="120" cy="150" r="5" fill="#ec4899"/>
      <circle cx="280" cy="150" r="5" fill="#ec4899"/>
      <circle cx="200" cy="30" r="5" fill="#ec4899"/>
      <circle cx="200" cy="270" r="5" fill="#ec4899"/>
      <text x="200" y="285" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">BEIDOU GLOBAL CONSTELLATION (BDS)</text>
    </svg>`
  },
  {
    id: 'sbas',
    term: 'SBAS (Satellite-Based Augmentation System)',
    category: 'gnss',
    synonyms: 'WAAS, EGNOS, MSAS, Satellite Augmentation',
    definition: 'A regional system that supports wide-area or regional augmentation through geostationary satellites broadcasting correction data.',
    explanation: 'Satellite-Based Augmentation Systems (SBAS) support wide-area or regional augmentation through the use of additional satellite-broadcast messages. Using ground reference stations positioned at precisely surveyed locations, SBAS calculates ionospheric and orbit corrections, and uploads these to geostationary satellites. These satellites broadcast the corrections back to users, improving GPS positioning accuracy to under 1 meter. Examples include WAAS (US), EGNOS (Europe), MSAS (Japan), and GAGAN (India).',
    references: [
      { label: 'FAA - SBAS Service', url: 'https://www.faa.gov/about/office_org/headquarters_offices/ato/service_units/techops/navservices/gnss/sbas' }
    ],
    related: ['GNSS', 'GPS', 'RTK (Real-Time Kinematic)'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- GNSS Satellite -->
      <g transform="translate(80, 50)">
        <circle cx="0" cy="0" r="4" fill="#3b82f6"/>
        <text x="0" y="-10" fill="#3b82f6" font-size="8" text-anchor="middle">GNSS Sat</text>
      </g>
      <!-- SBAS Geostationary Sat -->
      <g transform="translate(320, 50)">
        <circle cx="0" cy="0" r="5" fill="#ef4444"/>
        <text x="0" y="-10" fill="#ef4444" font-size="8" text-anchor="middle">SBAS Geo Sat</text>
      </g>
      <!-- Reference Station -->
      <g transform="translate(60, 220)">
        <path d="M 0 0 L -8 16 L 8 16 Z" fill="#64748b"/>
        <text x="0" y="28" fill="#94a3b8" font-size="8" text-anchor="middle">Ref Station</text>
      </g>
      <!-- Master Control Station -->
      <g transform="translate(190, 220)">
        <rect x="-15" y="0" width="30" height="20" rx="2" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
        <text x="0" y="32" fill="#3b82f6" font-size="8" text-anchor="middle">Master Control</text>
      </g>
      <!-- User Receiver -->
      <g transform="translate(310, 220)">
        <line x1="0" y1="0" x2="0" y2="20" stroke="#10b981" stroke-width="2"/>
        <circle cx="0" cy="0" r="3" fill="#10b981"/>
        <text x="0" y="32" fill="#10b981" font-size="8" text-anchor="middle">User</text>
      </g>
      <!-- Signal Paths -->
      <line x1="80" y1="50" x2="60" y2="220" stroke="#3b82f6" stroke-dasharray="2,2"/>
      <line x1="60" y1="220" x2="175" y2="220" stroke="#64748b" stroke-width="1.5"/>
      <path d="M 190 220 L 320 50" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
      <path d="M 320 50 L 310 220" fill="none" stroke="#ef4444" stroke-width="2"/>
      <text x="250" y="140" fill="#ef4444" font-size="8" transform="rotate(75, 250, 140)">Differential Corrections</text>
      <text x="200" y="285" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">SBAS AUGMENTATION WORKFLOW</text>
    </svg>`
  },
  {
    id: 'multipath-error',
    term: 'Multipath Error',
    category: 'gnss',
    synonyms: 'Multipath Interference, Signal Reflection',
    definition: 'A positioning error caused by GNSS signals reflecting off structures before reaching the receiver antenna.',
    explanation: 'Multipath error is a GNSS positioning error that occurs when a satellite signal reaches the receiver antenna after reflecting off a nearby surface (such as buildings, metal roofs, canyons, or water bodies) rather than traveling along a direct line-of-sight path. This reflection delays the arrival of the signal, causing the receiver to calculate a false distance and offset coordinates. Multipath is one of the hardest positioning errors to mitigate, though choke ring antennas and advanced receiver correlators are used to filter it.',
    references: [
      { label: 'NovAtel - Multipath Mitigation', url: 'https://helen.novatel.com/an-introduction-to-gnss/chapter-5-resolving-errors/multipath/' }
    ],
    related: ['GNSS', 'GPS', 'DOP (Dilution of Precision)'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Satellite -->
      <circle cx="80" cy="50" r="4" fill="#3b82f6"/>
      <!-- User Antenna -->
      <g transform="translate(300, 220)">
        <line x1="0" y1="0" x2="0" y2="25" stroke="#10b981" stroke-width="2"/>
        <path d="M -10 -5 L 10 -5 L 0 0 Z" fill="#10b981"/>
        <text x="0" y="35" fill="#10b981" font-size="9" font-weight="bold" text-anchor="middle">ANTENNA</text>
      </g>
      <!-- Building structure -->
      <g transform="translate(160, 130)">
        <rect x="0" y="0" width="60" height="115" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <rect x="10" y="15" width="15" height="15" fill="#38bdf8" opacity="0.3"/>
        <rect x="35" y="15" width="15" height="15" fill="#38bdf8" opacity="0.3"/>
        <rect x="10" y="45" width="15" height="15" fill="#38bdf8" opacity="0.3"/>
        <rect x="35" y="45" width="15" height="15" fill="#38bdf8" opacity="0.3"/>
        <text x="30" y="90" fill="#475569" font-size="8" text-anchor="middle">BUILDING</text>
      </g>
      <!-- Direct Signal (Line of Sight) -->
      <line x1="80" y1="50" x2="300" y2="215" stroke="#10b981" stroke-width="2"/>
      <text x="180" y="110" fill="#10b981" font-size="8" transform="rotate(36, 180, 110)">Direct Signal (LOS)</text>
      <!-- Reflected Signal (Multipath) -->
      <path d="M 80 50 L 160 160 L 300 215" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="120" y="95" fill="#ef4444" font-size="8" transform="rotate(54, 120, 95)">Reflected Signal</text>
      <text x="235" y="200" fill="#ef4444" font-size="8" transform="rotate(21, 235, 200)">Delayed Path</text>
      <text x="200" y="285" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">MULTIPATH SIGNAL REFLECTION ERROR</text>
    </svg>`
  },
  {
    id: 'dop',
    term: 'DOP (Dilution of Precision)',
    category: 'gnss',
    synonyms: 'PDOP, HDOP, GDOP, Dilution of Precision',
    definition: 'A value indicating the geometric strength of the satellite constellation configuration on positioning accuracy.',
    explanation: 'Dilution of Precision (DOP) is a mathematical descriptor of the geometric strength of the satellite constellation configuration. When satellites are widely spaced across the sky, the geometric intersections are clean, yielding a low DOP value (Good geometry, high accuracy). When satellites are clustered close together (e.g. in urban canyons or valleys), the overlap of signal uncertainty is large, yielding a high DOP value (Poor geometry, low accuracy). Key metrics include PDOP (Position DOP), HDOP (Horizontal DOP), and VDOP (Vertical DOP).',
    references: [
      { label: 'GIS Geography - GPS DOP Guide', url: 'https://gisgeography.com/gps-dilution-of-precision-pdop-gdop/' }
    ],
    related: ['GNSS', 'GPS', 'Multipath Error'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Good DOP (Satellites wide apart) -->
      <g transform="translate(10, 0)">
        <circle cx="90" cy="140" r="40" fill="none" stroke="#3b82f6" stroke-width="1"/>
        <circle cx="130" cy="180" r="40" fill="none" stroke="#3b82f6" stroke-width="1"/>
        <!-- Small overlap area -->
        <path d="M 97 172 A 40 40 0 0 0 128 141 A 40 40 0 0 0 97 172" fill="#10b981" opacity="0.7"/>
        <!-- Satellites -->
        <circle cx="90" cy="100" r="3" fill="#3b82f6"/>
        <circle cx="170" cy="180" r="3" fill="#3b82f6"/>
        <text x="110" y="235" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">GOOD DOP (Wide)</text>
      </g>
      <!-- Poor DOP (Satellites close together) -->
      <g transform="translate(200, 0)">
        <circle cx="90" cy="140" r="45" fill="none" stroke="#ef4444" stroke-width="1"/>
        <circle cx="105" cy="155" r="45" fill="none" stroke="#ef4444" stroke-width="1"/>
        <!-- Large overlap area -->
        <path d="M 64 180 A 45 45 0 0 0 131 113 A 45 45 0 0 0 64 180 Z" fill="#ef4444" opacity="0.3"/>
        <!-- Satellites -->
        <circle cx="90" cy="95" r="3" fill="#ef4444"/>
        <circle cx="105" cy="110" r="3" fill="#ef4444"/>
        <text x="110" y="235" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">POOR DOP (Clustered)</text>
      </g>
      <text x="200" y="285" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">CONSTELLATION GEOMETRY EFFECT (DOP)</text>
    </svg>`
  },
  {
    id: 'gis',
    term: 'GIS (Geographic Information System)',
    category: 'gis',
    definition: 'A framework for gathering, managing, and analyzing spatial and geographic data.',
    explanation: 'GIS integrates many types of data. It analyzes spatial location and organizes layers of information into visualizations using maps and 3D scenes. With this unique capability, GIS reveals deeper insights into data, such as patterns, relationships, and situations—helping users make smarter decisions. A typical GIS operates with five key components: Hardware, Software, Data, People, and Methods.',
    references: [
      { label: 'Esri - What is GIS?', url: 'https://www.esri.com/en-us/what-is-gis/overview' },
      { label: 'National Geographic - GIS Guide', url: 'https://education.nationalgeographic.org/resource/geographic-information-system-gis/' }
    ],
    related: ['WebGIS', 'Raster Data', 'Vector Data', 'Geoprocessing'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Layers illustration -->
      <g transform="translate(40, -10)">
        <!-- Real World Base -->
        <path d="M 50 240 L 200 180 L 350 240 L 200 290 Z" fill="#1e293b" stroke="#3b4f74" stroke-width="2" opacity="0.8"/>
        <text x="200" y="270" fill="#64748b" font-size="12" font-weight="bold" text-anchor="middle">REAL WORLD</text>
        
        <!-- Elevation / Raster Layer -->
        <path d="M 50 170 L 200 110 L 350 170 L 200 220 Z" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="2"/>
        <path d="M 120 160 L 200 130 L 280 160 L 200 180 Z" fill="rgba(16, 185, 129, 0.4)" stroke="#10b981" stroke-width="1"/>
        <text x="200" y="200" fill="#10b981" font-size="12" font-weight="bold" text-anchor="middle">ELEVATION (RASTER)</text>
        
        <!-- Parcels / Vector Layer -->
        <path d="M 50 100 L 200 40 L 350 100 L 200 150 Z" fill="none" stroke="#06b6d4" stroke-width="2"/>
        <polygon points="120,95 180,75 220,90 160,115" fill="rgba(6, 182, 212, 0.2)" stroke="#06b6d4" stroke-width="1"/>
        <polygon points="180,75 260,55 290,70 220,90" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" stroke-width="1"/>
        <text x="200" y="130" fill="#06b6d4" font-size="12" font-weight="bold" text-anchor="middle">PARCELS (VECTOR)</text>
        
        <!-- Connector Dashed Lines -->
        <line x1="50" y1="100" x2="50" y2="240" stroke="#475569" stroke-width="1" stroke-dasharray="4,4"/>
        <line x1="350" y1="100" x2="350" y2="240" stroke="#475569" stroke-width="1" stroke-dasharray="4,4"/>
        <line x1="200" y1="40" x2="200" y2="180" stroke="#475569" stroke-width="1" stroke-dasharray="4,4"/>
      </g>
    </svg>`
  },
  {
    id: 'webgis',
    term: 'WebGIS',
    category: 'webgis',
    definition: 'An architectural pattern that hosts GIS functionalities on the web, enabling browser-based mapping and analysis.',
    explanation: 'WebGIS refers to the integration of web technologies with Geographic Information Systems. It is a client-server architecture where a web browser (client) sends requests to a web map server (server) which processes queries, renders data, or serves spatial layers back to the client as tiles or raw vector geometries. WebGIS makes geospatial data accessible to millions of people without requiring heavy desktop installations.',
    references: [
      { label: 'GIS Geography - What is Web GIS?', url: 'https://gisgeography.com/web-gis/' },
      { label: 'Wikipedia - Web GIS', url: 'https://en.wikipedia.org/wiki/Web_mapping' }
    ],
    related: ['GIS', 'WMS', 'WFS', 'Leaflet', 'OpenLayers'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Client (Browser) -->
      <rect x="20" y="80" width="90" height="70" rx="8" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" stroke-width="2"/>
      <rect x="25" y="90" width="80" height="50" rx="4" fill="#070a13" stroke="#06b6d4" stroke-width="1"/>
      <line x1="65" y1="150" x2="65" y2="170" stroke="#06b6d4" stroke-width="2"/>
      <line x1="45" y1="170" x2="85" y2="170" stroke="#06b6d4" stroke-width="2"/>
      <text x="65" y="115" fill="#f8fafc" font-size="9" text-anchor="middle">Browser Map</text>
      <text x="65" y="195" fill="#06b6d4" font-size="11" font-weight="bold" text-anchor="middle">CLIENT</text>

      <!-- Request/Response Arrows -->
      <path d="M 130 100 L 250 100" fill="none" stroke="#10b981" stroke-width="2.5" marker-end="url(#arrow)"/>
      <text x="190" y="90" fill="#10b981" font-size="10" text-anchor="middle" font-weight="600">GET Request</text>
      
      <path d="M 250 130 L 130 130" fill="none" stroke="#06b6d4" stroke-width="2.5" marker-end="url(#arrow)"/>
      <text x="190" y="145" fill="#06b6d4" font-size="10" text-anchor="middle" font-weight="600">Map Tiles/JSON</text>
      
      <!-- Web Server / Map Server -->
      <rect x="270" y="70" width="100" height="90" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="2"/>
      <rect x="280" y="80" width="80" height="20" rx="4" fill="#1e293b"/>
      <circle cx="295" cy="90" r="3" fill="#10b981"/>
      <rect x="280" y="105" width="80" height="20" rx="4" fill="#1e293b"/>
      <circle cx="295" cy="115" r="3" fill="#10b981"/>
      <rect x="280" y="130" width="80" height="20" rx="4" fill="#1e293b"/>
      <circle cx="295" cy="140" r="3" fill="#06b6d4"/>
      <text x="320" y="180" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle">MAP SERVER</text>

      <!-- Database Cylinder -->
      <g transform="translate(290, 210)">
        <path d="M 10 20 C 10 10, 50 10, 50 20 L 50 50 C 50 60, 10 60, 10 50 Z" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" stroke-width="2"/>
        <ellipse cx="30" cy="20" rx="20" ry="8" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" stroke-width="2"/>
        <text x="30" y="42" fill="#3b82f6" font-size="10" font-weight="bold" text-anchor="middle">SPATIAL DB</text>
      </g>
      <path d="M 320 162 L 320 205" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="3,3"/>

      <!-- Marker Definition -->
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
        </marker>
      </defs>
    </svg>`
  },
  {
    id: 'raster',
    term: 'Raster Data',
    category: 'gis',
    definition: 'Spatial data represented as a grid of cell/pixel values, commonly used for continuous features like satellite imagery.',
    explanation: 'Raster data models represent the world as a grid of equally sized cells (pixels) arranged in rows and columns. Each cell contains a attribute value representing a specific measurement (e.g. elevation, temperature, or spectral reflectance). Gradients of elevation, aerial photography, and land cover models are best represented using raster structures. Common raster formats include GeoTIFF, JPEG2000, and NetCDF.',
    references: [
      { label: 'GIS Geography - Vector vs Raster Data', url: 'https://gisgeography.com/spatial-data-types-vector-raster/' },
      { label: 'QGIS Documentation - Raster Data Introduction', url: 'https://docs.qgis.org/latest/en/docs/gentle_gis_introduction/raster_data.html' }
    ],
    related: ['GIS', 'Vector Data', 'GeoTIFF'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#223150" stroke-width="1"/>
        </pattern>
      </defs>
      
      <!-- Base Grid -->
      <rect x="50" y="50" width="300" height="200" fill="url(#grid)" />
      
      <!-- Simulated Raster values representing a hill (Elevation values) -->
      <g opacity="0.8">
        <!-- Low elevation (dark blue/purple) -->
        <rect x="90" y="90" width="20" height="20" fill="#1e293b"/>
        <rect x="110" y="90" width="20" height="20" fill="#1e293b"/>
        <rect x="90" y="110" width="20" height="20" fill="#1e293b"/>
        
        <!-- Medium elevation (Cyan) -->
        <rect x="130" y="90" width="20" height="20" fill="#0891b2"/>
        <rect x="110" y="110" width="20" height="20" fill="#0891b2"/>
        <rect x="90" y="130" width="20" height="20" fill="#0891b2"/>
        <rect x="130" y="110" width="20" height="20" fill="#06b6d4"/>
        <rect x="110" y="130" width="20" height="20" fill="#06b6d4"/>
        
        <!-- High elevation (Emerald) -->
        <rect x="150" y="90" width="20" height="20" fill="#059669"/>
        <rect x="150" y="110" width="20" height="20" fill="#10b981"/>
        <rect x="130" y="130" width="20" height="20" fill="#10b981"/>
        <rect x="110" y="150" width="20" height="20" fill="#10b981"/>
        
        <!-- Peak (Yellowish white) -->
        <rect x="150" y="130" width="20" height="20" fill="#f59e0b"/>
        <rect x="130" y="150" width="20" height="20" fill="#fbbf24"/>
      </g>

      <!-- Label inside cell -->
      <text x="160" y="144" fill="#070a13" font-size="8" font-weight="bold" text-anchor="middle">98m</text>
      <text x="140" y="164" fill="#070a13" font-size="8" font-weight="bold" text-anchor="middle">92m</text>
      <text x="120" y="144" fill="#f8fafc" font-size="8" font-weight="bold" text-anchor="middle">60m</text>
      
      <!-- Outer outline -->
      <rect x="50" y="50" width="300" height="200" fill="none" stroke="#3b82f6" stroke-width="2"/>
      <text x="200" y="280" fill="#3b82f6" font-size="12" font-weight="bold" text-anchor="middle">GRID CELL VALUES (PIXELS)</text>
    </svg>`
  },
  {
    id: 'dsm',
    term: 'DSM (Digital Surface Model)',
    category: 'photogrammetry',
    definition: 'A raster elevation model representing the topmost surface of the Earth, including built structures and vegetation.',
    explanation: 'A Digital Surface Model (DSM) captures the natural and built features on the Earth\'s surface. Unlike a Digital Elevation Model (DEM), which measures the bare ground surface (filtering out buildings, trees, and other structures), a DSM includes all features protruding above the terrain. DSMs are generated from lidar point clouds, photogrammetry, or radar data and are essential for urban modeling, telecommunication signal propagation analysis, aviation safety, and tree canopy forestry measurements.',
    references: [
      { label: 'Esri - DEM, DSM, and DTM Differences', url: 'https://www.esri.com/about/newsroom/arcuser/dem-dsm-dtm-difference/' },
      { label: 'USGS - 3D Elevation Program (3DEP)', url: 'https://www.usgs.gov/3d-elevation-program' }
    ],
    related: ['Raster Data', 'GIS', 'GeoTIFF'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      
      <!-- Ground Terrain (Bare Earth) -->
      <path d="M 30 240 Q 130 190 230 220 T 370 200 L 370 280 L 30 280 Z" fill="#1e293b" opacity="0.6"/>
      <path d="M 30 240 Q 130 190 230 220 T 370 200" fill="none" stroke="#64748b" stroke-width="2"/>

      <!-- Tree at x=130 -->
      <g transform="translate(130, 140)">
        <rect x="-4" y="0" width="8" height="60" fill="#78350f" />
        <circle cx="0" cy="-10" r="24" fill="#065f46" opacity="0.8"/>
        <circle cx="-12" cy="-5" r="18" fill="#047857" opacity="0.8"/>
        <circle cx="12" cy="-5" r="18" fill="#047857" opacity="0.8"/>
      </g>

      <!-- House at x=280 -->
      <g transform="translate(260, 160)">
        <rect x="0" y="20" width="50" height="35" fill="#475569" stroke="#cbd5e1" stroke-width="1.5" />
        <polygon points="-5,20 25,-5 55,20" fill="#b91c1c" stroke="#cbd5e1" stroke-width="1.5" />
      </g>

      <!-- DEM Line (Bare Earth elevation) in green/emerald -->
      <path d="M 30 242 Q 130 192 230 222 T 370 202" fill="none" stroke="#10b981" stroke-width="4.5" stroke-dasharray="6,4" />
      
      <!-- DSM Line (Surface model elevation) in cyan -->
      <path d="M 30 238 Q 90 230 106 138 C 110 100, 150 100, 154 138 Q 170 216 230 218 Q 248 218 255 178 L 285 152 L 315 178 Q 322 200 370 198" fill="none" stroke="#06b6d4" stroke-width="4.5" stroke-dasharray="6,4"/>

      <!-- Legend -->
      <g transform="translate(40, 40)">
        <line x1="0" y1="10" x2="30" y2="10" stroke="#06b6d4" stroke-width="4.5" stroke-dasharray="6,4"/>
        <text x="40" y="14" fill="#06b6d4" font-size="11" font-weight="bold">DSM (Top of Canopy/Structures)</text>
        
        <line x1="0" y1="30" x2="30" y2="30" stroke="#10b981" stroke-width="4.5" stroke-dasharray="6,4"/>
        <text x="40" y="34" fill="#10b981" font-size="11" font-weight="bold">DEM (Bare Ground terrain)</text>
      </g>
      
      <!-- Height arrows -->
      <line x1="130" y1="200" x2="130" y2="114" stroke="#ffffff" stroke-width="1.5" marker-end="url(#arrow)" marker-start="url(#arrow)"/>
      <text x="115" y="155" fill="#ffffff" font-size="9" text-anchor="middle" font-weight="bold">Height</text>

      <!-- Labels -->
      <text x="130" y="270" fill="#cbd5e1" font-size="10" text-anchor="middle">Forest Canopy</text>
      <text x="285" y="270" fill="#cbd5e1" font-size="10" text-anchor="middle">Building</text>
    </svg>`
  },
  {
    id: 'vector',
    term: 'Vector Data',
    category: 'gis',
    definition: 'Geospatial data represented by discrete geometries: Points (coordinates), Lines (connected vertices), and Polygons (closed loops).',
    explanation: 'Vector models represent geography as coordinate geometry. Points mark precise locations (e.g. fire hydrants, city centers), lines represent linear tracks (e.g. roads, streams), and polygons enclose distinct regions (e.g. parcels, lakes, administrative boundaries). Attributes like names, area, or population are attached to these shapes in tables. Vector data is highly scalable and allows precise geometric analysis.',
    references: [
      { label: 'Esri - GIS Dictionary Vector Definition', url: 'https://support.esri.com/en-us/gis-dictionary/vector-data-model' },
      { label: 'QGIS Documentation - Vector Data Intro', url: 'https://docs.qgis.org/latest/en/docs/gentle_gis_introduction/vector_data.html' }
    ],
    related: ['GIS', 'Raster Data', 'GeoJSON', 'Shapefile'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Points -->
      <circle cx="80" cy="80" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
      <text x="80" y="105" fill="#ef4444" font-size="11" font-weight="bold" text-anchor="middle">POINT (x,y)</text>
      
      <!-- Line -->
      <path d="M 50 200 L 120 220 L 150 170 L 220 190" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="200" r="4" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
      <circle cx="120" cy="220" r="4" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
      <circle cx="150" cy="170" r="4" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
      <circle cx="220" cy="190" r="4" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
      <text x="135" y="240" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">LINE (Vertices)</text>

      <!-- Polygon -->
      <polygon points="260,80 340,60 370,130 290,150 250,110" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="3"/>
      <circle cx="260" cy="80" r="4" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
      <circle cx="340" cy="60" r="4" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
      <circle cx="370" cy="130" r="4" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
      <circle cx="290" cy="150" r="4" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
      <circle cx="250" cy="110" r="4" fill="#ffffff" stroke="#10b981" stroke-width="2"/>
      <text x="310" y="175" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle">POLYGON (Closed Ring)</text>
    </svg>`
  },
  {
    id: 'geojson',
    term: 'GeoJSON',
    category: 'webgis',
    definition: 'An open, JSON-based format for encoding geographic vector structures with coordinate arrays and attribute properties.',
    explanation: 'GeoJSON is a standard geospatial data interchange format based on JavaScript Object Notation (JSON). It represents geometries (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon) alongside properties (attributes). A GeoJSON document is readable by humans, lightweight, and parsed natively by browsers, making it the de-facto standard format for WebGIS libraries.',
    references: [
      { label: 'RFC 7946 GeoJSON Standard Specification', url: 'https://datatracker.ietf.org/doc/html/rfc7946' },
      { label: 'GeoJSON.io Interactive Tool', url: 'https://geojson.io/' }
    ],
    related: ['Vector Data', 'WebGIS', 'KML'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Code box mockup -->
      <rect x="20" y="30" width="180" height="230" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      <text x="30" y="55" fill="#06b6d4" font-family="monospace" font-size="10">{</text>
      <text x="45" y="75" fill="#a7f3d0" font-family="monospace" font-size="9">"type": "Feature",</text>
      <text x="45" y="95" fill="#a7f3d0" font-family="monospace" font-size="9">"geometry": {</text>
      <text x="60" y="115" fill="#67e8f9" font-family="monospace" font-size="9">"type": "Point",</text>
      <text x="60" y="135" fill="#38bdf8" font-family="monospace" font-size="9">"coordinates": [</text>
      <text x="75" y="155" fill="#fbbf24" font-family="monospace" font-size="9">80.27, 13.08</text>
      <text x="60" y="175" fill="#38bdf8" font-family="monospace" font-size="9">]</text>
      <text x="45" y="195" fill="#a7f3d0" font-family="monospace" font-size="9">},</text>
      <text x="45" y="215" fill="#e2e8f0" font-family="monospace" font-size="9">"properties": { ... }</text>
      <text x="30" y="235" fill="#06b6d4" font-family="monospace" font-size="10">}</text>

      <!-- Visual Map Mockup -->
      <rect x="230" y="50" width="140" height="150" rx="8" fill="rgba(6, 182, 212, 0.05)" stroke="#06b6d4" stroke-width="2"/>
      <path d="M 230 150 Q 300 130 370 170" fill="none" stroke="#223150" stroke-width="2"/>
      
      <!-- Coordinate Arrow indicator -->
      <path d="M 205 155 L 290 120" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4,4" marker-end="url(#arrow)"/>
      <circle cx="295" cy="118" r="6" fill="#ef4444"/>
      <text x="295" y="105" fill="#ef4444" font-size="8" font-weight="bold" text-anchor="middle">Chennai (13.08, 80.27)</text>

      <text x="200" y="280" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle">JSON TEXT FILE ➔ RENDERED MAP GEOMETRY</text>
    </svg>`
  },
  {
    id: 'crs',
    term: 'Coordinate Reference System (CRS)',
    category: 'gis',
    definition: 'A framework for locating features on the surface of the Earth using coordinate values.',
    explanation: 'A Coordinate Reference System (CRS) defines how a 2D flat map relates to the real 3D ellipsoidal Earth. It comprises a datum (ellipsoid model, like WGS84) and a projection (mathematical equation converting spherical degrees to flat grid units, like UTM or Web Mercator EPSG:3857). Correctly aligning CRSs is critical; mismatching systems causes maps to align incorrectly (spatial shift).',
    references: [
      { label: 'OSGeo - Spatial Reference Directory', url: 'https://spatialreference.org/' },
      { label: 'QGIS Documentation - CRS Introduction', url: 'https://docs.qgis.org/latest/en/docs/gentle_gis_introduction/coordinate_reference_systems.html' }
    ],
    related: ['GIS', 'WebGIS', 'GeoJSON'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Globe -->
      <circle cx="120" cy="140" r="70" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" stroke-width="2"/>
      <ellipse cx="120" cy="140" rx="70" ry="25" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="3,3"/>
      <line x1="120" y1="60" x2="120" y2="220" stroke="#06b6d4" stroke-width="1.5"/>
      <text x="120" y="50" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">3D Sphere (Degrees)</text>

      <!-- Projection Arrow -->
      <path d="M 205 140 L 255 140" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrow)"/>
      <text x="230" y="125" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">Project</text>

      <!-- Flat Map -->
      <rect x="270" y="80" width="110" height="120" rx="4" fill="rgba(16, 185, 129, 0.08)" stroke="#10b981" stroke-width="2"/>
      <line x1="280" y1="180" x2="370" y2="180" stroke="#10b981" stroke-width="1.5"/>
      <line x1="290" y1="90" x2="290" y2="190" stroke="#10b981" stroke-width="1.5"/>
      <text x="365" y="195" fill="#10b981" font-size="9">X</text>
      <text x="280" y="95" fill="#10b981" font-size="9">Y</text>
      <text x="325" y="70" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">2D Plane (Meters)</text>

      <text x="200" y="260" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">EPSG:4326 (WGS84) ➔ EPSG:3857 (Web Mercator)</text>
    </svg>`
  },
  {
    id: 'wms',
    term: 'Web Map Service (WMS)',
    category: 'webgis',
    definition: 'An OGC standard protocol for serving georeferenced map images (PNG/JPEG) dynamically generated from spatial servers.',
    explanation: 'Web Map Service (WMS) is an Open Geospatial Consortium (OGC) standard. When a client requests a map (GetMap request specifying coordinates, layers, CRS, styling, and pixel size), the WMS server processes spatial vector layers, overlays them, renders them as a flat raster image (usually transparent PNG), and returns it to the client. This is fast for displaying complex datasets, but does not allow the client to edit or interact directly with raw feature attributes.',
    references: [
      { label: 'OGC Web Map Service Standard', url: 'https://www.ogc.org/standard/wms/' },
      { label: 'Geoserver WMS Documentation', url: 'https://docs.geoserver.org/stable/en/user/services/wms/reference.html' }
    ],
    related: ['WebGIS', 'WFS', 'Raster Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Client -->
      <rect x="20" y="100" width="90" height="60" rx="4" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" stroke-width="2"/>
      <text x="65" y="135" fill="#06b6d4" font-size="12" font-weight="bold" text-anchor="middle">Client App</text>
      
      <!-- Request -->
      <path d="M 120 115 L 260 115" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="190" y="105" fill="#10b981" font-size="9" text-anchor="middle">GetMap(BBOX, Layers)</text>
      
      <!-- Server -->
      <rect x="280" y="80" width="100" height="100" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="2"/>
      <text x="330" y="135" fill="#10b981" font-size="12" font-weight="bold" text-anchor="middle">WMS Server</text>
      
      <!-- Response -->
      <path d="M 260 145 L 120 145" fill="none" stroke="#06b6d4" stroke-width="2" marker-end="url(#arrow)"/>
      <!-- Returned Image Mockup -->
      <g transform="translate(170, 155)">
        <rect x="0" y="0" width="40" height="40" rx="4" fill="#0a0f1d" stroke="#06b6d4" stroke-width="1.5"/>
        <!-- Tiny visual features in image -->
        <circle cx="15" cy="15" r="4" fill="#ef4444"/>
        <line x1="5" y1="30" x2="35" y2="25" stroke="#3b82f6" stroke-width="2"/>
        <text x="20" y="-5" fill="#06b6d4" font-size="8" text-anchor="middle">PNG Image</text>
      </g>
    </svg>`
  },
  {
    id: 'wfs',
    term: 'Web Feature Service (WFS)',
    category: 'webgis',
    definition: 'An OGC standard protocol for querying, downloading, and editing raw geographic vector features (features as XML/JSON).',
    explanation: 'Web Feature Service (WFS) enables clients to retrieve and update raw vector features over the web. Unlike WMS (which returns a pre-rendered image), WFS returns raw vector geometry coordinates (such as GML or GeoJSON) and structural attribute records. This allows clients to style features dynamically, execute local spatial queries, and edit features (Transactional WFS or WFS-T) directly updating the spatial database.',
    references: [
      { label: 'OGC Web Feature Service Standard', url: 'https://www.ogc.org/standard/wfs/' },
      { label: 'Geoserver WFS Documentation', url: 'https://docs.geoserver.org/stable/en/user/services/wfs/reference.html' }
    ],
    related: ['WebGIS', 'WMS', 'GeoJSON', 'Vector Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Client -->
      <rect x="20" y="100" width="90" height="60" rx="4" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" stroke-width="2"/>
      <text x="65" y="135" fill="#06b6d4" font-size="12" font-weight="bold" text-anchor="middle">Client App</text>
      
      <!-- Request -->
      <path d="M 120 115 L 260 115" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="190" y="105" fill="#10b981" font-size="9" text-anchor="middle">GetFeature(Query)</text>
      
      <!-- Server -->
      <rect x="280" y="80" width="100" height="100" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" stroke-width="2"/>
      <text x="330" y="135" fill="#10b981" font-size="12" font-weight="bold" text-anchor="middle">WFS Server</text>
      
      <!-- Response -->
      <path d="M 260 145 L 120 145" fill="none" stroke="#06b6d4" stroke-width="2" marker-end="url(#arrow)"/>
      <!-- Raw Vector representation -->
      <g transform="translate(170, 155)">
        <rect x="0" y="0" width="40" height="40" rx="4" fill="#0a0f1d" stroke="#06b6d4" stroke-width="1"/>
        <text x="20" y="24" fill="#fbbf24" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">&lt;xml&gt;</text>
        <text x="20" y="-5" fill="#06b6d4" font-size="8" text-anchor="middle">Raw Data</text>
      </g>
    </svg>`
  },
  {
    id: 'postgis',
    term: 'PostGIS',
    category: 'gis',
    definition: 'A spatial database extender for PostgreSQL that adds support for geographic objects and SQL spatial querying capabilities.',
    explanation: 'PostGIS is an open-source software program that extends PostgreSQL, enabling it to act as a fully featured spatial database. It allows storing spatial geometries (points, lines, polygons) directly in column records, introduces spatial indexes (R-Tree / GIST) for fast geometric retrieval, and exposes spatial SQL operations (e.g. ST_Distance, ST_Contains, ST_Buffer) directly inside database scripts.',
    references: [
      { label: 'PostGIS Official Website', url: 'https://postgis.net/' },
      { label: 'PostGIS Introduction Tutorial', url: 'https://postgis.net/workshops/postgis-intro/' }
    ],
    related: ['GIS', 'Spatial Index', 'PostgreSQL'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- SQL Code -->
      <rect x="20" y="50" width="360" height="60" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      <text x="35" y="85" fill="#a7f3d0" font-family="monospace" font-size="11">
        SELECT name FROM landmarks WHERE ST_Contains(geom, point);
      </text>

      <!-- DB Query flow -->
      <path d="M 200 115 L 200 170" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrow)"/>

      <!-- Database Cylinder -->
      <g transform="translate(140, 180)">
        <path d="M 10 20 C 10 5, 110 5, 110 20 L 110 70 C 110 85, 10 85, 10 70 Z" fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" stroke-width="3"/>
        <ellipse cx="60" cy="20" rx="50" ry="12" fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" stroke-width="3"/>
        <text x="60" y="55" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle">PostgreSQL</text>
        <text x="60" y="72" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">+ POSTGIS</text>
      </g>
    </svg>`
  },
  {
    id: 'leaflet',
    term: 'Leaflet',
    category: 'webgis',
    definition: 'A lightweight, open-source JavaScript mapping library widely used for interactive, mobile-friendly web maps.',
    explanation: 'Leaflet is the most popular open-source JavaScript library for mobile-friendly interactive maps. Weighing only about 42 KB of JS, it has all the mapping features most developers ever need. Designed with simplicity, performance and usability in mind, it works efficiently across all major desktop and mobile platforms, support layers, custom tile servers, markers, popups, and can be extended with hundreds of plugins.',
    references: [
      { label: 'Leaflet Official Website', url: 'https://leafletjs.com/' },
      { label: 'Leaflet Tutorials', url: 'https://leafletjs.com/examples.html' }
    ],
    related: ['WebGIS', 'OpenLayers', 'GeoJSON'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Phone Frame -->
      <rect x="130" y="30" width="140" height="230" rx="16" fill="#0f172a" stroke="#475569" stroke-width="4"/>
      <!-- Map Screen -->
      <rect x="138" y="50" width="124" height="180" fill="rgba(6, 182, 212, 0.05)" stroke="#06b6d4" stroke-width="1"/>
      
      <!-- Leaflet Icon Logo -->
      <g transform="translate(180, 70) scale(0.7)">
        <path d="M30,0 C30,0 0,25 0,45 C0,65 15,75 30,75 C45,75 60,65 60,45 C60,25 30,0 30,0 Z" fill="#78b71d"/>
        <path d="M30,10 C30,10 45,25 45,40 C45,55 35,62 30,62 C25,62 15,55 15,40 C15,25 30,10 30,10 Z" fill="#ffffff" opacity="0.3"/>
      </g>
      
      <!-- Mock Map Controls inside screen -->
      <rect x="146" y="58" width="16" height="32" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
      <text x="154" y="71" fill="#475569" font-size="12" font-weight="bold" text-anchor="middle">+</text>
      <text x="154" y="86" fill="#475569" font-size="12" font-weight="bold" text-anchor="middle">-</text>
      
      <!-- Marker inside screen -->
      <path d="M 200 170 C 192 170 186 176 186 184 C 186 194 200 206 200 206 C 200 206 214 194 214 184 C 214 176 208 170 200 170 Z" fill="#ef4444"/>
      <circle cx="200" cy="180" r="4" fill="#ffffff"/>
      
      <text x="200" y="280" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">L.map('map').setView([lat, lng])</text>
    </svg>`
  },
  {
    id: 'spatialindex',
    term: 'Spatial Index',
    category: 'gis',
    definition: 'A specialized database index that optimizes spatial queries, enabling rapid retrieval of objects based on geometric locations.',
    explanation: 'Standard database indexes (B-Trees) sort data linearly, which works for names or numbers, but fails for multidimensional spatial data. A Spatial Index (such as an R-Tree, Quadtree, or Geohash) organizes geographic objects in spatial coordinates. In an R-Tree, items are grouped into bounding boxes; during a search query, the index eliminates branches whose boxes do not intersect the search geometry, drastically speeding up geometric search queries.',
    references: [
      { label: 'Wikipedia - Spatial Index', url: 'https://en.wikipedia.org/wiki/Spatial_database_index' },
      { label: 'GDAL/OGR R-Tree index guide', url: 'https://gdal.org/' }
    ],
    related: ['PostGIS', 'GIS', 'Geoprocessing'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Bounding boxes division -->
      <rect x="40" y="40" width="320" height="200" fill="none" stroke="#475569" stroke-width="2"/>
      
      <!-- Quad 1 -->
      <rect x="40" y="40" width="160" height="100" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="3,3"/>
      <circle cx="90" cy="80" r="4" fill="#3b82f6"/>
      <circle cx="120" cy="110" r="4" fill="#3b82f6"/>
      
      <!-- Quad 2 -->
      <rect x="200" y="40" width="160" height="100" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,3"/>
      <circle cx="280" cy="90" r="4" fill="#10b981"/>
      <circle cx="310" cy="60" r="4" fill="#10b981"/>
      
      <!-- Quad 3 -->
      <rect x="40" y="140" width="160" height="100" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="3,3"/>
      
      <!-- Quad 4 -->
      <rect x="200" y="140" width="160" height="100" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
      <circle cx="270" cy="180" r="4" fill="#ef4444"/>
      <circle cx="330" cy="200" r="4" fill="#ef4444"/>

      <!-- Center lines -->
      <line x1="200" y1="40" x2="200" y2="240" stroke="#f8fafc" stroke-width="1.5"/>
      <line x1="40" y1="140" x2="360" y2="140" stroke="#f8fafc" stroke-width="1.5"/>

      <text x="200" y="270" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">QUADTREE SPATIAL INDEX SPLIT</text>
    </svg>`
  },
  {
    id: 'geoprocessing',
    term: 'Geoprocessing',
    category: 'gis',
    definition: 'GIS operations used to manipulate, analyze, and transform spatial datasets (e.g., Buffer, Clip, Intersect, Dissolve).',
    explanation: 'Geoprocessing represents a set of tools that process geographic datasets to produce new datasets. These tools help solve spatial problems and perform analytical modeling. For example: "Buffer" creates a surrounding zone of a specific radius around a feature; "Clip" uses one feature layer as a cookie cutter to crop another layer; "Intersect" determines overlay areas common to multiple input layers.',
    references: [
      { label: 'Esri - What is Geoprocessing?', url: 'https://pro.arcgis.com/en/pro-app/latest/help/analysis/geoprocessing/introduction/what-is-geoprocessing-.htm' },
      { label: 'QGIS Documentation - Spatial Analysis Vector', url: 'https://docs.qgis.org/latest/en/docs/user_manual/processing_algs/qgis/vectoranalysis.html' }
    ],
    related: ['GIS', 'Spatial Index', 'Raster Data', 'Vector Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Buffer illustration -->
      <!-- Center Line -->
      <path d="M 50 150 L 150 150 L 220 180 L 320 110" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
      <text x="180" y="220" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">Centerline</text>
      
      <!-- Buffer Zone -->
      <path d="M 50 120 L 150 120 L 210 146 L 310 76 C 330 60, 350 90, 340 110 L 230 190 C 220 200, 200 200, 195 195 L 140 180 L 50 180 C 30 180, 30 120, 50 120 Z" 
            fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" stroke-width="2" stroke-dasharray="4,4"/>
      <text x="90" y="200" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">Buffer Zone (Radius = R)</text>
      
      <!-- Radius indicator -->
      <line x1="150" y1="150" x2="150" y2="120" stroke="#f8fafc" stroke-width="1.5"/>
      <circle cx="150" cy="150" r="3" fill="#ffffff"/>
      <circle cx="150" cy="120" r="3" fill="#ffffff"/>
      <text x="160" y="140" fill="#f8fafc" font-size="9">R</text>

      <text x="200" y="260" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">BUFFER GEOPROCESSING TOOL</text>
    </svg>`
  },
  {
    id: 'kml',
    term: 'KML (Keyhole Markup Language)',
    category: 'webgis',
    definition: 'An XML-based file format used to display geographic data in an earth browser, such as Google Earth.',
    explanation: 'KML (Keyhole Markup Language) is an international standard maintained by the Open Geospatial Consortium (OGC). It uses a tag-based structure with nested elements and attributes and is based on the XML standard. KML is primarily designed for 3D visualization, allowing you to define placemarks, lines, polygons, 3D models, and overlay images. KMZ is a zipped version of a KML file, often bundling associated images or models.',
    references: [
      { label: 'OGC KML Standard Specification', url: 'https://www.ogc.org/standard/kml/' },
      { label: 'Google Earth KML Tutorial', url: 'https://developers.google.com/kml/documentation/kml_tut' }
    ],
    related: ['GeoJSON', 'Vector Data', 'WebGIS'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <!-- KML XML structure -->
      <rect x="25" y="40" width="160" height="210" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      <text x="35" y="65" fill="#f43f5e" font-family="monospace" font-size="10">&lt;kml&gt;</text>
      <text x="45" y="85" fill="#f43f5e" font-family="monospace" font-size="9">&lt;Placemark&gt;</text>
      <text x="55" y="105" fill="#cbd5e1" font-family="monospace" font-size="8">&lt;name&gt;Home&lt;/name&gt;</text>
      <text x="55" y="125" fill="#3b82f6" font-family="monospace" font-size="8">&lt;Point&gt;</text>
      <text x="65" y="145" fill="#fbbf24" font-family="monospace" font-size="7">&lt;coordinates&gt;</text>
      <text x="75" y="165" fill="#fbbf24" font-family="monospace" font-size="7">-122.08,37.42</text>
      <text x="65" y="185" fill="#fbbf24" font-family="monospace" font-size="7">&lt;/coordinates&gt;</text>
      <text x="55" y="205" fill="#3b82f6" font-family="monospace" font-size="8">&lt;/Point&gt;</text>
      <text x="45" y="225" fill="#f43f5e" font-family="monospace" font-size="9">&lt;/Placemark&gt;</text>
      <text x="35" y="242" fill="#f43f5e" font-family="monospace" font-size="10">&lt;/kml&gt;</text>

      <!-- 3D Globe representation -->
      <circle cx="290" cy="130" r="60" fill="rgba(244,63,94,0.05)" stroke="#f43f5e" stroke-width="2"/>
      <path d="M 230 130 Q 290 160 350 130" fill="none" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="3,3"/>
      <path d="M 290 70 Q 260 130 290 190" fill="none" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="3,3"/>
      <!-- Placemark pin -->
      <path d="M 285 105 C 280 105 276 109 276 114 C 276 120 285 130 285 130 C 285 130 294 120 294 114 C 294 109 290 105 285 105 Z" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
      <text x="290" y="230" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle">XML data rendered on Earth sphere</text>
    </svg>`
  },
  {
    id: 'geotiff',
    term: 'GeoTIFF',
    category: 'remotesensing',
    definition: 'A metadata standard that allows georeferencing information to be embedded directly within a TIFF raster image file.',
    explanation: 'GeoTIFF is a file format standard that embeds spatial metadata tags inside a TIFF (Tagged Image File Format) raster image. These tags include coordinate reference system (CRS) definition, map projection, ellipsoids, datums, and coordinate offsets. This allows GIS software to position the raster image automatically in the correct physical location on earth. GeoTIFF is widely used for satellite imagery, digital elevation models (DEM), and orthophotos.',
    references: [
      { label: 'OSGeo GeoTIFF Standard Directory', url: 'https://trac.osgeo.org/geotiff/' },
      { label: 'Wikipedia - GeoTIFF Format', url: 'https://en.wikipedia.org/wiki/GeoTIFF' }
    ],
    related: ['Raster Data', 'CRS', 'GIS'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect x="50" y="50" width="220" height="160" fill="none" stroke="#10b981" stroke-width="3" rx="4"/>
      <rect x="50" y="50" width="110" height="80" fill="rgba(16,185,129,0.1)"/>
      <rect x="160" y="50" width="110" height="80" fill="rgba(16,185,129,0.2)"/>
      <rect x="50" y="130" width="110" height="80" fill="rgba(16,185,129,0.3)"/>
      <rect x="160" y="130" width="110" height="80" fill="rgba(16,185,129,0.15)"/>
      <text x="160" y="135" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle">TIFF Image Data</text>
      <rect x="200" y="130" width="150" height="110" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="2" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.4))"/>
      <text x="210" y="152" fill="#3b82f6" font-family="monospace" font-size="9" font-weight="bold">Metadata Tags</text>
      <text x="210" y="172" fill="#cbd5e1" font-family="monospace" font-size="8">ModelTiepointTag = (0,0,0)</text>
      <text x="210" y="187" fill="#cbd5e1" font-family="monospace" font-size="8">ModelPixelScaleTag = (10,10,0)</text>
      <text x="210" y="202" fill="#a7f3d0" font-family="monospace" font-size="8">GeoKeyDirectoryTag (CRS)</text>
      <text x="210" y="222" fill="#fbbf24" font-family="monospace" font-size="8">EPSG:4326 (WGS84)</text>
      <line x1="90" y1="90" x2="200" y2="150" stroke="#fbbf24" stroke-width="2" stroke-dasharray="3,3" marker-end="url(#arrow)"/>
    </svg>`
  },
  {
    id: 'qgis',
    term: 'QGIS (Quantum GIS)',
    category: 'gis',
    definition: 'A free, open-source desktop GIS application that provides data viewing, editing, analysis, and map composition.',
    explanation: 'QGIS (previously known as Quantum GIS) is a cross-platform desktop application designed for viewing, editing, and analyzing spatial database formats and raster/vector layers. It is written in C++ and Python, utilizing the Qt framework. QGIS serves as the primary open-source alternative to proprietary GIS tools like Esri ArcGIS Desktop, supporting extensive third-party plugins, geoprocessing Toolboxes (GRASS, SAGA), and professional map rendering layouts.',
    references: [
      { label: 'QGIS Project Official Portal', url: 'https://www.qgis.org/' },
      { label: 'QGIS User Community Forum', url: 'https://qgis.org/en/site/forusers/index.html' }
    ],
    related: ['GIS', 'ArcGIS', 'Geoprocessing'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <circle cx="200" cy="130" r="65" fill="none" stroke="#589632" stroke-width="12"/>
      <circle cx="200" cy="130" r="45" fill="none" stroke="#93c54b" stroke-width="8"/>
      <path d="M 235 165 L 290 220" fill="none" stroke="#589632" stroke-width="14" stroke-linecap="round"/>
      <path d="M 235 165 L 290 220" fill="none" stroke="#93c54b" stroke-width="8" stroke-linecap="round"/>
      <path d="M 290 220 L 260 220 M 290 220 L 290 190" fill="none" stroke="#589632" stroke-width="8" stroke-linecap="round"/>
      <text x="200" y="260" fill="#93c54b" font-family="monospace" font-size="18" font-weight="bold" text-anchor="middle">QGIS Desktop</text>
      <text x="200" y="280" fill="#64748b" font-size="11" text-anchor="middle">Free &amp; Open Source Spatial Suite</text>
    </svg>`
  },
  {
    id: 'geocoding',
    term: 'Geocoding',
    category: 'gis',
    definition: 'The process of converting alphanumeric addresses or place names into geographic coordinates (latitude and longitude).',
    explanation: 'Geocoding takes text descriptions of locations—such as a street address, postal code, or place name (e.g. "Eiffel Tower")—and references a geospatial locator database to calculate numerical coordinate positions on Earth. "Reverse Geocoding" does the opposite: taking geographic coordinates and returning the nearest matching textual address representation.',
    references: [
      { label: 'Esri - GIS Dictionary Geocoding', url: 'https://support.esri.com/en-us/gis-dictionary/geocoding' },
      { label: 'OpenStreetMap Nominatim Geocoder', url: 'https://nominatim.openstreetmap.org/' }
    ],
    related: ['GIS', 'WebGIS', 'CRS'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect x="30" y="100" width="130" height="50" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
      <text x="40" y="122" fill="#94a3b8" font-size="8">Input Address Text:</text>
      <text x="40" y="138" fill="#f8fafc" font-size="10" font-weight="bold">1600 Amphitheatre Pkwy</text>
      <path d="M 180 125 L 240 125" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrow)"/>
      <text x="210" y="112" fill="#10b981" font-size="9" font-weight="bold" text-anchor="middle">GEOCODE</text>
      <rect x="260" y="60" width="110" height="130" rx="8" fill="rgba(6,182,212,0.05)" stroke="#06b6d4" stroke-width="2"/>
      <path d="M 260 140 Q 310 110 370 150" fill="none" stroke="#3b4f74" stroke-width="1.5"/>
      <path d="M 310 60 Q 310 120 310 190" fill="none" stroke="#3b4f74" stroke-width="1.5"/>
      <path d="M 310 95 C 305 95 301 99 301 104 C 301 110 310 122 310 122 C 310 122 319 110 319 104 C 319 99 315 95 310 95 Z" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
      <circle cx="310" cy="104" r="3.5" fill="#ffffff"/>
      <text x="310" y="75" fill="#ef4444" font-size="8" font-weight="bold" text-anchor="middle">(37.42, -122.08)</text>
      <text x="200" y="240" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">Textual Address ➔ Geographic Coordinates</text>
    </svg>`
  },
  {
    id: 'spatialjoin',
    term: 'Spatial Join',
    category: 'gis',
    definition: 'A GIS database operation that appends tabular attributes from one layer to another based on spatial relationships (e.g., Containment).',
    explanation: 'A Spatial Join overlays two geographic datasets (target layer and join layer) and appends rows together. Unlike a traditional SQL relational join (which links databases using matching alphanumeric primary/foreign keys), a Spatial Join links layers using spatial relationship rules—such as "Intersects", "Within", "Contains", or "Within a distance of". For example, spatially joining a "Schools" point layer to a "Neighborhoods" polygon layer attaches school details to the containing neighborhoods.',
    references: [
      { label: 'Esri - Spatial Join Tool Overview', url: 'https://pro.arcgis.com/en/pro-app/latest/tool-reference/analysis/spatial-join.htm' },
      { label: 'QGIS Documentation - Join Attributes by Location', url: 'https://docs.qgis.org/latest/en/docs/user_manual/processing_algs/qgis/vectorgeneral.html#join-attributes-by-location' }
    ],
    related: ['GIS', 'Geoprocessing', 'PostGIS'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <polygon points="60,60 180,50 160,150 50,130" fill="rgba(16,185,129,0.1)" stroke="#10b981" stroke-width="2"/>
      <text x="110" y="100" fill="#10b981" font-size="9" font-weight="bold">Polygon A [ID: 101]</text>
      <circle cx="100" cy="80" r="6" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
      <text x="100" y="70" fill="#ef4444" font-size="8" font-weight="bold">Point B [Store X]</text>
      <path d="M 180 100 L 230 100" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="3,3" marker-end="url(#arrow)"/>
      <text x="205" y="90" fill="#cbd5e1" font-size="8" text-anchor="middle">Is Within?</text>
      <rect x="250" y="60" width="130" height="90" rx="4" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="260" y="80" fill="#3b82f6" font-family="monospace" font-size="8" font-weight="bold">Merged Attributes</text>
      <text x="260" y="100" fill="#cbd5e1" font-family="monospace" font-size="7">Point_ID: Store X</text>
      <text x="260" y="115" fill="#cbd5e1" font-family="monospace" font-size="7">Poly_ID: 101 (Joined)</text>
      <text x="260" y="130" fill="#a7f3d0" font-family="monospace" font-size="7">Sales: $40,000</text>
    </svg>`
  },
  {
    id: 'wmts',
    term: 'Web Map Tile Service (WMTS)',
    category: 'webgis',
    definition: 'An OGC standard protocol for serving pre-rendered digital map tiles, optimizing visualization speeds in WebGIS client viewports.',
    explanation: 'Web Map Tile Service (WMTS) is a standard protocol for serving pre-rendered map tiles. Instead of rendering a map dynamically on every request (like a standard WMS), a WMTS uses a pre-calculated cache grid of 256x256 pixel images divided into discrete zoom levels (pyramid structure). The browser calculates which tiles fall into its viewport and requests those specific cached tiles, allowing fast panning and zoom operations.',
    references: [
      { label: 'OGC Web Map Tile Service Standard', url: 'https://www.ogc.org/standard/wmts/' },
      { label: 'Mapbox Tile Map Specification Guide', url: 'https://docs.mapbox.com/help/glossary/raster-tiles/' }
    ],
    related: ['WebGIS', 'WMS', 'Raster Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect x="180" y="50" width="40" height="40" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" stroke-width="1"/>
      <text x="200" y="74" fill="#06b6d4" font-size="8" text-anchor="middle">Level 0</text>
      <g transform="translate(140, 110)">
        <rect x="0" y="0" width="35" height="35" fill="rgba(16,185,129,0.1)" stroke="#10b981" stroke-width="1"/>
        <rect x="35" y="0" width="35" height="35" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="1"/>
        <rect x="0" y="35" width="35" height="35" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="1"/>
        <rect x="35" y="35" width="35" height="35" fill="rgba(16,185,129,0.1)" stroke="#10b981" stroke-width="1"/>
        <text x="35" y="42" fill="#10b981" font-size="8" text-anchor="middle">Level 1</text>
      </g>
      <g transform="translate(80, 190)">
        <rect x="0" y="0" width="20" height="20" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="0.5"/>
        <rect x="20" y="0" width="20" height="20" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="0.5"/>
        <rect x="40" y="0" width="20" height="20" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="0.5"/>
        <rect x="60" y="0" width="20" height="20" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="0.5"/>
        <rect x="0" y="20" width="20" height="20" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="0.5"/>
        <rect x="20" y="20" width="20" height="20" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
        <rect x="40" y="20" width="20" height="20" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="0.5"/>
        <rect x="60" y="20" width="20" height="20" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="0.5"/>
        <text x="120" y="25" fill="#3b82f6" font-size="8">Level 2 (High detail)</text>
      </g>
      <path d="M 230 190 Q 200 170 110 215" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="3,3" marker-end="url(#arrow)"/>
      <text x="180" y="165" fill="#ef4444" font-size="8" font-weight="bold">Fetch specific tile (z/x/y)</text>
    </svg>`
  },
  {
    id: 'electromagneticspectrum',
    term: 'Electromagnetic Spectrum',
    category: 'remotesensing',
    definition: 'The full range of electromagnetic radiation frequencies, used in Remote Sensing to identify Earth features.',
    explanation: 'The Electromagnetic Spectrum spans from high-energy gamma rays to low-energy radio waves. Remote sensing primarily utilizes the Visible (Blue, Green, Red), Near-Infrared (NIR), Shortwave Infrared (SWIR), and Thermal Infrared (TIR) bands, as well as Microwave bands (Radar). Different materials on Earth (water, soil, vegetation) reflect, absorb, or emit electromagnetic radiation in distinct patterns known as spectral signatures, which sensors record to identify and analyze land cover features.',
    references: [
      { label: 'NASA - Anatomy of an Electromagnetic Wave', url: 'https://science.nasa.gov/ems/01_intro' },
      { label: 'Canada Centre for Remote Sensing - RS Fundamentals', url: 'https://natural-resources.canada.ca/maps-tools-and-publications/satellite-imagery-and-air-photos/tutorial-fundamentals-remote-sensing/9303' }
    ],
    related: ['Remote Sensing', 'NDVI', 'GeoTIFF'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <path d="M 20 150 C 23 110, 27 110, 30 150 C 33 190, 37 190, 40 150 C 45 100, 50 100, 55 150 C 60 200, 65 200, 70 150 C 80 80, 90 80, 100 150 C 110 220, 120 220, 130 150 C 145 60, 160 60, 175 150 C 190 240, 205 240, 220 150 C 245 50, 270 50, 295 150 C 320 250, 345 250, 370 150" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
      <line x1="20" y1="210" x2="370" y2="210" stroke="#475569" stroke-width="1.5"/>
      <text x="45" y="230" fill="#a7f3d0" font-size="9" text-anchor="middle">UV</text>
      <text x="115" y="230" fill="#06b6d4" font-size="9" text-anchor="middle">Visible</text>
      <text x="195" y="230" fill="#fbbf24" font-size="9" text-anchor="middle">Near-IR</text>
      <text x="280" y="230" fill="#f43f5e" font-size="9" text-anchor="middle">Thermal-IR</text>
      <text x="345" y="230" fill="#64748b" font-size="9" text-anchor="middle">Microwave</text>
      <text x="200" y="270" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">ELECTROMAGNETIC SPECTRUM IN RS</text>
    </svg>`
  },
  {
    id: 'ndvi',
    term: 'NDVI (Normalized Difference Vegetation Index)',
    category: 'remotesensing',
    definition: 'A standardized index to quantify vegetation greenness by comparing Red and Near-Infrared spectral reflectance.',
    explanation: 'NDVI is calculated using the formula: NDVI = (NIR - Red) / (NIR + Red). Chlorophyll in healthy green vegetation strongly absorbs visible red light for photosynthesis, while the cellular structure of leaves strongly reflects near-infrared (NIR) light. High NDVI values (closer to 1.0) indicate dense, healthy green vegetation, while low values (around 0) indicate soil, rock, or water, and negative values indicate clouds or snow.',
    references: [
      { label: 'USGS - What is NDVI?', url: 'https://www.usgs.gov/landsat-missions/normalized-difference-vegetation-index' },
      { label: 'NASA Earth Observatory - Measuring Vegetation', url: 'https://earthobservatory.nasa.gov/features/MeasuringVegetation' }
    ],
    related: ['Remote Sensing', 'Image Processing', 'Raster Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <path d="M 70 170 C 70 100, 170 100, 170 170 C 170 240, 70 240, 70 170 Z" fill="#10b981" opacity="0.8" stroke="#047857" stroke-width="2"/>
      <path d="M 70 170 L 170 170" stroke="#047857" stroke-width="2"/>
      <text x="120" y="215" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">Healthy Leaf</text>
      <path d="M 120 70 L 120 135" fill="none" stroke="#ef4444" stroke-width="2.5" marker-end="url(#arrow)"/>
      <text x="110" y="90" fill="#ef4444" font-size="8" text-anchor="end">Red Light (8% Reflected)</text>
      <path d="M 140 70 L 140 100 Q 140 130 160 110" fill="none" stroke="#06b6d4" stroke-width="3" marker-end="url(#arrow)"/>
      <text x="150" y="80" fill="#06b6d4" font-size="8" text-anchor="start">NIR Light (50% Reflected)</text>
      <rect x="210" y="100" width="160" height="90" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
      <text x="290" y="125" fill="#3b82f6" font-family="var(--font-title)" font-size="12" font-weight="bold" text-anchor="middle">NDVI FORMULA</text>
      <text x="290" y="155" fill="#f8fafc" font-family="monospace" font-size="11" text-anchor="middle">NIR - Red</text>
      <line x1="230" y1="162" x2="350" y2="162" stroke="#475569" stroke-width="1.5"/>
      <text x="290" y="178" fill="#f8fafc" font-family="monospace" font-size="11" text-anchor="middle">NIR + Red</text>
    </svg>`
  },
  {
    id: 'orthorectification',
    term: 'Orthorectification',
    category: 'imageprocessing',
    definition: 'The process of correcting imagery geometries to remove lens distortion, camera tilt, and terrain relief displacement.',
    explanation: 'Orthorectification is a geometric correction process applied to raw aerial or satellite images. Raw photos have perspective distortions caused by topographic relief (mountains vs valleys), camera tilt, and lens characteristics. Using ground control points and a Digital Elevation Model (DEM), orthorectification warps the image so that it has a uniform scale throughout, behaving like a planimetrically correct vector map where distances can be measured accurately.',
    references: [
      { label: 'USGS - Orthophotography definition', url: 'https://www.usgs.gov/faqs/what-is-orthophotophotography' },
      { label: 'Esri - Introduction to Orthorectification', url: 'https://pro.arcgis.com/en/pro-app/latest/help/data/imagery/introduction-to-orthorectification.htm' }
    ],
    related: ['Image Processing', 'Photogrammetry', 'DEM'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <circle cx="200" cy="50" r="10" fill="#3b82f6"/>
      <polygon points="190,50 170,80 230,80" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="1"/>
      <text x="200" y="35" fill="#3b82f6" font-size="9" font-weight="bold" text-anchor="middle">Aerial Camera</text>
      <path d="M 50 200 Q 120 150 200 210 T 350 180" fill="none" stroke="#64748b" stroke-width="2"/>
      <text x="120" y="160" fill="#64748b" font-size="8">Hilly Ground Profile</text>
      <line x1="200" y1="50" x2="90" y2="175" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
      <line x1="200" y1="50" x2="280" y2="195" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
      <text x="105" y="110" fill="#ef4444" font-size="8">Distorted Ray</text>
      <line x1="90" y1="175" x2="90" y2="250" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)"/>
      <line x1="280" y1="195" x2="280" y2="250" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)"/>
      <line x1="40" y1="250" x2="360" y2="250" stroke="#10b981" stroke-width="2"/>
      <text x="200" y="270" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle">Corrected flat orthogonal grid map</text>
    </svg>`
  },
  {
    id: 'supervisedclassification',
    term: 'Supervised Classification',
    category: 'imageprocessing',
    definition: 'An image classification technique guided by training samples to categorize pixels into land cover types.',
    explanation: 'Supervised Classification is a machine learning image processing technique. The analyst selects representative sample pixels (training sites) for known land cover categories (such as water, forest, agriculture, urban). The classification algorithm (e.g., Maximum Likelihood, Random Forest) calculates the spectral signatures of these training areas and assigns all other pixels in the image to the category they spectrally resemble most closely.',
    references: [
      { label: 'GIS Geography - Image Classification Guide', url: 'https://gisgeography.com/supervised-unsupervised-classification-arcgis/' },
      { label: 'QGIS Classification Tutorial', url: 'https://fromgistors.blogspot.com/p/semi-automatic-classification-plugin.html' }
    ],
    related: ['Image Processing', 'Remote Sensing', 'Raster Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <g transform="translate(40, 50)" stroke="#1e293b" stroke-width="1">
        <rect x="0" y="0" width="40" height="40" fill="#3b82f6"/>
        <rect x="40" y="0" width="40" height="40" fill="#3b82f6"/>
        <rect x="80" y="0" width="40" height="40" fill="#047857"/>
        <rect x="120" y="0" width="40" height="40" fill="#047857"/>
        <rect x="0" y="40" width="40" height="40" fill="#3b82f6"/>
        <rect x="40" y="40" width="40" height="40" fill="#fbbf24"/>
        <rect x="80" y="40" width="40" height="40" fill="#047857"/>
        <rect x="120" y="40" width="40" height="40" fill="#047857"/>
        <rect x="0" y="80" width="40" height="40" fill="#fbbf24"/>
        <rect x="40" y="80" width="40" height="40" fill="#fbbf24"/>
        <rect x="80" y="80" width="40" height="40" fill="#047857"/>
        <rect x="120" y="80" width="40" height="40" fill="#1e293b"/>
        <rect x="0" y="120" width="40" height="40" fill="#fbbf24"/>
        <rect x="40" y="120" width="40" height="40" fill="#fbbf24"/>
        <rect x="80" y="120" width="40" height="40" fill="#1e293b"/>
        <rect x="120" y="120" width="40" height="40" fill="#1e293b"/>
      </g>
      <g transform="translate(230, 80)">
        <rect x="0" y="0" width="20" height="20" fill="#3b82f6" stroke="#ffffff"/>
        <text x="30" y="14" fill="#f8fafc" font-size="11">Water Class</text>
        <rect x="0" y="30" width="20" height="20" fill="#047857" stroke="#ffffff"/>
        <text x="30" y="44" fill="#f8fafc" font-size="11">Forest Class</text>
        <rect x="0" y="60" width="20" height="20" fill="#fbbf24" stroke="#ffffff"/>
        <text x="30" y="74" fill="#f8fafc" font-size="11">Agriculture Class</text>
        <rect x="0" y="90" width="20" height="20" fill="#1e293b" stroke="#ffffff"/>
        <text x="30" y="104" fill="#f8fafc" font-size="11">Urban/Soil Class</text>
      </g>
      <text x="200" y="260" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">SUPERVISED CLASSIFICATION RESULTS</text>
    </svg>`
  },
  {
    id: 'gsd',
    term: 'GSD (Ground Sample Distance)',
    category: 'photogrammetry',
    definition: 'The physical distance on the ground represented by the center of two consecutive pixels in an image.',
    explanation: 'Ground Sample Distance (GSD) is a crucial metric in photogrammetry and remote sensing that defines the spatial resolution of an image. If a camera has a GSD of 2.5 cm, it means that a single pixel in the digital photo represents a 2.5 cm x 2.5 cm area on the ground. A smaller GSD means higher resolution and detail. GSD is determined by flight height (altitude), camera focal length, and sensor pixel pitch.',
    references: [
      { label: 'Pix4D - What is Ground Sample Distance (GSD)?', url: 'https://www.pix4d.com/blog/what-is-gsd/' },
      { label: 'Wingtra - GSD Calculator Guide', url: 'https://wingtra.com/gsd-ground-sample-distance-calculator/' }
    ],
    related: ['Photogrammetry', 'Remote Sensing', 'DSM'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <g transform="translate(160, 40)" stroke="#3b82f6" stroke-width="1">
        <rect x="0" y="0" width="20" height="20" fill="none"/>
        <rect x="20" y="0" width="20" height="20" fill="rgba(59,130,246,0.3)"/>
        <rect x="40" y="0" width="20" height="20" fill="none"/>
        <text x="30" y="-10" fill="#3b82f6" font-size="8" text-anchor="middle">Sensor Pixel</text>
      </g>
      <ellipse cx="200" cy="110" rx="15" ry="6" fill="#06b6d4"/>
      <line x1="180" y1="60" x2="200" y2="110" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="200" y1="60" x2="200" y2="110" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="200" y1="110" x2="100" y2="220" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="3,3"/>
      <line x1="200" y1="110" x2="300" y2="220" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="3,3"/>
      <g transform="translate(100, 220)" stroke="#10b981" stroke-width="2">
        <line x1="0" y1="0" x2="200" y2="0"/>
        <line x1="0" y1="0" x2="0" y2="15"/>
        <line x1="100" y1="0" x2="100" y2="15"/>
        <line x1="200" y1="0" x2="200" y2="15"/>
        <path d="M 0 10 L 100 10" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#arrow)" marker-start="url(#arrow)"/>
        <text x="50" y="25" fill="#fbbf24" font-size="9" font-weight="bold" text-anchor="middle">GSD (e.g. 5 cm)</text>
      </g>
    </svg>`
  },
  {
    id: 'aerialtriangulation',
    term: 'Aerial Triangulation',
    category: 'photogrammetry',
    definition: 'The mathematical process of determining three-dimensional coordinates of ground points from overlapping photos.',
    explanation: 'Aerial Triangulation (AT) is the cornerstone of photogrammetry. When a drone or aircraft takes overlapping photos along a flight line, AT uses tie points (features visible in multiple images) and Ground Control Points (GCPs) to calculate the exact 3D position and orientation of the camera for every photo. This establishes a mathematically continuous stereoscopic model, enabling the production of accurate orthophotos, DSMs, and 3D terrain meshes.',
    references: [
      { label: 'Wikipedia - Aerial Triangulation', url: 'https://en.wikipedia.org/wiki/Aerial_triangulation' },
      { label: 'Pix4D - Block Bundle Adjustment', url: 'https://support.pix4d.com/hc/en-us/articles/202559099-Bundle-Block-Adjustment' }
    ],
    related: ['Photogrammetry', 'GSD', 'DSM'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <g transform="translate(100, 50)">
        <rect x="0" y="0" width="40" height="25" rx="3" fill="#3b82f6"/>
        <circle cx="20" cy="28" r="6" fill="#cbd5e1"/>
        <line x1="20" y1="28" x2="-40" y2="200" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
        <line x1="20" y1="28" x2="80" y2="200" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
      </g>
      <g transform="translate(240, 50)">
        <rect x="0" y="0" width="40" height="25" rx="3" fill="#3b82f6"/>
        <circle cx="20" cy="28" r="6" fill="#cbd5e1"/>
        <line x1="20" y1="28" x2="100" y2="200" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
        <line x1="20" y1="28" x2="220" y2="200" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
      </g>
      <line x1="120" y1="78" x2="200" y2="210" stroke="#f43f5e" stroke-width="2"/>
      <line x1="260" y1="78" x2="200" y2="210" stroke="#f43f5e" stroke-width="2"/>
      <polygon points="200,210 205,195 195,195" fill="#f43f5e"/>
      <line x1="200" y1="210" x2="200" y2="230" stroke="#f43f5e" stroke-width="1.5"/>
      <text x="200" y="245" fill="#f43f5e" font-size="10" font-weight="bold" text-anchor="middle">GCP (Tie Point)</text>
      <path d="M 40 210 Q 150 180 200 210 T 360 200" fill="none" stroke="#64748b" stroke-width="2"/>
      <text x="200" y="280" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">INTERSECTING RAYS (AERIAL TRIANGULATION)</text>
    </svg>`
  },
  {
    id: 'histogramequalization',
    term: 'Histogram Equalization',
    category: 'imageprocessing',
    definition: 'A contrast-adjustment technique that spreads out pixel intensity frequencies to enhance image detail.',
    explanation: 'Histogram Equalization is a digital image processing method that improves image contrast. It maps the cumulative distribution function (CDF) of pixel intensities to a linear profile, spreading out the most frequent intensity values. This effectively expands the dynamic range of low-contrast images (such as hazy satellite photographs or dark underwater scans), making hidden features visually distinct.',
    references: [
      { label: 'Wikipedia - Histogram Equalization', url: 'https://en.wikipedia.org/wiki/Histogram_equalization' },
      { label: 'OpenCV - Histograms Equalization Guide', url: 'https://docs.opencv.org/4.x/d4/d1b/tutorial_histogram_equalization.html' }
    ],
    related: ['Image Processing', 'Contrast Stretching', 'Remote Sensing'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Input Histogram (Clustered) -->
      <g transform="translate(30, 60)" stroke="#f43f5e" stroke-width="2">
        <rect x="0" y="0" width="120" height="80" fill="rgba(244,63,94,0.05)" stroke="#475569" stroke-width="1.5"/>
        <path d="M 10 75 Q 35 75 55 10 T 75 75 L 110 75" fill="none"/>
        <text x="60" y="95" fill="#94a3b8" font-size="8" text-anchor="middle">Low Contrast (Clustered)</text>
      </g>
      
      <!-- Arrow -->
      <path d="M 175 100 L 225 100" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrow)"/>
      <text x="200" y="90" fill="#10b981" font-size="9" font-weight="bold" text-anchor="middle">Equalize</text>

      <!-- Output Histogram (Spread) -->
      <g transform="translate(250, 60)" stroke="#06b6d4" stroke-width="2">
        <rect x="0" y="0" width="120" height="80" fill="rgba(6,182,212,0.05)" stroke="#475569" stroke-width="1.5"/>
        <path d="M 10 40 Q 30 50 60 40 T 110 45" fill="none"/>
        <text x="60" y="95" fill="#94a3b8" font-size="8" text-anchor="middle">Equalized (Spread Out)</text>
      </g>
      
      <text x="200" y="240" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">HISTOGRAM EQUALIZATION PROCESS</text>
    </svg>`
  },
  {
    id: 'spatialfiltering',
    term: 'Spatial Filtering (Convolution)',
    category: 'imageprocessing',
    definition: 'An image enhancement technique that passes a kernel matrix over pixels to sharpen, blur, or extract edges.',
    explanation: 'Spatial filtering performs calculations directly on the pixel grid. A small matrix (usually 3x3 or 5x5, called a kernel) slides over every pixel in the image. The center pixel is updated with the weighted sum of its neighbors multiplied by the kernel values. Common spatial filters in GIS image processing include high-pass filters (for edge detection and sharpening) and low-pass filters (for smoothing out speckle noise in radar data).',
    references: [
      { label: 'Wikipedia - Kernel Image Processing', url: 'https://en.wikipedia.org/wiki/Kernel_(image_processing)' },
      { label: 'ESRI - How Filter Works', url: 'https://pro.arcgis.com/en/pro-app/latest/tool-reference/spatial-analyst/how-filter-works.htm' }
    ],
    related: ['Image Processing', 'Raster Data', 'Remote Sensing'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Grid -->
      <g transform="translate(40, 50)" stroke="#334155" stroke-width="1">
        <rect x="0" y="0" width="120" height="120" fill="none"/>
        <line x1="40" y1="0" x2="40" y2="120"/>
        <line x1="80" y1="0" x2="80" y2="120"/>
        <line x1="0" y1="40" x2="120" y2="40"/>
        <line x1="0" y1="80" x2="120" y2="80"/>
        <!-- Highlight 3x3 Kernel Area -->
        <rect x="0" y="0" width="120" height="120" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="2"/>
        <circle cx="60" cy="60" r="15" fill="none" stroke="#ef4444" stroke-width="2"/>
        <text x="60" y="64" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">P</text>
      </g>
      <!-- Kernel box -->
      <g transform="translate(220, 60)">
        <rect x="0" y="0" width="120" height="100" rx="6" fill="#1e293b" stroke="#06b6d4" stroke-width="2"/>
        <text x="60" y="22" fill="#06b6d4" font-size="11" font-weight="bold" text-anchor="middle">3x3 Kernel Matrix</text>
        <text x="30" y="50" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
        <text x="60" y="50" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
        <text x="90" y="50" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
        <text x="30" y="70" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
        <text x="60" y="70" fill="#ef4444" font-family="monospace" font-size="10" font-weight="bold">9</text>
        <text x="90" y="70" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
        <text x="30" y="90" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
        <text x="60" y="90" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
        <text x="90" y="90" fill="#cbd5e1" font-family="monospace" font-size="9">-1</text>
      </g>
      <text x="200" y="240" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">KERNEL CONVOLUTION FILTER (SHARPEN)</text>
    </svg>`
  },
  {
    id: 'contraststretching',
    term: 'Contrast Stretching',
    category: 'imageprocessing',
    definition: 'An image enhancement process that linearly stretches pixel value ranges to cover the full dynamic spectrum.',
    explanation: 'Contrast Stretching (also called normalization) is a simple image processing technique. If a satellite image primarily contains pixel values clustered between 40 and 120, it will look dark and dull. Contrast stretching scales these values linearly so that the minimum value (40) maps to 0 (black) and the maximum value (120) maps to 255 (white), using the full dynamic range of the display device to show fine details.',
    references: [
      { label: 'Earth Observation College - Contrast Enhancement', url: 'https://eo-college.org/resources/contrast-enhancement/' },
      { label: 'QGIS Raster Contrast Enhancement', url: 'https://docs.qgis.org/latest/en/docs/user_manual/working_with_raster/raster_properties.html' }
    ],
    related: ['Image Processing', 'Histogram Equalization', 'Raster Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Input narrow band -->
      <line x1="60" y1="80" x2="340" y2="80" stroke="#475569" stroke-width="2"/>
      <rect x="130" y="70" width="80" height="20" fill="rgba(244,63,94,0.3)" stroke="#f43f5e" stroke-width="2"/>
      <text x="130" y="62" fill="#f43f5e" font-size="8" text-anchor="middle">Min (40)</text>
      <text x="210" y="62" fill="#f43f5e" font-size="8" text-anchor="middle">Max (120)</text>
      
      <!-- Linear stretch indicators -->
      <path d="M 130 90 L 60 170" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)"/>
      <path d="M 210 90 L 340 170" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)"/>
      
      <!-- Output full band -->
      <line x1="60" y1="180" x2="340" y2="180" stroke="#475569" stroke-width="2"/>
      <rect x="60" y="170" width="280" height="20" fill="rgba(6,182,212,0.2)" stroke="#06b6d4" stroke-width="2"/>
      <text x="60" y="210" fill="#06b6d4" font-size="8" text-anchor="middle">New Min (0)</text>
      <text x="340" y="210" fill="#06b6d4" font-size="8" text-anchor="middle">New Max (255)</text>
      <text x="200" y="260" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">LINEAR CONTRAST STRETCH (0 - 255)</text>
    </svg>`
  },
  {
    id: 'pansharpening',
    term: 'Pan-sharpening',
    category: 'imageprocessing',
    definition: 'A pixel-level fusion technique combining high-resolution panchromatic imagery with lower-resolution multispectral imagery.',
    explanation: 'Pan-sharpening is an image fusion process. Satellites often capture two types of images: a high-resolution Panchromatic band (black-and-white, detail-rich) and lower-resolution Multispectral bands (color-rich, but pixelated). Pan-sharpening algorithms (like Brovey or IHS) fuse the structural detail of the panchromatic image with the color signatures of the multispectral images, yielding a high-resolution color imagery product.',
    references: [
      { label: 'Wikipedia - Pansharpened', url: 'https://en.wikipedia.org/wiki/Pansharpened' },
      { label: 'Esri - Fundamentals of Pan-sharpening', url: 'https://pro.arcgis.com/en/pro-app/latest/help/analysis/raster-app/fundamentals-of-pan-sharpening.htm' }
    ],
    related: ['Image Processing', 'Remote Sensing', 'Raster Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Panchromatic -->
      <g transform="translate(30, 40)">
        <rect x="0" y="0" width="80" height="80" fill="none" stroke="#64748b" stroke-width="1"/>
        <line x1="20" y1="0" x2="20" y2="80" stroke="#64748b"/>
        <line x1="40" y1="0" x2="40" y2="80" stroke="#64748b"/>
        <line x1="60" y1="0" x2="60" y2="80" stroke="#64748b"/>
        <text x="40" y="98" fill="#94a3b8" font-size="9" font-weight="bold" text-anchor="middle">Panchromatic (B&amp;W)</text>
        <text x="40" y="45" fill="#94a3b8" font-size="7" text-anchor="middle">Sharp Structure</text>
      </g>
      <!-- Multispectral -->
      <g transform="translate(150, 40)">
        <rect x="0" y="0" width="80" height="80" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1"/>
        <rect x="0" y="0" width="40" height="40" fill="#f43f5e" opacity="0.3"/>
        <rect x="40" y="40" width="40" height="40" fill="#06b6d4" opacity="0.3"/>
        <text x="40" y="98" fill="#f43f5e" font-size="9" font-weight="bold" text-anchor="middle">Multispectral (Color)</text>
        <text x="40" y="45" fill="#f43f5e" font-size="7" text-anchor="middle">Coarse Resolution</text>
      </g>
      <!-- Arrow merge -->
      <path d="M 120 160 L 180 160" fill="none"/>
      <path d="M 70 130 L 160 195" fill="none" stroke="#10b981" stroke-width="2.5" marker-end="url(#arrow)"/>
      <path d="M 190 130 L 190 185" fill="none" stroke="#10b981" stroke-width="2.5" marker-end="url(#arrow)"/>
      <!-- Fused Output -->
      <g transform="translate(270, 40)">
        <rect x="0" y="0" width="80" height="80" fill="none" stroke="#10b981" stroke-width="2"/>
        <line x1="20" y1="0" x2="20" y2="80" stroke="#cbd5e1" stroke-width="0.5"/>
        <line x1="40" y1="0" x2="40" y2="80" stroke="#cbd5e1" stroke-width="0.5"/>
        <line x1="60" y1="0" x2="60" y2="80" stroke="#cbd5e1" stroke-width="0.5"/>
        <rect x="20" y="20" width="20" height="20" fill="#10b981" opacity="0.5"/>
        <text x="40" y="98" fill="#10b981" font-size="9" font-weight="bold" text-anchor="middle">Pan-sharpened</text>
        <text x="40" y="45" fill="#10b981" font-size="7" text-anchor="middle">Sharp Color Map</text>
      </g>
    </svg>`
  },
  {
    id: 'atmosphericcorrection',
    term: 'Atmospheric Correction',
    category: 'imageprocessing',
    definition: 'The process of removing atmospheric scattering and absorption distortion from satellite imagery reflectance measurements.',
    explanation: 'Atmospheric Correction removes the distortions introduced by the atmosphere as sunlight travels to Earth and reflects back to satellite sensors. Dust, aerosols, water vapor, and gases scatter and absorb light (e.g. Rayleigh scattering). Atmospheric correction algorithms (such as FLAASH or Sen2Cor) convert raw \'Top-of-Atmosphere\' (TOA) radiance values into true \'Bottom-of-Atmosphere\' (BOA) surface reflectance values, allowing correct multi-temporal vegetation analysis.',
    references: [
      { label: 'USGS - Landsat Surface Reflectance Data', url: 'https://www.usgs.gov/landsat-missions/landsat-surface-reflectance' },
      { label: 'ESA Sentinel-2 L2A Processor', url: 'https://step.esa.int/main/third-party-plugins-2/sen2cor/' }
    ],
    related: ['Image Processing', 'Remote Sensing', 'NDVI'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <!-- Sun -->
      <circle cx="50" cy="50" r="20" fill="#fbbf24"/>
      <line x1="50" y1="80" x2="100" y2="130" stroke="#fbbf24" stroke-width="2"/>
      
      <!-- Atmosphere gas cloud -->
      <rect x="120" y="80" width="160" height="40" rx="20" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="4,4"/>
      <text x="200" y="104" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">Atmosphere Layer (Scattering)</text>
      
      <!-- Satellite -->
      <rect x="300" y="30" width="50" height="30" rx="4" fill="#475569" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="325" y1="60" x2="325" y2="90" stroke="#cbd5e1"/>
      
      <!-- Light rays -->
      <path d="M 70 80 L 150 140" fill="none" stroke="#fbbf24" stroke-dasharray="3,3"/>
      <path d="M 180 150 L 325 70" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="260" y="150" fill="#10b981" font-size="9" font-weight="bold">Surface Reflectance (BOA)</text>
      
      <!-- Ground surface line -->
      <line x1="20" y1="200" x2="380" y2="200" stroke="#64748b" stroke-width="3"/>
      <polygon points="170,200 180,180 190,200" fill="#64748b"/>
      <text x="200" y="240" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">ATMOSPHERIC CORRECTION CORRECTION FLOW</text>
    </svg>`
  },
  {
    id: 'ndsi',
    term: 'NDSI (Normalized Difference Snow Index)',
    category: 'remotesensing',
    definition: 'A satellite spectral index used to detect and map snow cover by comparing Green and Shortwave Infrared (SWIR) reflectance.',
    explanation: 'NDSI is calculated using the formula: NDSI = (Green - SWIR) / (Green + SWIR). Snow has very high reflectance in the visible green band, but very low reflectance (strong absorption) in the shortwave infrared (SWIR) band. Conversely, other features like clouds have high reflectance in both bands. This allows NDSI to clearly distinguish snow from clouds and bare ground, making it a critical tool for hydrology, climate monitoring, and glacier mapping.',
    references: [
      { label: 'NSIDC - NDSI Science Guide', url: 'https://nsidc.org/data/g02156' },
      { label: 'USGS - Normalized Difference Snow Index', url: 'https://www.usgs.gov/landsat-missions/normalized-difference-snow-index' }
    ],
    related: ['Remote Sensing', 'NDVI', 'Raster Data'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <polygon points="120,220 200,80 280,220" fill="#334155" stroke="#475569" stroke-width="2"/>
      <polygon points="171,130 200,80 229,130 215,120 200,135 185,120" fill="#f8fafc"/>
      <text x="200" y="245" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">Snow Cover</text>
      <path d="M 160 50 L 180 100" fill="none" stroke="#10b981" stroke-width="2.5" marker-end="url(#arrow)"/>
      <text x="150" y="70" fill="#10b981" font-size="8" text-anchor="end">Green Light (90% Reflected)</text>
      <path d="M 240 50 L 220 100" fill="none" stroke="#f43f5e" stroke-width="2.5" marker-end="url(#arrow)"/>
      <text x="250" y="70" fill="#f43f5e" font-size="8" text-anchor="start">SWIR Light (5% Reflected)</text>
      <rect x="110" y="160" width="180" height="70" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" opacity="0.9"/>
      <text x="200" y="180" fill="#3b82f6" font-family="var(--font-title)" font-size="11" font-weight="bold" text-anchor="middle">NDSI FORMULA</text>
      <text x="200" y="200" fill="#f8fafc" font-family="monospace" font-size="10" text-anchor="middle">Green - SWIR</text>
      <line x1="140" y1="205" x2="260" y2="205" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="200" y="218" fill="#f8fafc" font-family="monospace" font-size="10" text-anchor="middle">Green + SWIR</text>
    </svg>`
  },
  {
    id: 'dem',
    term: 'DEM (Digital Elevation Model)',
    category: 'gis',
    definition: 'A bare-earth raster grid representing topographic elevation relative to a vertical datum, excluding surface features like vegetation and buildings.',
    explanation: 'A Digital Elevation Model (DEM) represents the bare ground surface of the Earth. It is generated by removing all buildings, trees, and other non-ground features from source datasets (such as LiDAR points or stereoscopic aerial photos). DEMs are the foundation for hydrological modeling (delineating watersheds and flow paths), orthorectification of aerial photos, and slope/aspect calculations.',
    references: [
      { label: 'USGS - What is a Digital Elevation Model?', url: 'https://www.usgs.gov/faqs/what-digital-elevation-model-dem' },
      { label: 'GIS Geography - DEM, DTM, and DSM Differences', url: 'https://gisgeography.com/dem-dsm-dtm-differences/' }
    ],
    related: ['DTM', 'DSM', 'Raster Data', 'LiDAR'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <path d="M 30 220 Q 120 120 200 200 T 370 170" fill="none" stroke="#10b981" stroke-width="3"/>
      <line x1="120" y1="155" x2="120" y2="250" stroke="#475569" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="120" cy="155" r="4" fill="#10b981"/>
      <text x="120" y="265" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">Bare Earth Elevation (DEM)</text>
      <text x="200" y="235" fill="#64748b" font-size="11" text-anchor="middle">All vegetation &amp; structures filtered out</text>
    </svg>`
  },
  {
    id: 'dtm',
    term: 'DTM (Digital Terrain Model)',
    category: 'photogrammetry',
    definition: 'A bare-earth elevation model augmented with vector breaklines and mass points to represent natural terrain changes.',
    explanation: 'A Digital Terrain Model (DTM) is a bare-earth elevation dataset (similar to a DEM) but specifically augmented with geomorphological features like breaklines, cliffs, ridges, and mass points. While DEM is a simple raster grid, a DTM is often represented as a vector TIN (Triangulated Irregular Network) that precisely captures abrupt terrain changes and slopes. DTMs are heavily used in civil engineering, road design, and land survey planning.',
    references: [
      { label: 'Esri - GIS Dictionary DTM', url: 'https://support.esri.com/en-us/gis-dictionary/digital-terrain-model' },
      { label: 'GIS Geography - DTM, DTM, and DSM Differences', url: 'https://gisgeography.com/dem-dsm-dtm-differences/' }
    ],
    related: ['DEM', 'DSM', 'Photogrammetry', 'LiDAR'],
    diagram: `<svg viewBox="0 0 400 300" width="100%" height="100%">
      <rect width="400" height="300" rx="10" fill="none"/>
      <path d="M 30 220 L 150 170 L 160 120 L 250 130 L 370 190" fill="none" stroke="#ef4444" stroke-width="3"/>
      <circle cx="150" cy="170" r="5" fill="#3b82f6"/>
      <circle cx="160" cy="120" r="5" fill="#3b82f6"/>
      <text x="135" y="115" fill="#3b82f6" font-size="8" font-weight="bold">Breakline Cliff Point</text>
      <circle cx="250" cy="130" r="5" fill="#3b82f6"/>
      <line x1="160" y1="120" x2="160" y2="250" stroke="#475569" stroke-width="1" stroke-dasharray="2,2"/>
      <text x="200" y="265" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">Morphological Terrain Profile (DTM)</text>
    </svg>`
  }
];

// CLOUD STORAGE CONFIGURATION (Optional - for global synchronization)
// If you want everyone accessing the site to see the same terms, set up a free Firebase Realtime Database
// and paste the Database URL here (e.g., "https://your-project-default-rtdb.firebaseio.com/").
// Leave it as null or empty to use local browser storage (private to each user).
const FIREBASE_DB_URL = "https://geospatialdictonary-default-rtdb.firebaseio.com/";

// Helper Functions for Custom Terms Local Storage & Firebase Cloud Sync
async function getCustomTerms() {
  // If Firebase URL is set, fetch from the cloud database
  if (FIREBASE_DB_URL) {
    const cleanUrl = FIREBASE_DB_URL.endsWith('/') ? FIREBASE_DB_URL.slice(0, -1) : FIREBASE_DB_URL;
    try {
      const res = await fetch(`${cleanUrl}/custom_terms.json`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const terms = Array.isArray(data) ? data.filter(Boolean) : (data ? Object.values(data) : []);
        // Cache to localStorage for offline fallback
        localStorage.setItem('gis_dict_custom_terms', JSON.stringify(terms));
        return terms;
      }
    } catch (err) {
      console.warn('[Firebase] Offline or fetch failed, falling back to local cache:', err);
    }
  }

  // Fallback to local storage if Firebase URL is not configured or network request fails
  const data = localStorage.getItem('gis_dict_custom_terms');
  return data ? JSON.parse(data) : [];
}

async function saveCustomTerms(terms) {
  // Save to local storage first (offline caching)
  localStorage.setItem('gis_dict_custom_terms', JSON.stringify(terms));

  // If Firebase URL is set, update the cloud database
  if (FIREBASE_DB_URL) {
    const cleanUrl = FIREBASE_DB_URL.endsWith('/') ? FIREBASE_DB_URL.slice(0, -1) : FIREBASE_DB_URL;
    try {
      console.log('[Firebase] Attempting to push terms to:', `${cleanUrl}/custom_terms.json`);
      const res = await fetch(`${cleanUrl}/custom_terms.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terms)
      });
      if (!res.ok) {
        throw new Error(`HTTP Error Status: ${res.status} ${res.statusText}`);
      }
      console.log('[Firebase] Cloud database updated successfully');
    } catch (err) {
      console.error('[Firebase] Save failed error details:', err);
      showToast(`Cloud sync failed: ${err.message}. Saved locally offline.`, 'error');
    }
  }
}

function getAllTerms() {
  const custom = state.customTerms || [];
  // Mark custom terms with a property to style/handle them differently
  const markedCustom = custom.map(t => ({ ...t, isCustom: true }));
  return [...PRESEEDED_TERMS, ...markedCustom];
}

// Toast Notifications Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : 
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slide-in 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Render Term Cards
function renderTermsList() {
  const termsGrid = document.getElementById('terms-grid');
  const allTerms = getAllTerms();
  
  // Sort terms alphabetically by title
  allTerms.sort((a, b) => a.term.localeCompare(b.term));
  
  // Filter by category
  let filtered = allTerms;
  if (state.currentCategory !== 'all') {
    filtered = allTerms.filter(t => t.category === state.currentCategory);
  }
  
  // Filter by search query (including synonyms/aliases)
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => 
      t.term.toLowerCase().includes(q) || 
      (t.synonyms && t.synonyms.toLowerCase().includes(q)) ||
      t.definition.toLowerCase().includes(q) ||
      t.explanation.toLowerCase().includes(q)
    );
  }
  
  // Filter by active A-Z letter
  if (state.activeLetter) {
    filtered = filtered.filter(t => {
      // Get the first alphabetical letter
      const firstLetter = t.term.replace(/[^a-zA-Z]/g, '')[0].toUpperCase();
      return firstLetter === state.activeLetter;
    });
  }

  // Clear Grid
  termsGrid.innerHTML = '';

  // Update Online Search Banner Visibility
  const banner = document.getElementById('online-search-banner');
  const bannerTxtBtn = document.getElementById('btn-wiki-banner-txt');
  if (banner && bannerTxtBtn) {
    if (state.searchQuery.trim()) {
      banner.style.display = 'flex';
      bannerTxtBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:currentColor; margin-right:4px; vertical-align:middle; display:inline-block;"><path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.125-5.137 4.125-3.328 0-6.033-2.705-6.033-6.033s2.705-6.033 6.033-6.033c1.492 0 2.859.544 3.916 1.442l2.368-2.368C18.17 2.735 15.22 1.76 12.25 1.76c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.76 0-.66-.06-1.29-.17-1.9H12.24z"/></svg>Search Google for "${escapeHtml(state.searchQuery)}"`;
    } else {
      banner.style.display = 'none';
    }
  }

  // Render Grid Elements
  if (filtered.length === 0) {
    // Check if query has potential online search capability
    if (state.searchQuery.trim()) {
      termsGrid.innerHTML = `
        <div class="online-search-card" style="text-align: center; max-width: 600px; margin: 0 auto; border-color: var(--accent-blue); box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.2);">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; justify-content: center; margin-bottom: 0.5rem;">
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #4285F4; vertical-align: middle;"><path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.125-5.137 4.125-3.328 0-6.033-2.705-6.033-6.033s2.705-6.033 6.033-6.033c1.492 0 2.859.544 3.916 1.442l2.368-2.368C18.17 2.735 15.22 1.76 12.25 1.76c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.76 0-.66-.06-1.29-.17-1.9H12.24z"/></svg>
            <div class="online-search-title" style="margin: 0;">Search Google for "${escapeHtml(state.searchQuery)}"?</div>
          </div>
          <div class="online-search-desc" style="margin-bottom: 1.25rem;">
            We can query Google's Knowledge Panel to fetch definitions and diagrams, and add them to your offline geospatial database.
          </div>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn-primary" id="btn-wiki-search" onclick="searchWikipedia()" style="margin: 0; display: inline-flex; align-items: center; gap: 0.5rem;">
              <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.125-5.137 4.125-3.328 0-6.033-2.705-6.033-6.033s2.705-6.033 6.033-6.033c1.492 0 2.859.544 3.916 1.442l2.368-2.368C18.17 2.735 15.22 1.76 12.25 1.76c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.76 0-.66-.06-1.29-.17-1.9H12.24z"/></svg>
              Search Google &amp; Add Term
            </button>
            <a href="https://www.google.com/search?q=${encodeURIComponent(state.searchQuery + ' geospatial')}" target="_blank" class="btn-secondary" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.75rem 1.25rem; border-radius: 8px; margin: 0; font-size: 0.9rem; font-weight: 600;">
              <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; vertical-align: middle;"><path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.125-5.137 4.125-3.328 0-6.033-2.705-6.033-6.033s2.705-6.033 6.033-6.033c1.492 0 2.859.544 3.916 1.442l2.368-2.368C18.17 2.735 15.22 1.76 12.25 1.76c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.76 0-.66-.06-1.29-.17-1.9H12.24z"/></svg>
              Open Google Search
            </a>
            <button class="btn-secondary" onclick="openAddModalWithTitle('${escapeHtml(state.searchQuery)}')" style="margin: 0; display: inline-flex; align-items: center; gap: 0.5rem;">
              <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Term Manually
            </button>
          </div>
        </div>
      `;
    } else {
      termsGrid.innerHTML = `
        <div class="empty-grid-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <p>No terms match your filters. Try adjusting your search query or category.</p>
        </div>
      `;
    }
    updateAlphabetNav(allTerms, filtered);
    return;
  }

  // Draw terms cards
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = `term-card ${state.selectedTermId === item.id ? 'active' : ''}`;
    card.setAttribute('data-id', item.id);
    card.onclick = () => showTermDetail(item.id);

    // Escape code definitions & titles
    const safeTitle = escapeHtml(item.term);
    const safeDef = escapeHtml(item.definition);
    let badgeText = item.isCustom ? 'Custom' : item.category;
    let badgeClass = item.isCustom ? 'custom' : '';

    if (item.isCustom) {
      if (item.createdBy === 'guest') {
        badgeText = 'Guest Contribution';
        badgeClass = 'guest-contrib';
      } else {
        badgeText = 'Admin Custom';
        badgeClass = 'admin-contrib';
      }
    }

    let actionsHtml = '';
    if (item.isCustom) {
      const deleteButton = state.isAdmin ? `
        <button class="card-action-btn delete-btn" onclick="deleteTerm('${item.id}')" title="Delete Term">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      ` : '';

      actionsHtml = `
        <div class="term-card-actions" onclick="event.stopPropagation()">
          <button class="card-action-btn edit-btn" onclick="openEditModal('${item.id}')" title="Edit Term">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          ${deleteButton}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="term-card-header">
        <div class="term-card-title">${highlightMatch(safeTitle, state.searchQuery)}</div>
        <span class="term-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="term-card-def">${highlightMatch(safeDef, state.searchQuery)}</div>
      <div class="term-card-footer">
        <span>Click to view details</span>
        ${actionsHtml}
      </div>
    `;
    termsGrid.appendChild(card);
  });

  updateAlphabetNav(allTerms, filtered);
}

// Generate/Update Alphabet Index Bar
function updateAlphabetNav(allTerms, filteredTerms) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const navContainer = document.getElementById('alphabet-nav');
  navContainer.innerHTML = '';

  // Find all letters that have at least one term in the full list
  const existingLetters = new Set();
  allTerms.forEach(t => {
    const cleanTerm = t.term.replace(/[^a-zA-Z]/g, '');
    if (cleanTerm.length > 0) {
      existingLetters.add(cleanTerm[0].toUpperCase());
    }
  });

  // Render letters
  letters.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = l;
    
    if (state.activeLetter === l) {
      btn.classList.add('active');
    }

    if (!existingLetters.has(l)) {
      btn.classList.add('disabled');
      btn.disabled = true;
    } else {
      btn.onclick = () => {
        if (state.activeLetter === l) {
          state.activeLetter = ''; // Toggle off
        } else {
          state.activeLetter = l;
        }
        renderTermsList();
      };
    }
    navContainer.appendChild(btn);
  });
}

// Render Term Details in Drawer Side Panel
function showTermDetail(termId) {
  const allTerms = getAllTerms();
  const item = allTerms.find(t => t.id === termId);
  const detailPanel = document.getElementById('detail-panel');
  
  if (!item) {
    closeDetailPanel();
    return;
  }

  // Update State
  state.selectedTermId = termId;

  // Stop current Speech Synthesis if active
  stopSpeech();

  // Add active classes to grids
  document.querySelectorAll('.term-card').forEach(c => {
    c.classList.remove('active');
    if (c.getAttribute('data-id') === termId) c.classList.add('active');
  });

  // Set Details Drawer layout content
  const titleEl = document.getElementById('detail-title');
  const badgeEl = document.getElementById('detail-category-badge');
  const defEl = document.getElementById('detail-definition');
  const explanationEl = document.getElementById('detail-explanation');
  const diagramContainer = document.getElementById('detail-diagram');
  const referencesList = document.getElementById('detail-references');
  const relatedList = document.getElementById('detail-related-terms');

  titleEl.textContent = item.term;
  
  let badgeText = item.isCustom ? 'Custom' : item.category;
  let badgeClass = item.isCustom ? 'custom' : '';

  if (item.isCustom) {
    if (item.createdBy === 'guest') {
      badgeText = 'Guest Contribution';
      badgeClass = 'guest-contrib';
    } else {
      badgeText = 'Admin Custom';
      badgeClass = 'admin-contrib';
    }
  }
  badgeEl.textContent = badgeText;
  badgeEl.className = `term-badge ${badgeClass}`;

  const authorEl = document.getElementById('detail-author');
  if (authorEl) {
    if (item.isCustom) {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A';
      authorEl.innerHTML = `Added by: <strong style="color: ${item.createdBy === 'guest' ? '#f59e0b' : 'var(--accent-cyan)'};">${item.createdBy === 'guest' ? 'Guest User' : 'Admin'}</strong> on ${dateStr}`;
      authorEl.style.display = 'block';
    } else {
      authorEl.style.display = 'none';
    }
  }

  const synonymsEl = document.getElementById('detail-synonyms');
  if (synonymsEl) {
    if (item.synonyms && item.synonyms.trim()) {
      synonymsEl.textContent = `Aliases: ${item.synonyms}`;
      synonymsEl.style.display = 'block';
    } else {
      synonymsEl.style.display = 'none';
    }
  }

  defEl.textContent = item.definition;
  explanationEl.textContent = item.explanation || 'No detailed theoretical explanation available for this term yet.';

  // Draw diagrams (SVG, custom image URL, or default placeholder)
  if (item.diagram && item.diagram.trim().startsWith('<svg')) {
    diagramContainer.innerHTML = item.diagram;
    diagramContainer.parentElement.style.display = 'flex';
  } else if (item.diagram) {
    // Custom Image URL / Base64 upload
    diagramContainer.innerHTML = `<img src="${item.diagram}" alt="${item.term} illustration" />`;
    diagramContainer.parentElement.style.display = 'flex';
  } else {
    // Fallback default vector drawing
    diagramContainer.innerHTML = `<svg viewBox="0 0 200 200" width="100%" height="100%">
      <rect width="200" height="200" rx="8" fill="none"/>
      <circle cx="100" cy="90" r="40" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" stroke-width="2"/>
      <path d="M 100 70 C 85 70 80 85 80 90 C 80 100 100 120 100 120 C 100 120 120 100 120 90 C 120 85 115 70 100 70 Z" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="100" cy="90" r="3" fill="#ffffff" />
      <text x="100" y="150" fill="#94a3b8" font-size="10" text-anchor="middle">No custom diagram uploaded</text>
    </svg>`;
    diagramContainer.parentElement.style.display = 'flex';
  }

  // Draw References List
  referencesList.innerHTML = '';
  if (item.references && item.references.length > 0) {
    item.references.forEach(ref => {
      const li = document.createElement('li');
      li.innerHTML = `
        <a href="${ref.url}" target="_blank" class="reference-link" rel="noopener">
          <svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          ${ref.label || ref.url}
        </a>
      `;
      referencesList.appendChild(li);
    });
    referencesList.parentElement.style.display = 'flex';
  } else {
    referencesList.parentElement.style.display = 'none';
  }

  // Draw Related Terms
  relatedList.innerHTML = '';
  if (item.related && item.related.length > 0) {
    item.related.forEach(relName => {
      // Find matches in combined terms
      const match = allTerms.find(t => t.term.toLowerCase() === relName.toLowerCase() || t.id === relName.toLowerCase());
      const tag = document.createElement('button');
      tag.className = 'related-tag';
      tag.textContent = relName;
      if (match) {
        tag.onclick = () => showTermDetail(match.id);
      } else {
        tag.onclick = () => {
          state.searchQuery = relName;
          document.getElementById('search-box').value = relName;
          renderTermsList();
        };
      }
      relatedList.appendChild(tag);
    });
    relatedList.parentElement.style.display = 'flex';
  } else {
    relatedList.parentElement.style.display = 'none';
  }

  // Slide Drawer In
  detailPanel.classList.remove('collapsed');
}

function closeDetailPanel() {
  state.selectedTermId = null;
  stopSpeech();
  document.getElementById('detail-panel').classList.add('collapsed');
  document.querySelectorAll('.term-card').forEach(c => c.classList.remove('active'));
}

// Text-To-Speech (Speech Synthesis) API
function toggleSpeech() {
  if (state.isSpeaking) {
    stopSpeech();
  } else {
    const title = document.getElementById('detail-title').textContent;
    const def = document.getElementById('detail-definition').textContent;
    
    if (!title || !def) return;
    
    const speechBtn = document.getElementById('btn-speech');
    state.isSpeaking = true;
    speechBtn.classList.add('active');
    
    state.speechUtterance = new SpeechSynthesisUtterance(`${title}. Definition: ${def}`);
    state.speechUtterance.onend = stopSpeech;
    state.speechUtterance.onerror = stopSpeech;
    
    window.speechSynthesis.speak(state.speechUtterance);
  }
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  state.isSpeaking = false;
  const speechBtn = document.getElementById('btn-speech');
  if (speechBtn) speechBtn.classList.remove('active');
  state.speechUtterance = null;
}

// HTML Utilities
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function highlightMatch(text, query) {
  if (!query || !query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark style="background: rgba(6, 182, 212, 0.3); color: inherit; padding: 0.1rem; border-radius: 2px;">$1</mark>');
}

// CRUD - Open Modal to Add a Term
function openAddModal() {
  const modal = document.getElementById('term-modal');
  document.getElementById('modal-title').textContent = 'Add New Term';
  document.getElementById('form-term-id').value = '';
  document.getElementById('term-form').reset();
  const synInput = document.getElementById('form-term-synonyms');
  if (synInput) synInput.value = '';
  modal.classList.add('active');
}

function openAddModalWithTitle(title, autoData) {
  const modal = document.getElementById('term-modal');
  document.getElementById('modal-title').textContent = 'Add New Term';
  document.getElementById('form-term-id').value = '';
  document.getElementById('term-form').reset();
  document.getElementById('form-term-title').value = title;
  const synInput = document.getElementById('form-term-synonyms');
  if (synInput) synInput.value = '';
  modal.classList.add('active');
  
  if (autoData) {
    autoFillFormWithData(title, autoData.definition, autoData.explanation, autoData.referencesUrl);
  } else {
    // Auto-fill from Google immediately when opened with a title!
    triggerModalAutoFill(title);
  }
}



// Directly populate the form inputs using cached or passed data (0ms delay)
function autoFillFormWithData(title, definition, explanation, referencesUrl) {
  const titleInput = document.getElementById('form-term-title');
  titleInput.value = title;
  
  const defText = definition || `Online definition for ${title}.`;
  document.getElementById('form-term-def').value = defText;
  document.getElementById('form-term-exp').value = explanation || '';
  
  // Infer category from explanation keywords
  let cat = 'gis';
  const extractLower = (explanation || '').toLowerCase();
  if (extractLower.includes('web') || extractLower.includes('server') || extractLower.includes('service') || extractLower.includes('javascript') || extractLower.includes('leaflet') || extractLower.includes('openlayers')) {
    cat = 'webgis';
  } else if (extractLower.includes('satellite') || extractLower.includes('sensor') || extractLower.includes('spectral') || extractLower.includes('reflectance') || extractLower.includes('band') || extractLower.includes('remote sensing')) {
    cat = 'remotesensing';
  } else if (extractLower.includes('photogrammetry') || extractLower.includes('camera') || extractLower.includes('altitude') || extractLower.includes('gsd') || extractLower.includes('flight')) {
    cat = 'photogrammetry';
  } else if (extractLower.includes('filter') || extractLower.includes('pixel') || extractLower.includes('convolution') || extractLower.includes('equalization') || extractLower.includes('contrast') || extractLower.includes('enhancement')) {
    cat = 'imageprocessing';
  }
  document.getElementById('form-term-category').value = cat;
  
  if (referencesUrl) {
    document.getElementById('form-term-ref').value = `Google Source | ${referencesUrl}`;
  }
  
  showToast(`Auto-filled details for "${title}"!`);
}

// Function to trigger Google Search and auto-fill the Add/Edit form inputs
async function triggerModalAutoFill(customTitle) {
  const titleInput = document.getElementById('form-term-title');
  const termTitle = customTitle || titleInput.value.trim();
  if (!termTitle) {
    showToast('Please type a Term Title first to auto-fill.', 'error');
    return;
  }
  
  const autofillBtn = document.getElementById('btn-modal-autofill');
  const originalText = autofillBtn.innerHTML;
  autofillBtn.innerHTML = 'Auto-filling...';
  autofillBtn.disabled = true;
  
  try {
    let cleanQuery = termTitle.trim();
    const queryLower = cleanQuery.toLowerCase();
    
    // Check local high-quality curated fallbacks first (0ms, 100% correct)
    if (LOCAL_FALLBACK_TERMS[queryLower]) {
      const fallback = LOCAL_FALLBACK_TERMS[queryLower];
      autoFillFormWithData(fallback.title, fallback.definition, fallback.explanation, fallback.referencesUrl);
      return;
    }
    if (SEARCH_ALIASES[queryLower]) {
      cleanQuery = SEARCH_ALIASES[queryLower];
    }
    const queryToSearch = cleanQuery.length <= 4 ? `${cleanQuery} geospatial technology` : cleanQuery;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(queryToSearch)}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    let results = searchData.query?.search;
    
    // Spelling correction retry
    if (searchData.query?.searchinfo?.suggestion) {
      const suggestion = searchData.query.searchinfo.suggestion;
      const retryUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(suggestion.length <= 4 ? `${suggestion} geospatial technology` : suggestion)}`;
      const retryResponse = await fetch(retryUrl);
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (retryData.query?.search && retryData.query.search.length > 0) {
          results = retryData.query.search;
        }
      }
    }
    
    if (!results || results.length === 0) {
      showToast(`Could not find online data for "${termTitle}"`, 'error');
      autofillBtn.innerHTML = originalText;
      autofillBtn.disabled = false;
      return;
    }
    
    // Whitelist check
    let summaryData = null;

    for (let i = 0; i < Math.min(results.length, 5); i++) {
      const title = results[i].title;
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryResponse = await fetch(summaryUrl);
      if (summaryResponse.ok) {
        const data = await summaryResponse.json();
        const titleLower = data.title.toLowerCase();
        const extractLower = (data.extract || '').toLowerCase();
        
        const matchesStrictKeyword = SPATIAL_KEYWORDS.some(kw => {
          const escapedKw = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedKw}\\b`, 'i');
          return regex.test(titleLower) || regex.test(extractLower);
        });
        
        if (matchesStrictKeyword) {
          summaryData = data;
          break;
        }
      }
    }
    
    if (!summaryData) {
      const firstTitle = results[0].title;
      const fallbackUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle)}`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (fallbackResponse.ok) {
        summaryData = await fallbackResponse.json();
      }
    }
    
    if (summaryData) {
      titleInput.value = summaryData.title;
      
      const defText = summaryData.description || `Online definition for ${summaryData.title}.`;
      document.getElementById('form-term-def').value = defText;
      document.getElementById('form-term-exp').value = summaryData.extract || '';
      
      // Infer category
      let cat = 'gis';
      const extractLower = (summaryData.extract || '').toLowerCase();
      if (extractLower.includes('web') || extractLower.includes('server') || extractLower.includes('service') || extractLower.includes('javascript') || extractLower.includes('leaflet') || extractLower.includes('openlayers')) {
        cat = 'webgis';
      } else if (extractLower.includes('satellite') || extractLower.includes('sensor') || extractLower.includes('spectral') || extractLower.includes('reflectance') || extractLower.includes('band') || extractLower.includes('remote sensing')) {
        cat = 'remotesensing';
      } else if (extractLower.includes('photogrammetry') || extractLower.includes('camera') || extractLower.includes('altitude') || extractLower.includes('gsd') || extractLower.includes('flight')) {
        cat = 'photogrammetry';
      } else if (extractLower.includes('filter') || extractLower.includes('pixel') || extractLower.includes('convolution') || extractLower.includes('equalization') || extractLower.includes('contrast') || extractLower.includes('enhancement')) {
        cat = 'imageprocessing';
      }
      document.getElementById('form-term-category').value = cat;
      
      if (summaryData.content_urls?.desktop?.page) {
        document.getElementById('form-term-ref').value = `Google Source | ${summaryData.content_urls.desktop.page}`;
      }
      
      showToast(`Auto-filled details for "${summaryData.title}"!`);
    } else {
      showToast('Could not find suitable online definitions.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Auto-fill search failed.', 'error');
  } finally {
    autofillBtn.innerHTML = originalText;
    autofillBtn.disabled = false;
  }
}

// CRUD - Open Modal to Edit a Term
async function openEditModal(termId) {
  const custom = await getCustomTerms();
  let item = custom.find(t => t.id === termId);
  if (!item) {
    item = PRESEEDED_TERMS.find(t => t.id === termId);
  }
  if (!item) return;

  const modal = document.getElementById('term-modal');
  document.getElementById('modal-title').textContent = 'Edit Custom Term';
  document.getElementById('form-term-id').value = item.id;
  document.getElementById('form-term-title').value = item.term;
  document.getElementById('form-term-category').value = item.category;
  const synInput = document.getElementById('form-term-synonyms');
  if (synInput) synInput.value = item.synonyms || '';
  document.getElementById('form-term-def').value = item.definition;
  document.getElementById('form-term-exp').value = item.explanation;
  
  // Format references back to text lines
  const refText = item.references ? item.references.map(r => `${r.label || ''}|${r.url}`).join('\n') : '';
  document.getElementById('form-term-ref').value = refText;
  document.getElementById('form-term-rel').value = item.related ? item.related.join(', ') : '';

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('term-modal').classList.remove('active');
  renderTermsList();
}

// CRUD - Handle Form Submit (Add or Edit)
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const idInput = document.getElementById('form-term-id').value;
  const termTitle = document.getElementById('form-term-title').value.trim();
  const termCat = document.getElementById('form-term-category').value;
  const termSynonyms = document.getElementById('form-term-synonyms')?.value.trim() || '';
  const termDef = document.getElementById('form-term-def').value.trim();
  const termExp = document.getElementById('form-term-exp').value.trim();
  const termRefRaw = document.getElementById('form-term-ref').value.trim();
  const termRelRaw = document.getElementById('form-term-rel').value.trim();
  const imgFileInput = document.getElementById('form-term-image');

  if (!termTitle || !termDef) {
    showToast('Please fill in required fields (Title & Definition)', 'error');
    return;
  }

  // Parse References (label|url per line)
  const references = [];
  if (termRefRaw) {
    termRefRaw.split('\n').forEach(line => {
      if (line.includes('|')) {
        const parts = line.split('|');
        references.push({ label: parts[0].trim(), url: parts[1].trim() });
      } else if (line.trim().startsWith('http')) {
        references.push({ label: '', url: line.trim() });
      }
    });
  }

  // Parse Related Terms (comma separated)
  const related = termRelRaw ? termRelRaw.split(',').map(s => s.trim()).filter(s => s) : [];

  const custom = await getCustomTerms();
  
  const executeSave = async (diagramDataUrl = null) => {
    if (idInput) {
      // Edit mode
      const idx = custom.findIndex(t => t.id === idInput);
      if (idx !== -1) {
        // Keep existing diagram if no new image was uploaded
        const oldDiagram = custom[idx].diagram;
        const oldCreatedBy = custom[idx].createdBy || 'admin';
        const oldCreatedAt = custom[idx].createdAt || new Date().toISOString();
        custom[idx] = {
          id: idInput,
          term: termTitle,
          category: termCat,
          synonyms: termSynonyms,
          definition: termDef,
          explanation: termExp,
          references,
          related,
          diagram: diagramDataUrl || oldDiagram,
          createdBy: oldCreatedBy,
          createdAt: oldCreatedAt,
          modifiedBy: state.isAdmin ? 'admin' : 'guest',
          modifiedAt: new Date().toISOString()
        };
        showToast('Term updated successfully!');
      }
    } else {
      // Add mode - Check for duplicates first to prevent double-adding!
      const existsIdx = custom.findIndex(t => t.term.toLowerCase() === termTitle.toLowerCase());
      const termId = existsIdx !== -1 
        ? custom[existsIdx].id 
        : termTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
        
      const termData = {
        id: termId,
        term: termTitle,
        category: termCat,
        synonyms: termSynonyms,
        definition: termDef,
        explanation: termExp,
        references,
        related,
        diagram: diagramDataUrl || (existsIdx !== -1 ? custom[existsIdx].diagram : null),
        createdBy: state.isAdmin ? 'admin' : 'guest',
        createdAt: new Date().toISOString()
      };
      
      if (existsIdx !== -1) {
        custom[existsIdx] = termData;
        showToast('Term updated in local dictionary!');
      } else {
        custom.push(termData);
        showToast('Term added to local dictionary!');
      }
    }

    state.customTerms = custom;
    await saveCustomTerms(custom);
    closeModal();
    renderTermsList();
    
    // Select the new/edited term details
    if (idInput) {
      showTermDetail(idInput);
    } else {
      const newAdded = custom[custom.length - 1];
      showTermDetail(newAdded.id);
    }
  };

  // Handle optional image file upload via FileReader API
  if (imgFileInput.files && imgFileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      await executeSave(e.target.result); // Save image as base64 URI
    };
    reader.readAsDataURL(imgFileInput.files[0]);
  } else {
    await executeSave(); // No new image upload
  }
}

// CRUD - Delete Term
async function deleteTerm(termId) {
  if (!state.isAdmin) {
    showToast('Unauthorized: Only the administrator can delete terms.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to delete this custom term?')) return;
  
  let custom = await getCustomTerms();
  custom = custom.filter(t => t.id !== termId);
  state.customTerms = custom;
  await saveCustomTerms(custom);
  
  showToast('Term deleted.');
  if (state.selectedTermId === termId) {
    closeDetailPanel();
  }
  renderTermsList();
}

// CRUD - Backup / Sync: Export Local Dictionary as JSON File
async function exportData() {
  const custom = await getCustomTerms();
  if (custom.length === 0) {
    showToast('No custom terms to export!', 'error');
    return;
  }
  
  const blob = new Blob([JSON.stringify(custom, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `webgis_dictionary_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Dictionary exported successfully!');
}

// CRUD - Backup / Sync: Import JSON file back
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Root must be an array of terms.');

      // Basic validation checks
      const valid = imported.filter(t => t.term && t.definition);
      
      const custom = await getCustomTerms();
      // Simple merge, checking for duplicates by term name
      valid.forEach(item => {
        if (!item.id) item.id = item.term.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
        const existsIdx = custom.findIndex(t => t.term.toLowerCase() === item.term.toLowerCase());
        if (existsIdx !== -1) {
          custom[existsIdx] = item; // Overwrite
        } else {
          custom.push(item); // Insert new
        }
      });

      state.customTerms = custom;
      await saveCustomTerms(custom);
      showToast(`Successfully imported ${valid.length} terms!`);
      renderTermsList();
    } catch (err) {
      showToast('Invalid backup file structure: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}

// Online Lookup - Query Wikipedia API
async function searchWikipedia(query) {
  const searchQuery = query || state.searchQuery;
  if (!searchQuery || !searchQuery.trim()) return;

  if (!navigator.onLine) {
    showToast('Offline! Please connect to internet to lookup terms.', 'error');
    return;
  }

  const termsGrid = document.getElementById('terms-grid');
  termsGrid.innerHTML = `
    <div class="empty-grid-state">
      <div class="skeleton-card" style="width: 100%; max-width: 500px; margin: 0 auto;">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-badge"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text"></div>
      </div>
      <p>Searching Wikipedia Online...</p>
    </div>
  `;



  // Levenshtein distance helper for fuzzy matching spelling typos
  function getEditDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1  // deletion
            )
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  try {
    const originalQuery = searchQuery.trim();
    const queryLower = originalQuery.toLowerCase();
    
    // Check local high-quality curated fallbacks first (0ms, 100% correct)
    if (LOCAL_FALLBACK_TERMS[queryLower]) {
      const fallback = LOCAL_FALLBACK_TERMS[queryLower];
      openAddModalWithTitle(fallback.title, {
        definition: fallback.definition,
        explanation: fallback.explanation,
        referencesUrl: fallback.referencesUrl
      });
      return;
    }

    // 1. Search online for matching article titles (scope short acronyms to prevent dilution, match long terms exactly)
    let cleanQuery = searchQuery.trim();
    const queryLowerForSearch = cleanQuery.toLowerCase();
    if (SEARCH_ALIASES[queryLower]) {
      cleanQuery = SEARCH_ALIASES[queryLower];
    }
    const queryToSearch = cleanQuery.length <= 4 ? `${cleanQuery} geospatial technology` : cleanQuery;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(queryToSearch)}`;
    const searchResponse = await fetch(searchUrl);
    
    // Safety check: has the user typed something else in the meantime?
    if (state.searchQuery.trim() !== originalQuery) return;
    
    const searchData = await searchResponse.json();
    let results = searchData.query?.search;
    
    // Auto-correction check: if Wikipedia search suggests a corrected spelling (e.g. for typos), run a quick query on it!
    if (searchData.query?.searchinfo?.suggestion) {
      const suggestion = searchData.query.searchinfo.suggestion;
      const retryUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(suggestion.length <= 4 ? `${suggestion} geospatial technology` : suggestion)}`;
      const retryResponse = await fetch(retryUrl);
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (retryData.query?.search && retryData.query.search.length > 0) {
          results = retryData.query.search;
        }
      }
    }
    
    if (!results || results.length === 0) {
      showToast(`No online articles found on Wikipedia for "${searchQuery}"`, 'error');
      renderTermsList();
      return;
    }
    
    // Helper function to evaluate results and find the best geospatial concept match
    async function evaluateSearchResults(searchResultList) {
      const queryWords = cleanQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const scoredResults = searchResultList.map(res => {
        const titleLower = res.title.toLowerCase();
        const cleanQueryLower = cleanQuery.toLowerCase();
        let score = 0;
        
        if (titleLower === cleanQueryLower) {
          score = 100;
        } else if (titleLower.includes(cleanQueryLower)) {
          score = 80;
        } else if (cleanQueryLower.includes(titleLower)) {
          score = 70;
        } else {
          const titleWords = titleLower.split(/\s+/);
          let overlapCount = 0;
          queryWords.forEach(qw => {
            if (titleWords.some(tw => tw.includes(qw) || qw.includes(tw) || getEditDistance(tw, qw) <= 2)) {
              overlapCount++;
            }
          });
          score = overlapCount * 20;
        }
        return { ...res, score };
      });
      
      // Sort scored results descending
      scoredResults.sort((a, b) => b.score - a.score);

      // Fetch top 5 summaries in parallel for maximum performance (no sequential blocking!)
      const topCandidates = scoredResults.slice(0, 5);
      const promises = topCandidates.map(async (res) => {
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(res.title)}`;
        try {
          const resResponse = await fetch(summaryUrl);
          if (resResponse.ok) return await resResponse.json();
        } catch (e) {
          console.warn('Failed to fetch summary for:', res.title, e);
        }
        return null;
      });

      const summaries = await Promise.all(promises);

      // Evaluate the fetched summaries in memory
      for (const data of summaries) {
        if (!data) continue;
        if (state.searchQuery.trim() !== originalQuery) return null;

        const titleLower = data.title.toLowerCase();
        const extractLower = (data.extract || '').toLowerCase();
        
        const matchesStrictKeyword = SPATIAL_KEYWORDS.some(kw => {
          const escapedKw = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedKw}\\b`, 'i');
          return regex.test(titleLower) || regex.test(extractLower);
        });
        
        const isIndex = /\bindex\b/i.test(titleLower) || /\bindices\b/i.test(titleLower) || 
                        /\bindex\b/i.test(extractLower) || /\bindices\b/i.test(extractLower);
                        
        const hasSpectralTerms = [
          'reflectance', 'spectral', 'infrared', 'landsat', 'sentinel', 'modis', 
          'swir', 'nir', 'wavelength', 'vegetation index', 'water index', 'snow index'
        ].some(term => {
          const escapedTerm = term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
          return regex.test(titleLower) || regex.test(extractLower);
        });
        
        const hasRemoteSensingContext = [
          'satellite', 'sensor', 'imagery', 'reflectance', 'spectral', 'remote sensing'
        ].some(term => {
          const regex = new RegExp(`\\b${term}\\b`, 'i');
          return regex.test(titleLower) || regex.test(extractLower);
        });
        
        const matchesSpectralIndex = isIndex && hasSpectralTerms && hasRemoteSensingContext;
        
        if (matchesStrictKeyword || matchesSpectralIndex) {
          return data; // Found geospatial match!
        }
      }
      return null;
    }

    // Pass 1: Run evaluation on exact results
    let summaryData = await evaluateSearchResults(results);
    
    // Pass 2: Retry with 'geospatial' suffix if Pass 1 yielded no geospatial matches
    if (!summaryData && cleanQuery.length > 4) {
      console.log(`Pass 1 exact matching failed for "${cleanQuery}". Retrying with geospatial filter...`);
      const retryUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(cleanQuery + ' geospatial')}`;
      const retryResponse = await fetch(retryUrl);
      if (retryResponse.ok) {
        if (state.searchQuery.trim() === originalQuery) {
          const retryData = await retryResponse.json();
          const retryResults = retryData.query?.search || [];
          if (retryResults.length > 0) {
            summaryData = await evaluateSearchResults(retryResults);
          }
        }
      }
    }

    // 3. Reject if still no geospatial match is found
    if (!summaryData) {
      // Calculate scoredResults for fallback display title
      const queryWords = cleanQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const scoredResultsForFallback = results.map(res => {
        const titleLower = res.title.toLowerCase();
        const cleanQueryLower = cleanQuery.toLowerCase();
        let score = 0;
        if (titleLower === cleanQueryLower) {
          score = 100;
        } else if (titleLower.includes(cleanQueryLower)) {
          score = 80;
        } else {
          const titleWords = titleLower.split(/\s+/);
          let overlapCount = 0;
          queryWords.forEach(qw => {
            if (titleWords.some(tw => tw.includes(qw) || qw.includes(tw) || getEditDistance(tw, qw) <= 2)) {
              overlapCount++;
            }
          });
          score = overlapCount * 20;
        }
        return { ...res, score };
      });
      scoredResultsForFallback.sort((a, b) => b.score - a.score);

      const firstTitle = scoredResultsForFallback[0]?.title || searchQuery;
      const fallbackUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle)}`;
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = fallbackResponse.ok ? await fallbackResponse.json() : null;
      const displayTitle = fallbackData ? fallbackData.title : searchQuery;

      showToast(`Unrelated Term: "${searchQuery}" is not within the GIS/WebGIS domain.`, 'error');
      termsGrid.innerHTML = `
        <div class="empty-grid-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke: #ef4444; width:48px; height:48px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <p style="color: #ef4444; font-weight: 600; font-family: var(--font-title); font-size:1.25rem;">Lookup Restricted</p>
          <p style="max-width: 400px; margin: 0.5rem auto; font-size: 0.9rem; line-height:1.5;">
            The search for "${searchQuery}" matched with "${displayTitle}", which does not appear related to geospatial technology. 
            Online auto-lookup is restricted to GIS, WebGIS, and mapping.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap;">
            <a href="https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' geospatial')}" target="_blank" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; background: var(--accent-cyan); color: #070a13; border: none; cursor: pointer;">
              <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:currentColor;"><path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.125-5.137 4.125-3.328 0-6.033-2.705-6.033-6.033s2.705-6.033 6.033-6.033c1.492 0 2.859.544 3.916 1.442l2.368-2.368C18.17 2.735 15.22 1.76c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.76 0-.66-.06-1.29-.17-1.9H12.24z"/></svg>
              Open Google Search
            </a>
            <button class="btn-secondary" onclick="openAddModalWithTitle('${escapeHtml(searchQuery)}')" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; background: rgba(59,130,246,0.15); border: 1px solid var(--accent-blue); color: var(--accent-blue); cursor: pointer;">
              <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Add Term Manually
            </button>
            <button class="btn-secondary" onclick="renderTermsList()" style="padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: var(--text-primary); cursor: pointer;">Back to Grid</button>
          </div>
        </div>
      `;
      return;
    }

    // Automatically open the Add New Term modal and pre-fill all inputs using already fetched data (0ms delay)!
    openAddModalWithTitle(summaryData.title, {
      definition: summaryData.description,
      explanation: summaryData.extract,
      referencesUrl: summaryData.content_urls?.desktop?.page
    });
  } catch (err) {
    console.error('Wikipedia Fetch Error:', err);
    showToast('Failed to fetch online results.', 'error');
    await renderTermsList();
  }
}



// Automatically save Google Term and display details with a confirmation toast!
async function importWikiTerm() {
  const result = state.activeWikiResult;
  if (!result) {
    showToast('No active search result to import.', 'error');
    return;
  }

  const custom = await getCustomTerms();
  const termTitle = result.title;
  const newId = termTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
  
  // Format definition (short version)
  const def = result.extract ? (result.extract.substring(0, 150) + (result.extract.length > 150 ? '...' : '')) : 'Google Search imported definition.';
  
  // Check duplicates
  const existsIdx = custom.findIndex(t => t.term.toLowerCase() === termTitle.toLowerCase());
  
  // Smart category inference based on current active tab or description keywords
  let cat = 'gis';
  if (state.currentCategory !== 'all') {
    cat = state.currentCategory;
  } else {
    const extractLower = (result.extract || '').toLowerCase();
    if (extractLower.includes('web') || extractLower.includes('server') || extractLower.includes('service') || extractLower.includes('javascript') || extractLower.includes('leaflet') || extractLower.includes('openlayers')) {
      cat = 'webgis';
    } else if (extractLower.includes('gnss') || extractLower.includes('gps') || extractLower.includes('rtk') || extractLower.includes('galileo') || extractLower.includes('glonass') || extractLower.includes('satellite navigation')) {
      cat = 'gnss';
    } else if (extractLower.includes('satellite') || extractLower.includes('sensor') || extractLower.includes('spectral') || extractLower.includes('reflectance') || extractLower.includes('band') || extractLower.includes('remote sensing')) {
      cat = 'remotesensing';
    } else if (extractLower.includes('photogrammetry') || extractLower.includes('camera') || extractLower.includes('altitude') || extractLower.includes('gsd') || extractLower.includes('flight')) {
      cat = 'photogrammetry';
    } else if (extractLower.includes('filter') || extractLower.includes('pixel') || extractLower.includes('convolution') || extractLower.includes('equalization') || extractLower.includes('contrast') || extractLower.includes('enhancement')) {
      cat = 'imageprocessing';
    }
  }

  const originalSearch = state.searchQuery.trim();
  let termSynonyms = '';
  if (originalSearch && originalSearch.toLowerCase() !== termTitle.toLowerCase()) {
    termSynonyms = originalSearch;
  }

  const termData = {
    id: existsIdx !== -1 ? custom[existsIdx].id : newId,
    term: termTitle,
    category: cat,
    synonyms: termSynonyms,
    definition: def,
    explanation: result.extract || '',
    references: result.url ? [{ label: 'Google Reference Link', url: result.url }] : [],
    related: [],
    diagram: result.thumbnail 
      ? `<img src="${result.thumbnail}" alt="${termTitle}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"/>`
      : null,
    createdBy: state.isAdmin ? 'admin' : 'guest',
    createdAt: new Date().toISOString()
  };

  if (existsIdx !== -1) {
    custom[existsIdx] = termData;
  } else {
    custom.push(termData);
  }

  await saveCustomTerms(custom);
  
  // Reset search box so the list contains the new term
  state.searchQuery = '';
  document.getElementById('search-box').value = '';
  
  await renderTermsList();
  
  // Show detail and show confirmation toast!
  showTermDetail(termData.id);
  showToast(`Imported "${termTitle}" from Google Search!`, 'success');
}

// Category Tabs Handlers
function filterCategory(category, element) {
  state.currentCategory = category;
  
  // Update UI active styling
  document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
  element.classList.add('active');

  renderTermsList();
}

// Search Inputs Handlers
let searchDebounceTimeout = null;

function handleSearch(val) {
  state.searchQuery = val;
  // If search is changed, let's reset A-Z letter filter to allow finding the query anywhere
  state.activeLetter = '';
  renderTermsList();

  const sugContainer = document.getElementById('search-suggestions');
  if (!sugContainer) return;

  const queryClean = val.trim().toLowerCase();
  if (!queryClean) {
    sugContainer.style.display = 'none';
    return;
  }

  // Find matches in existing terms database (term title or synonyms)
  const allTerms = getAllTerms();
  const matches = allTerms.filter(t => 
    t.term.toLowerCase().includes(queryClean) || 
    (t.synonyms && t.synonyms.toLowerCase().includes(queryClean))
  );

  if (matches.length > 0) {
    sugContainer.innerHTML = '';
    
    // Limit to top 6 suggestions to keep the dropdown clean
    matches.slice(0, 6).forEach(item => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      
      // Match query highlighting or show alias matching
      let aliasTxt = '';
      if (item.synonyms && item.synonyms.toLowerCase().includes(queryClean)) {
        aliasTxt = ` <span class="suggestion-aliases">(${item.synonyms})</span>`;
      }

      div.innerHTML = `
        <div>
          <span class="suggestion-term">${escapeHtml(item.term)}</span>
          ${aliasTxt}
        </div>
        <span class="suggestion-category">${escapeHtml(item.category)}</span>
      `;

      div.onclick = () => {
        document.getElementById('search-box').value = item.term;
        state.searchQuery = item.term;
        sugContainer.style.display = 'none';
        renderTermsList();
        showTermDetail(item.id);
      };

      sugContainer.appendChild(div);
    });
    sugContainer.style.display = 'block';
  } else {
    sugContainer.style.display = 'none';
  }
}

// Initialize Application once DOM Content is Loaded
window.addEventListener('DOMContentLoaded', async () => {
  // Inject PWA manifest dynamically only when running on a web server (prevents local file CORS errors)
  if (window.location.protocol !== 'file:') {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = './manifest.json';
    document.head.appendChild(link);
  }

  // Show clean skeleton loader while fetching custom terms on startup if Firebase URL is set
  const termsGrid = document.getElementById('terms-grid');
  if (FIREBASE_DB_URL && termsGrid) {
    termsGrid.innerHTML = `
      <div class="empty-grid-state" style="grid-column: 1 / -1; text-align: center;">
        <div class="skeleton-card" style="width: 100%; max-width: 500px; margin: 0 auto;">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-badge"></div>
          <div class="skeleton-line skeleton-text"></div>
        </div>
        <p style="margin-top: 1rem; color: var(--text-muted);">Syncing global dictionary from Firebase Cloud...</p>
      </div>
    `;
  }

  // Fetch custom terms into memory cache
  const custom = await getCustomTerms();
  state.customTerms = custom;

  // Self-cleaning routine: Deduplicate any existing custom terms in localStorage on startup
  const seen = new Set();
  const unique = [];
  custom.forEach(item => {
    const termLower = item.term.toLowerCase().trim();
    if (!seen.has(termLower)) {
      seen.add(termLower);
      unique.push(item);
    }
  });
  if (unique.length !== custom.length) {
    console.log(`Deduplicated local storage on startup: removed ${custom.length - unique.length} duplicates.`);
    state.customTerms = unique;
    await saveCustomTerms(unique);
  }

  // Populate terms list
  renderTermsList();

  // Dark/Light Theme Manager
  const currentTheme = localStorage.getItem('gis_dict_theme') || 'dark';
  document.body.setAttribute('data-theme', currentTheme);
  
  // Set up Event Listeners
  const searchBox = document.getElementById('search-box');
  const sugContainer = document.getElementById('search-suggestions');
  let activeIndex = -1;

  searchBox.addEventListener('input', (e) => {
    handleSearch(e.target.value);
    activeIndex = -1; // Reset keyboard active selection index on typing
  });

  // Autocomplete keyboard navigation
  searchBox.addEventListener('keydown', (e) => {
    if (!sugContainer || sugContainer.style.display === 'none') return;
    
    const items = sugContainer.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      items.forEach((item, idx) => {
        item.classList.toggle('active', idx === activeIndex);
        if (idx === activeIndex) {
          item.scrollIntoView({ block: 'nearest' });
        }
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items.forEach((item, idx) => {
        item.classList.toggle('active', idx === activeIndex);
        if (idx === activeIndex) {
          item.scrollIntoView({ block: 'nearest' });
        }
      });
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        items[activeIndex].click();
        activeIndex = -1;
      }
    }
  });

  // Hide suggestions when clicking outside
  const modalSug = document.getElementById('modal-term-suggestions');

  window.addEventListener('click', (e) => {
    if (sugContainer && e.target !== searchBox && !sugContainer.contains(e.target)) {
      sugContainer.style.display = 'none';
      activeIndex = -1;
    }
    const mTitleInput = document.getElementById('form-term-title');
    if (modalSug && e.target !== mTitleInput && !modalSug.contains(e.target)) {
      modalSug.style.display = 'none';
    }
  });

  // Automatically trigger Google auto-fill and show local autocomplete recommendations inside the modal form!
  let titleDebounceTimeout = null;
  document.getElementById('form-term-title').addEventListener('input', (e) => {
    clearTimeout(titleDebounceTimeout);
    const val = e.target.value.trim();
    const idVal = document.getElementById('form-term-id').value;

    // Autocomplete inside modal to prevent duplicates!
    if (modalSug) {
      const queryClean = val.toLowerCase().trim();
      if (!queryClean || idVal) {
        modalSug.style.display = 'none';
      } else {
        const allTerms = getAllTerms();
        const matches = allTerms.filter(t => 
          t.term.toLowerCase().includes(queryClean) || 
          (t.synonyms && t.synonyms.toLowerCase().includes(queryClean))
        );

        if (matches.length > 0) {
          modalSug.innerHTML = '';
          matches.slice(0, 5).forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
              <div>
                <span class="suggestion-term" style="color: var(--accent-cyan);">[Already Exists]</span>
                <span class="suggestion-term">${escapeHtml(item.term)}</span>
              </div>
              <span class="suggestion-category" style="background: rgba(6, 182, 212, 0.1); color: var(--accent-cyan); border-radius: 4px; padding: 0.15rem 0.5rem; font-size: 0.7rem; font-weight: bold;">Edit Term</span>
            `;
            div.onclick = () => {
              clearTimeout(titleDebounceTimeout);
              modalSug.style.display = 'none';
              openEditModal(item.id);
              showToast(`Switched to editing existing term "${item.term}"`, 'info');
            };
            modalSug.appendChild(div);
          });
          modalSug.style.display = 'block';
        } else {
          modalSug.style.display = 'none';
        }
      }
    }
    
    // Stop trigger if form is already populated to allow editing without getting overwritten
    const defVal = document.getElementById('form-term-def').value.trim();
    if (defVal) return;

    if (val && val.length > 2 && !idVal) {
      titleDebounceTimeout = setTimeout(() => {
        const allTerms = getAllTerms();
        const exists = allTerms.some(t => t.term.toLowerCase() === val.toLowerCase());
        if (!exists && document.getElementById('form-term-title').value.trim() === val) {
          triggerModalAutoFill(val);
        }
      }, 1000);
    }
  });

  // Also trigger auto-fill on blur/tab-out for instant completion (if it is not a duplicate)
  document.getElementById('form-term-title').addEventListener('blur', (e) => {
    const val = e.target.value.trim();
    const idVal = document.getElementById('form-term-id').value;
    
    // Stop trigger if form is already populated to allow editing without getting overwritten
    const defVal = document.getElementById('form-term-def').value.trim();
    if (defVal) return;

    if (val && !idVal) {
      const allTerms = getAllTerms();
      const exists = allTerms.some(t => t.term.toLowerCase() === val.toLowerCase());
      if (!exists) {
        clearTimeout(titleDebounceTimeout);
        triggerModalAutoFill(val);
      }
    }
  });

  document.getElementById('term-form').addEventListener('submit', handleFormSubmit);

  // Show Moderation panel button if administrator
  if (state.isAdmin) {
    const adminBtn = document.getElementById('btn-admin-panel');
    if (adminBtn) adminBtn.style.display = 'inline-flex';
  }

  // Close modals clicking outside container
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (overlay.id === 'admin-modal') {
          closeAdminPanel();
        } else {
          closeModal();
        }
      }
    });
  });

  // Hotkey Esc closes drawer or modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDetailPanel();
      closeAdminPanel();
    }
  });
});

// Toggle Dark/Light Theme
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  body.setAttribute('data-theme', newTheme);
  localStorage.setItem('gis_dict_theme', newTheme);
  showToast(`Switched to ${newTheme} mode.`);
}

// Admin Moderation Panel actions
function openAdminPanel() {
  const modal = document.getElementById('admin-modal');
  if (modal) {
    modal.classList.add('active');
    renderAdminPanel();
  }
}

function closeAdminPanel() {
  const modal = document.getElementById('admin-modal');
  if (modal) modal.classList.remove('active');
}

async function renderAdminPanel() {
  const custom = await getCustomTerms();
  
  const listToday = document.getElementById('admin-list-today');
  const listWeek = document.getElementById('admin-list-week');
  const listEarlier = document.getElementById('admin-list-earlier');

  if (!listToday || !listWeek || !listEarlier) return;

  listToday.innerHTML = '';
  listWeek.innerHTML = '';
  listEarlier.innerHTML = '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter only custom terms that have creator metadata
  const customSorted = [...custom].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA; // Descending (newest first)
  });

  let counts = { today: 0, week: 0, earlier: 0 };

  customSorted.forEach(item => {
    const createdDate = item.createdAt ? new Date(item.createdAt) : new Date(0);
    const dateStr = createdDate.toLocaleString();

    const row = document.createElement('div');
    row.className = 'admin-term-row';
    row.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; padding: 0.75rem; border: 1px solid var(--panel-border); border-radius: 8px; margin-bottom: 0.5rem; background: rgba(255,255,255,0.02);';
    row.innerHTML = `
      <div style="flex: 1; margin-right: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
          <strong style="color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(item.term)}</strong>
          <span class="term-badge ${item.createdBy === 'guest' ? 'guest-contrib' : 'admin-contrib'}" style="font-size: 0.6rem; padding: 0.1rem 0.35rem;">${item.createdBy === 'guest' ? 'Guest' : 'Admin'}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">${escapeHtml(item.definition)}</div>
        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">Added on: ${dateStr}</div>
      </div>
      <div style="display: flex; gap: 0.4rem;">
        <button class="btn-secondary" onclick="adminPreviewTerm('${item.id}')" style="font-size: 0.7rem; padding: 0.25rem 0.5rem; min-width: auto; height: auto;">View</button>
        <button class="btn-primary" onclick="adminDeleteTerm('${item.id}')" style="font-size: 0.7rem; padding: 0.25rem 0.5rem; background: #ef4444; border-color: #ef4444; min-width: auto; height: auto;">Delete</button>
      </div>
    `;

    if (createdDate >= startOfToday) {
      listToday.appendChild(row);
      counts.today++;
    } else if (createdDate >= oneWeekAgo) {
      listWeek.appendChild(row);
      counts.week++;
    } else {
      listEarlier.appendChild(row);
      counts.earlier++;
    }
  });

  if (counts.today === 0) {
    listToday.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.5rem;">No new terms added today.</div>';
  }
  if (counts.week === 0) {
    listWeek.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.5rem;">No new terms added this week.</div>';
  }
  if (counts.earlier === 0) {
    listEarlier.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.5rem;">No older custom terms.</div>';
  }
}

function adminPreviewTerm(termId) {
  closeAdminPanel();
  showTermDetail(termId);
}

async function adminDeleteTerm(termId) {
  if (confirm('Are you sure you want to delete this custom term?')) {
    let custom = await getCustomTerms();
    custom = custom.filter(t => t.id !== termId);
    state.customTerms = custom;
    await saveCustomTerms(custom);
    showToast('Term deleted successfully.');
    renderAdminPanel();
    renderTermsList();
  }
}
