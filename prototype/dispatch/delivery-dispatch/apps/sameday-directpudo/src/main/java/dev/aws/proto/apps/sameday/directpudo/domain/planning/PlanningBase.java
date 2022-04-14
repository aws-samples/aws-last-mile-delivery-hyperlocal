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

package dev.aws.proto.apps.sameday.directpudo.domain.planning;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.optaplanner.core.api.domain.lookup.PlanningId;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public abstract class PlanningBase<TId extends Comparable<TId>> implements Comparable<PlanningBase<TId>> {
    protected TId id;

    @PlanningId
    public TId getId() {
        return this.id;
    }

    public String getShortId() {
        if (this.id != null) {
            String idStr = this.id.toString();
            if (idStr.length() > 8) {
                idStr = idStr.substring(0, 8);
            }
            return idStr;
        }
        return null;
    }

    @Override
    public int compareTo(PlanningBase<TId> other) {
        int classComp = getClass().getName().compareTo(other.getClass().getName());
        if (classComp == 0) {
            return this.id.compareTo(other.getId());
        }
        return classComp;
    }
}
