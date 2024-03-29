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
import dev.aws.proto.core.routing.route.GraphhopperLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;

@ApplicationScoped
public class RoutingConfig {
    private static final Logger logger = LoggerFactory.getLogger(RoutingConfig.class);
    @Inject
    RoutingProperties routingProperties;

    private GraphhopperLoader loader;

    RoutingConfig(RoutingProperties routingProperties) {
        this.loader = new GraphhopperLoader(
                routingProperties.localOsmDir(),
                routingProperties.localGraphhopperDir(),
                routingProperties.osmFile()
        );

        this.routingProperties = routingProperties;

        this.loader.initAndLoad();
    }


    /**
     * Creates GraphHopper instance.
     *
     * @return GraphHopper
     */
    public GraphHopper graphHopper() {
        return this.loader.getHopper();
    }

    public String routingProfile() {
        return this.routingProperties.routingProfile();
    }
}
