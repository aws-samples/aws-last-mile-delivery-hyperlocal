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

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithName;

/**
 * Properties for driver REST api config.
 */
@ConfigMapping(prefix = "app.client.driver-api")
public interface DriverClientProperties {
    /**
     * The name of the secret item that holds the API key in SecretsManager.
     *
     * @return The secret name.
     */
    @WithName("apikey-secret-name")
    String driverApiKeySecretName();

    /**
     * The name of the parameter that holds the API URL in SSM Parameter store.
     *
     * @return The name of the parameter.
     */
    @WithName("api-url-parameter-name")
    String driverApiUrlParameterName();
}
