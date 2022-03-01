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

package dev.aws.proto.core.routing;

import com.fasterxml.jackson.annotation.JsonProperty;

import javax.json.bind.annotation.JsonbProperty;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * Horizontal geographical coordinates consisting of latitude and longitude.
 */
public class Coordinate {

    private final BigDecimal latitude;
    private final BigDecimal longitude;

    public Coordinate(BigDecimal latitude, BigDecimal longitude) {
        this.latitude = Objects.requireNonNull(latitude);
        this.longitude = Objects.requireNonNull(longitude);
    }

    /**
     * Create coordinates from the given latitude in longitude.
     *
     * @param latitude  latitude
     * @param longitude longitude
     * @return coordinates with the given latitude and longitude
     */
    public static Coordinate valueOf(double latitude, double longitude) {
        return new Coordinate(BigDecimal.valueOf(latitude), BigDecimal.valueOf(longitude));
    }

    public static Coordinate buildFrom(ObjectInputStream inputStream) throws IOException {
        return Coordinate.valueOf(inputStream.readDouble(), inputStream.readDouble());
    }

    public void writeTo(ObjectOutputStream outputStream) throws IOException {
        outputStream.writeDouble(this.latitude.doubleValue());
        outputStream.writeDouble(this.longitude.doubleValue());
    }

    /**
     * Latitude.
     *
     * @return latitude (never {@code null})
     */
    @JsonProperty("lat")
    @JsonbProperty("lat")
    public BigDecimal latitude() {
        return latitude;
    }

    /**
     * Longitude.
     *
     * @return longitude (never {@code null})
     */
    @JsonProperty("long")
    @JsonbProperty("long")
    public BigDecimal longitude() {
        return longitude;
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

    @Override
    public String toString() {
        return "[" + latitude.toPlainString() +
                ", " + longitude.toPlainString() +
                ']';
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }
}
