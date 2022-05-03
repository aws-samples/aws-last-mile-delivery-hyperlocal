/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

package dev.aws.proto.apps.distancecache.util.commands;

import com.mapbox.geojson.GeometryCollection;
import com.mapbox.geojson.Point;
import com.mapbox.geojson.Polygon;
import com.uber.h3core.util.GeoCoord;
import dev.aws.proto.core.routing.H3;
import dev.aws.proto.core.routing.cache.H3DistanceCache;
import dev.aws.proto.core.routing.cache.persistence.FilePersistence;
import dev.aws.proto.core.routing.route.GraphhopperLoader;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;

@CommandLine.Command(name = "export", description = "Generate H3DistanceCache and export")
public class ExportCache implements Callable<Integer> {
    private static final Logger logger = LoggerFactory.getLogger(ExportCache.class);

    @CommandLine.Parameters(index = "0", description = "The GeoJSON file input")
    private File geoJsonFile;

    @CommandLine.Option(names = {"-p", "--persistence"}, description = "file, s3 [later: redis, neptune]")
    private String persistenceType = "file";

    @CommandLine.Option(names = "--routing-profile", description = "car, motorcycle")
    private String routingProfile = "motorcycle";

    /**
     * Resolution // Average Hexagon Edge Length (km):
     * 9 -- 0.174375668
     * 10 -- 0.065907807
     * 11 -- 0.024910561
     */
    @CommandLine.Option(names = {"-r", "--resolution"}, description = "H3 resolution")
    private int resolution = 10;

    @CommandLine.Option(names = "--local-osm-dir", description = "The directory to look the OSM file for")
    private String localOsmDir = "~/.graphhopper/openstreetmap";

    @CommandLine.Option(names = "--local-graphhopper-dir", description = "The graphhopper cache dir")
    private String localGraphhopperDir = "~/.graphhopper/graphhopper";

    @CommandLine.Option(names = "--local-osm-file", description = "The OSM file")
    private String osmFile = "mapfile.osm.pbf";
//    private String osmFile = "philippines-latest.osm.pbf";

    @CommandLine.Option(names = {"-o", "--output"}, description = "The output file")
    private String outputFilename = "output.distcache";

    @Override
    public Integer call() throws Exception {
        logger.debug("Parameters:");
        logger.debug("\tgeoJsonFile = {}", geoJsonFile.toPath().toString());
        logger.debug("\tpersistenceType = {}", persistenceType);
        logger.debug("\tH3 resolution = {}", resolution);
        logger.debug("\trouting profile = {}", routingProfile);
        logger.debug("\tlocalOsmDir = {}", localOsmDir);
        logger.debug("\tlocalGraphhopperDir = {}", localGraphhopperDir);
        logger.debug("\tosmFile = {}", osmFile);
        logger.debug("\toutputFilename = {}", outputFilename);
        logger.debug("\n");

        logger.info("Loading geoJson file {}", geoJsonFile.toPath().toString());
        String geoJsonContent = Files.readString(geoJsonFile.toPath());
        GeometryCollection geometryCollection = GeometryCollection.fromJson(geoJsonContent);
        if (geometryCollection.geometries().size() < 1) {
            logger.error("No geometries found in loaded file. Quitting.");
            return 1;
        }

        Polygon polygon = (Polygon) geometryCollection.geometries().get(0);
        List<GeoCoord> h3GeoCoords = new ArrayList<>();
        for (List<Point> coordList : polygon.coordinates()) {
            for (Point point : coordList) {
                h3GeoCoords.add(new GeoCoord(point.latitude(), point.longitude()));
            }
        }
        logger.info("Loaded polygon is defined by {} geo coordinates.", h3GeoCoords.size());

        List<Long> coveringHexagons = H3.h3().polyfill(h3GeoCoords, null, resolution);
        int dim = coveringHexagons.size();
        logger.info("Number of covering hexagons is {} at resolution {}", dim, resolution);
        logger.info("This will result a {}x{} distance matrix cache ({} cells).", dim, dim, dim * dim);

        double bytesNum = (4 + 4 + dim * 8 + (dim * dim) * (8 + 8 + 4));
        double mb = (bytesNum / 1024.0) / 1024.0;
        logger.info("Predicted size of the cache file: {} MB", String.format("%.3f", mb));

        logger.info("Attempting to load Graphhopper...");
        GraphhopperLoader ghLoader = new GraphhopperLoader(localOsmDir, localGraphhopperDir, osmFile);
        ghLoader.initAndLoad();

        logger.info("Initializing Graphhopper Router...");
        GraphhopperRouter router = new GraphhopperRouter(ghLoader.getHopper(), routingProfile);

        logger.info("Generating H3DistanceCache (dim = {})", dim);
        H3DistanceCache distanceCache = H3DistanceCache.generate(coveringHexagons, resolution, router);
        logger.info("H3DistanceCache generated successfully.");

        FilePersistence filePersistence = new FilePersistence(outputFilename);
        filePersistence.exportCache(distanceCache);

        return 0;
    }
}
