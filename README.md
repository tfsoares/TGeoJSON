# TGeoJSON

TGeoJSON stands for Templated GeoJSON. It consists of a specific application of the [TJSON](http://github.com/tfsoares/TJSON) algorithm and Google's [Encoded Polyline](http://developers.google.com/maps/documentation/utilities/polylinealgorithm) Algorithm to compress coordinates.

There's a small change to the Encoded Polyline algorithm to allow the encoding of all the Geometry Types suported by GeoJSON:
 - Point
 - Line
 - Polygon
 - MultiPoint
 - MultiLine
 - MultiPolygon

The reason that led to the creation of this algorithm was that I wanted to load into a page a 4MB GeoJSON file. This was a constraint to the page loading, halting the browser until the file was downloaded. As I grew into knowing the GeoJSON structure, I came up with this idea. In the end, the file was compressed to just above 1MB. The data is the same, just rearranged to minimize the size. Here's the [link](http://www.gisforcloud.com/bikedata/draft1). The page is in Portuguese, however you can still look at the network monitor and look for the file with the '*.tgeojson' extension.


## Restrictions
 - Features properties schema: it has to be equal across other features.
 - There's only one Coordinate System allowed: WGS84.

## Todo's
 - Add example data
 - Turn script into NPM module
 - Make it into CLI utility
 - Write Tests