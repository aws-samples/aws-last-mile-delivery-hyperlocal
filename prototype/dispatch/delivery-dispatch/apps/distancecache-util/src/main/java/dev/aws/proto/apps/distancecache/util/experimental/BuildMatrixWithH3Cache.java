package dev.aws.proto.apps.distancecache.util.experimental;

import com.opencsv.CSVReader;
import com.uber.h3core.H3Core;
import dev.aws.proto.core.routing.H3;
import dev.aws.proto.core.routing.cache.H3DistanceCache;
import dev.aws.proto.core.routing.cache.H3DistanceMatrix;
import dev.aws.proto.core.routing.cache.persistence.h3.FilePersistence;
import dev.aws.proto.core.routing.distance.TravelDistance;
import dev.aws.proto.core.routing.location.Coordinate;
import dev.aws.proto.core.routing.location.ILocation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.stream.Collectors;

@CommandLine.Command(name = "matrix-h3", description = "Experiment building Distance Matrix using H3 cache")
public class BuildMatrixWithH3Cache implements Callable<Integer> {

    private static final Logger logger = LoggerFactory.getLogger(BuildMatrixWithH3Cache.class);

    @CommandLine.Parameters(index = "0", description = "The CSV file that contains lat/longs")
    private File latLongListFile;

    @CommandLine.Option(names = {"-c", "--cache-file"}, description = "The H3 cache file to use", required = true)
    private File cacheFile;

    @CommandLine.Option(names = {"-d", "--dimension"}, description = "Matrix dimension to generate", required = true)
    private Integer matrixDim;

    @CommandLine.Option(names = {"-n", "--num-of-exp"}, description = "Number of times to generate the matrix", required = true)
    private Integer numOfExp;

    @Override
    public Integer call() throws Exception {
        logger.info("Importing H3 cache file from {}", cacheFile.toPath().toString());

        H3DistanceCache distanceCache;
        List<Coordinate> latLongCoords = new ArrayList<>();

        // load h3 cache
        try {
            FilePersistence filePersistence = new FilePersistence(cacheFile.toPath().toString());
            distanceCache = filePersistence.importCache();

            int dim = distanceCache.getH3Hexagons().length;
            logger.info("Distance Cache loaded successfully to memory.");
            logger.info("Number of hexagons: {}", dim);
            logger.info("H3 resolution: {}", distanceCache.getH3Resolution());
            logger.info("Matrix size: {}x{} ({} cells)", dim, dim, dim * dim);

        } catch (Exception ex) {
            logger.error("Error while loading distance cache file: {}", ex.getMessage());
            ex.printStackTrace();

            return 1;
        }


        H3Core h3 = H3.h3();

        // this lat/long should be somewhere in the center of your coverage area
        long centerHexa = h3.geoToH3(1.304362, 103.833110, distanceCache.getH3Resolution());

        // load csv with lat/longs
        try {
            CSVReader reader = new CSVReader(new FileReader(latLongListFile), ',',  '\'', 1);
            String[] record = null;

            int notInCoverageCnt = 0;

            while((record = reader.readNext()) != null) {
                Coordinate c = new Coordinate(Double.parseDouble(record[0]), Double.parseDouble(record[1]));

                TravelDistance d = distanceCache.getDistance(h3.geoToH3(c.getLatitude(), c.getLongitude(), distanceCache.getH3Resolution()), centerHexa);
                if (d != null) {
                    latLongCoords.add(c);
                } else {
                    notInCoverageCnt++;
                }
            }
            reader.close();

            logger.info("{} lat/longs were read from {}", latLongCoords.size(), latLongListFile.toPath().toString());
            logger.info("Not in coverage from original CSV: {} coordinates", notInCoverageCnt);

        } catch(FileNotFoundException fnfEx) {
            logger.error("Error while loading lat/long csv: {}", fnfEx.getMessage());
            fnfEx.printStackTrace();

            return 1;
        }

        runExperiment(distanceCache, latLongCoords);

        return 0;
    }

    private List<Coordinate> pickRandomN(List<Coordinate> coordinates, int n) {
        Collections.shuffle(coordinates);

        return coordinates.subList(0, n);
    }

    private class Location implements ILocation {
        private Coordinate coordinate;
        Location(Coordinate coordinate) {
            this.coordinate = coordinate;
        }

        @Override
        public Coordinate coordinate() {
            return this.coordinate;
        }
    }

    private void runExperiment(H3DistanceCache distanceCache, List<Coordinate> coordinates) {

        List<Long> genTimes = new ArrayList<>();

        for (int n = 0; n < this.numOfExp; n++) {
            List<Coordinate> randomLatLongs = this.pickRandomN(coordinates, this.matrixDim);
            List<Location> locations = randomLatLongs.stream().map(Location::new).collect(Collectors.toList());

            long start = System.currentTimeMillis();
            H3DistanceMatrix<Location> distanceMatrix = H3DistanceMatrix.generate(distanceCache, locations);
            long generatedTime = System.currentTimeMillis() - start;
            genTimes.add(generatedTime);
        }

        logger.info("{}x{} matrix generation ({} times)", this.matrixDim, this.matrixDim, this.numOfExp);
        logger.info("{}", (Object) genTimes);
    }
}
