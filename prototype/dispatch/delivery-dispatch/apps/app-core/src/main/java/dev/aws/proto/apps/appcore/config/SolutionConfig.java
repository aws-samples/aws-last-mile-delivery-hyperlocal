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
package dev.aws.proto.apps.appcore.config;

import io.quarkus.runtime.configuration.ProfileManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import java.net.URISyntaxException;
import java.nio.file.Paths;

/**
 * Class for loading the solver config based on execution profile.
 */
@ApplicationScoped
public class SolutionConfig {
    private static final Logger logger = LoggerFactory.getLogger(SolutionConfig.class);

    /**
     * Config properties.
     */
    @Inject
    SolutionProperties solutionProperties;

    /**
     * Path to the solver's config xml file.
     */
    private String solverConfigXmlPath;

    SolutionConfig(SolutionProperties solutionProperties) {
        this.solverConfigXmlPath = solutionProperties.solverConfigXmlPath();
    }

    /**
     * Path to the solver's config xml file.
     * If the execution profile is "dev", it loads from the "resources"; otherwise from external file.
     *
     * @return The absolute path to the solver's config xml.
     */
    public String getSolverConfigXmlPath() {
        try {
            if (ProfileManager.getActiveProfile().equalsIgnoreCase("dev")) {
                return Paths.get(getClass().getClassLoader().getResource(solverConfigXmlPath).toURI()).toFile().getAbsolutePath();
            }

            return Paths.get(solverConfigXmlPath).toFile().getAbsolutePath();
        } catch (URISyntaxException e) {
            logger.error(e.getInput(), e);
        }

        return null;
    }
}
