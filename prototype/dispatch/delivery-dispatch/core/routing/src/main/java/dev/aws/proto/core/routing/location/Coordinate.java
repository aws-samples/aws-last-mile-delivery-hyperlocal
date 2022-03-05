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

package dev.aws.proto.core.routing.location;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import javax.json.bind.annotation.JsonbProperty;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * Horizontal geographical coordinates consisting of latitude and longitude.
 */
@Data
@NoArgsConstructor
public class Coordinate {
    @JsonProperty("lat")
    @JsonbProperty("lat")
    private BigDecimal latitude;

    @JsonProperty("long")
    @JsonbProperty("long")
    private BigDecimal longitude;

    public Coordinate(double lat, double lon) {
        this.latitude = BigDecimal.valueOf(lat);
        this.longitude = BigDecimal.valueOf(lon);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Coordinate coordinate = (Coordinate) o;
        return latitude.compareTo(coordinate.latitude) == 0 &&
                longitude.compareTo(coordinate.longitude) == 0;
    }

    @Override
    public int hashCode() {
        return Objects.hash(latitude.doubleValue(), longitude.doubleValue());
    }
}
