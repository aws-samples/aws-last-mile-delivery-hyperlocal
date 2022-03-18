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
package dev.aws.proto.core.routing.config;

import com.graphhopper.GraphHopper;
import com.graphhopper.config.Profile;
import com.graphhopper.routing.util.CarFlagEncoder;
import com.graphhopper.routing.util.FlagEncoderFactory;
import com.graphhopper.routing.util.MotorcycleFlagEncoder;
import dev.aws.proto.core.exception.DispatcherException;
import dev.aws.proto.core.util.PathHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

@ApplicationScoped
public class RoutingConfig {
    private static final Logger logger = LoggerFactory.getLogger(RoutingConfig.class);
    private final Path localOsmDir;
    private final Path localGraphhopperDir;
    private final Path osmFilePath;
    @Inject
    RoutingProperties routingProperties;
    private GraphHopper hopper;
    private Lock initLock = new ReentrantLock();

    RoutingConfig(RoutingProperties routingProperties) {
        this.localOsmDir = PathHelper.getAbsPath(routingProperties.localOsmDir());
        this.localGraphhopperDir = PathHelper.getAbsPath(routingProperties.localGraphhopperDir());
        this.osmFilePath = this.localOsmDir.resolve(routingProperties.osmFile()).toAbsolutePath();
        this.routingProperties = routingProperties;

        init();
    }

    private void init() {
        initLock.lock();
        try {
            logger.trace("Checking local directory that has the OSM file");
            if (!this.localOsmDir.toFile().exists()) {
                logger.warn("{} dir doesn't exist. Creating local OSM dir.", this.localOsmDir);
                Files.createDirectories(this.localOsmDir);
            }
            logger.debug("Local OSM dir ({}) ok", this.localOsmDir);

            logger.trace("Checking graphhopper cache dir");
            if (!this.localGraphhopperDir.toFile().exists()) {
                logger.warn("{} dir doesn't exist. Creating local graphhopper dir.", this.localGraphhopperDir);
                Files.createDirectories(this.localGraphhopperDir);
            }
            logger.debug("Local Graphhopper cache dir ({}) ok", this.localGraphhopperDir);

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

    private GraphHopper importAndLoad() {
        GraphHopper hopper = new GraphHopper();
        logger.info("Importing OSM file and cache: {}", osmFilePath);
        logger.debug("Loading Graphhopper with CAR and MOTORCYCLE profiles");

        hopper.setOSMFile(this.osmFilePath.toString());
        hopper.setGraphHopperLocation(this.localGraphhopperDir.toString());
        hopper.getEncodingManagerBuilder().add(new CarFlagEncoder());
        hopper.getEncodingManagerBuilder().add(new MotorcycleFlagEncoder());
        hopper.setProfiles(new Profile(FlagEncoderFactory.CAR), new Profile(FlagEncoderFactory.MOTORCYCLE));
        hopper.importOrLoad();

        logger.debug("Graphhoper loading successful");

        return hopper;
    }

    /**
     * Creates GraphHopper instance.
     *
     * @return GraphHopper
     */
    public GraphHopper graphHopper() {
        return hopper;
    }
}
