/**
 * Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/

var fs = require('fs'),
    path = require('path'),
    grunt = require('grunt'),
    package = require('./package'),
    _ = require('lodash');


/**
 * Run Spectacle and configured tasks
 **/
module.exports = function (options) {

    //
    //= Load the specification and set variables

    var specData = require(path.resolve(options.specFile)),
        templateData = require(path.resolve(options.appDir + '/lib/preprocessor'))(options, specData),
        config = require(path.resolve(options.configFile))(grunt, options, templateData);

    //
    //= Setup Grunt to do the heavy lifting

    grunt.initConfig(_.merge({ pkg: package }, config));

    var cwd = process.cwd(); // change CWD for loadNpmTasks global install
    var exists = grunt.file.exists(path.join(path.resolve('node_modules'),
                                             'grunt-contrib-concat',
                                             'package.json'));
    if (!exists)
        process.chdir(__dirname);

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-compile-handlebars');
    grunt.loadNpmTasks('grunt-sass');

    process.chdir(cwd);

    grunt.registerTask('predentation', 'Remove indentation from generated <pre> tags.', function() {
        var html = fs.readFileSync(options.cacheDir + '/' + options.targetFile, 'utf8');
        html = html.replace(/<pre.*?><code.*?>([\s\S]*?)<\/code><\/pre>/gmi, function(x, y) {
            var lines = x.split('\n'), level = null;
            if (lines) {

                // Determine the level of indentation
                lines.forEach(function(line) {
                    if (line[0] === '<') return;
                    var wsp = line.search(/\S/);
                    level = (level === null || (wsp < line.length && wsp < level)) ? wsp : level;
                });

                // Remove indentation
                var regex = new RegExp('^\\s{' + level + '}');
                lines.forEach(function(line, index, lines) {
                    lines[index] = line.replace(regex, '');
                });
            }
            return lines.join('\n');
        });
        fs.writeFileSync(options.targetDir + '/' + options.targetFile, html);
    });

    grunt.registerTask('stylesheets', ['sass:scss', 'concat:css', 'cssmin']);
    grunt.registerTask('javascripts', ['concat:js', 'uglify']);
    grunt.registerTask('templates', ['clean:html', 'compile-handlebars', 'predentation']);
    grunt.registerTask('foundation', ['sass:foundation_scss', 'concat:foundation_css']); // 'concat:foundation_js'
    grunt.registerTask('default', ['stylesheets', 'javascripts', 'foundation', 'templates']);
    grunt.registerTask('server', ['connect']);
    grunt.registerTask('develop', ['server', 'watch']);

    // Report, etc when all tasks have completed.
    grunt.task.options({
        error: function(e) {
            console.warn('Task error:', e);
            // TODO: fail here or push on?
        },
        done: function() {
            console.log('All tasks complete');
        }
    });

    //
    //= Run the shiz

    if (options.startServer) {
        grunt.task.run('server');
    }
    else {
        if (!options.disableCss) {
            grunt.task.run(['foundation', 'stylesheets']);
        }
        if (!options.disableJs) {
            grunt.task.run('javascripts');
        }
        if (options.logoFile) {
            grunt.task.run('copy:logo');
        }
        grunt.task.run('templates');
        if (options.developmentMode) {
            grunt.task.run('develop');
        }
    }

    grunt.task.start();
};
