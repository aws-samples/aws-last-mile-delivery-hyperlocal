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

package dev.aws.proto.apps.sameday.directpudo.config;

import dev.aws.proto.apps.appcore.config.DistanceCachingProperties;
import dev.aws.proto.core.routing.cache.H3DistanceCache;
import dev.aws.proto.core.routing.cache.persistence.ICachePersistence;
import dev.aws.proto.core.routing.cache.persistence.h3.FilePersistence;
import dev.aws.proto.core.routing.cache.persistence.h3.S3FilePersistence;
import dev.aws.proto.core.util.PathHelper;
import lombok.Getter;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.NotSupportedException;

@ApplicationScoped
public class DistanceCachingConfig {

    @Getter
    private final ICachePersistence<H3DistanceCache> cachePersistence;

    @Inject
    DistanceCachingProperties distanceCachingProperties;

    DistanceCachingConfig(DistanceCachingProperties distanceCachingProperties) {
        String persistenceType = distanceCachingProperties.persistenceType();

        if (persistenceType.equalsIgnoreCase("file")) {
            String cacheFilePath = PathHelper.getAbsPath(distanceCachingProperties.cacheFilePath()).toString();
            this.cachePersistence = new FilePersistence(cacheFilePath);
        } else if (persistenceType.equalsIgnoreCase("s3")) {
            if (distanceCachingProperties.cacheBucketName().isEmpty()) {
                throw new IllegalArgumentException("Error initializing DistanceCachingConfig: cacheBucketName is missing from application.properties");
            }

            this.cachePersistence = new S3FilePersistence(distanceCachingProperties.cacheBucketName().get(), distanceCachingProperties.cacheFilePath());
        } else {
            throw new NotSupportedException("Error initializing DistanceCachingConfig: " + distanceCachingProperties.persistenceType() + " persistence type not supported in this version.");
        }
    }
}
