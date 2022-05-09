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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.aws.proto.core.routing.cache.persistence.latlong.FilePersistence;
import dev.aws.proto.core.routing.distance.DistanceMatrix;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.location.ILocation;
import dev.aws.proto.core.routing.route.GraphhopperLoader;
import dev.aws.proto.core.routing.route.GraphhopperRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;

import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.stream.Collectors;

@CommandLine.Command(name = "build-lat-long", description = "Build Lat/Long DistanceCache and export")
public class BuildLatLongCache implements Callable<Integer> {
    private static final Logger logger = LoggerFactory.getLogger(BuildLatLongCache.class);

    @CommandLine.Parameters(index = "0", description = "The file containing the list of lat/longs as input")
    private File locationsFile;

    @CommandLine.Option(names = {"-p", "--persistence"}, description = "file, s3 [later: redis, neptune]")
    private String persistenceType = "file";

    @CommandLine.Option(names = "--routing-profile", description = "car, motorcycle")
    private String routingProfile = "car";

    @CommandLine.Option(names = "--local-osm-dir", description = "The directory to look the OSM file for")
    private String localOsmDir = "~/.graphhopper/openstreetmap";

    @CommandLine.Option(names = "--local-graphhopper-dir", description = "The graphhopper cache dir")
    private String localGraphhopperDir = "~/.graphhopper/graphhopper";

    @CommandLine.Option(names = "--local-osm-file", description = "The OSM file")
    private String osmFile = "mapfile.osm.pbf";

    @CommandLine.Option(names = {"-o", "--output"}, description = "The output file")
    private String outputFilename = "output.latlongcache";

    @Override
    public Integer call() throws Exception {
        logger.debug("Parameters:");
        logger.debug("\tlocationsFile = {}", locationsFile.toPath().toString());
        logger.debug("\tpersistenceType = {}", persistenceType);
        logger.debug("\trouting profile = {}", routingProfile);
        logger.debug("\tlocalOsmDir = {}", localOsmDir);
        logger.debug("\tlocalGraphhopperDir = {}", localGraphhopperDir);
        logger.debug("\tosmFile = {}", osmFile);
        logger.debug("\toutputFilename = {}", outputFilename);
        logger.debug("\n");

        logger.info("Loading locations file {}", locationsFile.toPath().toString());
        String locationsFileContent = Files.readString(locationsFile.toPath());

        ObjectMapper objectMapper = new ObjectMapper();
        List<Coordinate> loadedPoints = objectMapper.readValue(locationsFileContent, new TypeReference<List<Coordinate>>() {
        });
        List<ILocation> locationList = loadedPoints.stream().map(c -> {
            return new ILocation() {
                @Override
                public Coordinate coordinate() {
                    return c;
                }
            };
        }).collect(Collectors.toList());

        int dim = loadedPoints.size();
        logger.info("Loaded {} lat/long pairs", dim);
        logger.info("This will result a {}x{} distance matrix cache ({} cells).", dim, dim, dim * dim);

        double bytesNum = (4 + dim * (8 + 8) + (dim * dim) * (8 + 8));
        double mb = (bytesNum / 1024.0) / 1024.0;
        logger.info("Predicted size of the cache file: {} MB", String.format("%.3f", mb));

        logger.info("Attempting to load Graphhopper...");
        GraphhopperLoader ghLoader = new GraphhopperLoader(localOsmDir, localGraphhopperDir, osmFile);
        ghLoader.initAndLoad();

        logger.info("Initializing Graphhopper Router...");
        GraphhopperRouter router = new GraphhopperRouter(ghLoader.getHopper(), routingProfile);

        logger.info("Generating DistanceMatrix (dim = {})", dim);
        DistanceMatrix distanceMatrix = DistanceMatrix.generate(locationList, router);
        logger.info("DistanceMatrix generated successfully.");

        FilePersistence filePersistence = new FilePersistence(outputFilename);
        filePersistence.buildCache(distanceMatrix);

        return 0;
    }
}
