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

package dev.aws.proto.core.routing.cache.inspection;

import dev.aws.proto.core.routing.H3;
import dev.aws.proto.core.routing.exception.CacheResolutionException;

public class ResolutionChecker {

    /**
     * Validates if the hexagon is with the expected resolution. Otherwise, throws an exception.
     *
     * @param hexa               The hexagon represented with long.
     * @param expectedResolution The expected H3 resolution.
     */
    public static void validate(long hexa, int expectedResolution) {
        int res = H3.h3().h3GetResolution(hexa);
        if (res != expectedResolution) {
            throw new CacheResolutionException(
                    String.format("Resolution mismatch! %d has resolution %d - expected resolution is %d",
                            hexa, res, expectedResolution));
        }
    }
}
