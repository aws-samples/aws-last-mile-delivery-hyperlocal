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

package dev.aws.proto.core.routing.route;

import com.graphhopper.GraphHopper;
import com.graphhopper.config.Profile;
import com.graphhopper.routing.util.CarFlagEncoder;
import com.graphhopper.routing.util.FlagEncoderFactory;
import com.graphhopper.routing.util.MotorcycleFlagEncoder;
import dev.aws.proto.core.exception.DispatcherException;
import dev.aws.proto.core.util.PathHelper;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Loader for the Graphhopper router.
 * It will initialize the cache folders and build the cache if it doesn't exist.
 */
public class GraphhopperLoader {
    private static final Logger logger = LoggerFactory.getLogger(GraphhopperLoader.class);

    /**
     * The directory that contains the openstreetmap file.
     */
    private final Path localOsmDir;

    /**
     * The local graphhopper cache dir.
     */
    private final Path localGraphhopperCacheDir;

    /**
     * The path to the openstreetmap file (osm.pbf).
     */
    private final Path osmFilePath;

    /**
     * The hopper router.
     */
    @Getter
    private GraphHopper hopper;

    /**
     * Lock for the init mechanism
     * (in case there are multiple threads initiating the importAndLoad -- ie health check / order assignment request).
     */
    private Lock initLock = new ReentrantLock();

    public GraphhopperLoader(String localOsmDir, String localGraphhopperCacheDir, String osmFile) {
        this.localOsmDir = PathHelper.getAbsPath(localOsmDir);
        this.localGraphhopperCacheDir = PathHelper.getAbsPath(localGraphhopperCacheDir);
        this.osmFilePath = this.localOsmDir.resolve(osmFile).toAbsolutePath();
    }

    /**
     * Initializes/checks all the necessary folders and calls {@link #importAndLoad()}.
     */
    public void initAndLoad() {
        initLock.lock();
        try {
            logger.trace("Checking local directory that has the OSM file");
            if (!this.localOsmDir.toFile().exists()) {
                logger.warn("{} dir doesn't exist. Creating local OSM dir.", this.localOsmDir);
                Files.createDirectories(this.localOsmDir);
            }
            logger.debug("Local OSM dir ({}) ok", this.localOsmDir);

            logger.trace("Checking graphhopper cache dir");
            if (!this.localGraphhopperCacheDir.toFile().exists()) {
                logger.warn("{} dir doesn't exist. Creating local graphhopper dir.", this.localGraphhopperCacheDir);
                Files.createDirectories(this.localGraphhopperCacheDir);
            }
            logger.debug("Local Graphhopper cache dir ({}) ok", this.localGraphhopperCacheDir);

            logger.trace("Checking OSM mapfile");
            if (!this.osmFilePath.toFile().exists()) {
                logger.error("{} local osm file doesn't exist. Quitting...", this.osmFilePath);
                throw new FileNotFoundException("Local OSM file doesn't exist (" + this.osmFilePath + ")");
            }
            logger.debug("Local OSM file ({}) ok", this.osmFilePath);

            this.hopper = this.importAndLoad();

        } catch (IOException e) {
            throw new DispatcherException("Can't find local OSM and/or Graphhopper dirs", e);
        } finally {
            initLock.unlock();
        }
    }

    /**
     * The Graphhopper router parameterization and import happens here.
     *
     * @return The hopper router.
     */
    private GraphHopper importAndLoad() {
        GraphHopper hopper = new GraphHopper();
        logger.info("Importing OSM file and cache: {}", osmFilePath);
        logger.debug("Loading Graphhopper with CAR and MOTORCYCLE profiles");

        hopper.setOSMFile(this.osmFilePath.toString());
        hopper.setGraphHopperLocation(this.localGraphhopperCacheDir.toString());
        hopper.getEncodingManagerBuilder().add(new CarFlagEncoder());
        hopper.getEncodingManagerBuilder().add(new MotorcycleFlagEncoder());
        hopper.setProfiles(new Profile(FlagEncoderFactory.CAR), new Profile(FlagEncoderFactory.MOTORCYCLE));
        hopper.setMinNetworkSize(600);
        hopper.importOrLoad();

        logger.debug("Graphhopper loading successful");

        return hopper;
    }
}
