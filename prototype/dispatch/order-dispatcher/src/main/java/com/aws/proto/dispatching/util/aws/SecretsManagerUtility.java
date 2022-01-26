/*-
 * ========================LICENSE_START=================================
 * Order Dispatcher
 * %%
 * Copyright (C) 2006 - 2022 Amazon Web Services
 * %%
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * =========================LICENSE_END==================================
 */
package com.aws.proto.dispatching.util.aws;

import org.eclipse.microprofile.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;
import software.amazon.awssdk.services.secretsmanager.model.InvalidParameterException;
import software.amazon.awssdk.services.secretsmanager.model.ResourceNotFoundException;

public class SecretsManagerUtility {
    private static final Logger logger = LoggerFactory.getLogger(SecretsManagerUtility.class);

    public static String getSecretValue(String secretName) {
        AwsCredentialsProvider credentialsProvider = CredentialsHelper.getCredentialsProvider();

        SecretsManagerClient secretsManagerClient = SecretsManagerClient.builder()
          .credentialsProvider(credentialsProvider)
          .region(CredentialsHelper.getRegion())
          .build();

        GetSecretValueRequest getSecretValueRequest = GetSecretValueRequest.builder()
          .secretId(secretName)
          .build();

        try {
            GetSecretValueResponse getSecretValueResponse = secretsManagerClient.getSecretValue(getSecretValueRequest);
            String result = getSecretValueResponse.secretString().toString();

            logger.debug("ApiKey value successfully retrieved from SecretsManager[{}]", secretName);

            return result;
        } catch (ResourceNotFoundException e) {
            logger.error("GetSecretValue :: ResourceNotFoundException :: {}", e.getMessage());
        } catch (InvalidParameterException e) {
            logger.error("GetSecretValue :: InvalidParameterException :: {}", e.getMessage());
        }

        return null;
    }
}
