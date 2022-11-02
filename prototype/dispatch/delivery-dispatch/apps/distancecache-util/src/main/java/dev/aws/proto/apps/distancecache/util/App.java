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

package dev.aws.proto.apps.distancecache.util;

import dev.aws.proto.apps.distancecache.util.commands.BuildH3Cache;
import dev.aws.proto.apps.distancecache.util.commands.BuildLatLongCache;
import dev.aws.proto.apps.distancecache.util.commands.ImportH3Cache;
import dev.aws.proto.apps.distancecache.util.commands.ImportLatLongCache;
import dev.aws.proto.apps.distancecache.util.experimental.BuildMatrixRaw;
import dev.aws.proto.apps.distancecache.util.experimental.BuildMatrixWithH3Cache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;
import picocli.CommandLine.Command;

import java.util.concurrent.Callable;

@Command(
        name = "distance-cache-util", mixinStandardHelpOptions = true,
        version = "1.0",
        description = "Utility to import and export distance cache for H3 and lat/long distance matrices",
        commandListHeading = "%nCommands:%n%nThe most commonly used git commands are:%n",
        footer = "%nSee 'distance-cache-util help <command>' to read about a specific subcommand or concept.",
        subcommands = {
                ImportH3Cache.class,
                BuildH3Cache.class,

                BuildLatLongCache.class,
                ImportLatLongCache.class,

                // experimental
                BuildMatrixWithH3Cache.class,
                BuildMatrixRaw.class,
        }
)
public class App implements Callable<Integer> {
    @CommandLine.Spec
    CommandLine.Model.CommandSpec spec;

    public static void main(String[] args) {
        int exitCode = new CommandLine(new App()).execute(args);
        System.exit(exitCode);
    }


    @Override
    public Integer call() throws Exception {
        spec.commandLine().usage(System.err);
        return 1;
    }
}
