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
package dev.aws.proto.core.util.aws;

import io.quarkus.runtime.configuration.ProfileManager;
import org.eclipse.microprofile.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.regions.Region;

public class CredentialsHelper {
    private static Logger logger = LoggerFactory.getLogger(CredentialsHelper.class);

    static Region region;

    public static AwsCredentialsProvider getCredentialsProvider() {
        AwsCredentialsProvider credentialsProvider;
        String activeProfile = ProfileManager.getActiveProfile();

        logger.trace("getCredentialsProvider called. activeProfile={}", activeProfile);

        if (activeProfile.equalsIgnoreCase("dev")) {
            String profileName = ConfigProvider.getConfig().getValue("aws.profile", String.class);
            logger.trace("app's activeProfile = {}, awsProfile = {}. Acquiring ProfileCredentialsProvider", activeProfile, profileName);
            credentialsProvider = ProfileCredentialsProvider.builder()
                    .profileName(profileName)
                    .build();
        } else {
            logger.trace("app's activeProfile = {}. Acquiring default credentials provider", activeProfile);
            credentialsProvider = DefaultCredentialsProvider.builder().build();
        }

        logger.debug("Acquired AWS credentials provider: {}", credentialsProvider);
        return credentialsProvider;
    }

    public static Region getRegion() {
        if (region == null) {
            logger.trace("Reading aws.region information from config");
            String regionStr = ConfigProvider.getConfig().getValue("aws.region", String.class);
            region = Region.of(regionStr);
            logger.trace("aws.region = {}", region);
        }
        return region;
    }

}
