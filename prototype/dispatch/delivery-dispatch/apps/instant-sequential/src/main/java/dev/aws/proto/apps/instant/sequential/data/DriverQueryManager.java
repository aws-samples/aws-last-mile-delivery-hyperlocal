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

package dev.aws.proto.apps.instant.sequential.data;

import dev.aws.proto.apps.appcore.config.DriverClientConfig;
import dev.aws.proto.apps.appcore.config.DriverQueryProperties;
import dev.aws.proto.apps.instant.sequential.domain.planning.PlanningDriver;
import dev.aws.proto.core.exception.DispatcherException;
import org.eclipse.microprofile.rest.client.RestClientBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import java.net.URI;

/**
 * Manager class to provide a custom URL REST client to query drivers.
 */
@ApplicationScoped
public class DriverQueryManager extends dev.aws.proto.apps.appcore.data.DriverQueryManager<ApiDriver, PlanningDriver> {
    private static final Logger logger = LoggerFactory.getLogger(DriverQueryManager.class);

    DriverQueryClient driverQueryClient;

    DriverQueryManager(DriverClientConfig driverClientConfig, DriverQueryProperties driverQueryProperties) {
        this.driverClientConfig = driverClientConfig;
        this.driverQueryProperties = driverQueryProperties;

        String driverApiUrl = this.driverClientConfig.getDriverApiUrl();
        if (driverApiUrl == null || driverApiUrl.equalsIgnoreCase("")) {
            logger.error("Driver API URL empty. This is a must needed parameter. Quitting...");
            throw new DispatcherException("Driver API URL empty. Quitting...");
        }

        this.driverQueryClient = RestClientBuilder.newBuilder()
                .baseUri(URI.create(driverApiUrl))
                .build(DriverQueryClient.class);
    }

    @Override
    public DriverQueryClient getDriverQueryClient() {
        return this.driverQueryClient;
    }
}
