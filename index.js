/**
 * Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/

var fs = require('fs'),
    path = require('path'),
    Promise = require('bluebird'),
    tmp = require('tmp'),
    grunt = require('grunt'),
    package = require('./package'),
    _ = require('lodash')


// Ensures temporary files are cleaned up on program close, even if errors are encountered.
tmp.setGracefulCleanup()

var defaults = {
    quiet: false,
    port: 4400,
    targetDir: path.resolve(process.cwd(), 'public'),
    targetFile: 'index.html',
    appDir: path.resolve(__dirname, 'app'),
    configFile: path.resolve(__dirname, 'app/lib/config.js'),
    cacheDir: tmp.dirSync({ unsafeCleanup: true, prefix: 'spectacle-' }).name
};
function resolveOptions(options) {
    var opts = _.extend({}, defaults, options)

    // Replace some absolute paths
    if (opts.specFile && opts.specFile.indexOf('test/fixtures') === 0)
        opts.specFile = path.resolve(__dirname, opts.specFile)
    if (opts.logoFile && opts.logoFile.indexOf('test/fixtures') === 0)
        opts.logoFile = path.resolve(__dirname, opts.logoFile)

    return opts;
}

/**
 * Run Spectacle and configured tasks
 **/
module.exports = function (options) {
    var opts = resolveOptions(options)

    //
    //= Load the specification and init configuration

    function loadData() {
        var specPath = path.resolve(opts.specFile)
        delete require.cache[specPath];
        return require(path.resolve(opts.appDir + '/lib/preprocessor'))(
                                    options, require(specPath))
    }

    var config = require(path.resolve(opts.configFile))(grunt, opts, loadData())

    //
    //= Setup Grunt to do the heavy lifting

    grunt.initConfig(_.merge({ pkg: package }, config))
    if(opts.quiet) {
        grunt.log.writeln = function() {}
        grunt.log.write = function() {}
        grunt.log.header = function() {}
        grunt.log.ok = function() {}
    }

    var cwd = process.cwd() // change CWD for loadNpmTasks global install
    var exists = grunt.file.exists(path.join(path.resolve('node_modules'),
                                             'grunt-contrib-concat',
                                             'package.json'))
    if (!exists)
        process.chdir(__dirname)

    grunt.loadNpmTasks('grunt-contrib-concat')
    grunt.loadNpmTasks('grunt-contrib-uglify')
    grunt.loadNpmTasks('grunt-contrib-cssmin')
    grunt.loadNpmTasks('grunt-contrib-watch')
    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.loadNpmTasks('grunt-contrib-connect')
    grunt.loadNpmTasks('grunt-compile-handlebars')
    grunt.loadNpmTasks('grunt-prettify')
    grunt.loadNpmTasks('grunt-sass')

    process.chdir(cwd)

    grunt.registerTask('predentation', 'Remove indentation from generated <pre> tags.', function() {
        var html = fs.readFileSync(opts.cacheDir + '/' + opts.targetFile, 'utf8')
        html = html.replace(/<pre.*?><code.*?>([\s\S]*?)<\/code><\/pre>/gmi, function(x, y) {
            var lines = x.split('\n'), level = null;
            if (lines) {

                // Determine the level of indentation
                lines.forEach(function(line) {
                    if (line[0] === '<') return;
                    var wsp = line.search(/\S/)
                    level = (level === null || (wsp < line.length && wsp < level)) ? wsp : level;
                })

                // Remove indentation
                var regex = new RegExp('^\\s{' + level + '}')
                lines.forEach(function(line, index, lines) {
                    lines[index] = line.replace(regex, '')
                })
            }
            return lines.join('\n')
        })
        fs.writeFileSync(opts.cacheDir + '/' + opts.targetFile, html)
    })

    grunt.registerTask('stylesheets', ['sass:scss', 'concat:css', 'cssmin'])
    grunt.registerTask('javascripts', ['concat:js', 'uglify'])
    grunt.registerTask('templates', ['clean:html', 'compile-handlebars', 'predentation', 'prettify'])
    grunt.registerTask('foundation', ['sass:foundation_scss', 'concat:foundation_css']) // 'concat:foundation_js'
    grunt.registerTask('default', ['stylesheets', 'javascripts', 'foundation', 'templates'])
    grunt.registerTask('server', ['connect'])
    grunt.registerTask('develop', ['server', 'watch'])

    // Reload template data when watch files change
    grunt.event.on('watch', function(action, filepath) {
        // if (filepath == config.specFile)
        grunt.config.set('compile-handlebars.compile.templateData', loadData())
    })

    // Report, etc when all tasks have completed.
    var donePromise = new Promise(function(resolve, reject) {
      grunt.task.options({
          error: function(e) {
              if(!opts.quiet) {
                  console.warn('Task error:', e)
              }
              // TODO: fail here or push on?
              reject(e)
          },
          done: function() {
              if(!opts.quiet) {
                  console.log('All tasks complete')
              }
              resolve()
          }
      })
    })


    //
    //= Run the shiz

    if (opts.startServer) {
        grunt.task.run('server')
    }
    else {
        if (!opts.disableCss) {
            grunt.task.run(['foundation', 'stylesheets'])
        }
        if (!opts.disableJs) {
            grunt.task.run('javascripts')
        }
        if (opts.logoFile) {
            grunt.task.run('copy:logo')
        }
        grunt.task.run('templates')
        if (opts.developmentMode) {
            grunt.task.run('develop')
        }
    }

    grunt.task.start()

    return donePromise;
};
