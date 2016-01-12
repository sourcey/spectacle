#!/usr/bin/env node

var program = require('commander'),
    grunt = require('grunt'),
    fs = require('fs'),
    path = require('path'),
    predentation = require('predentation'),
    package = require('../package');

// Set CWD to root dir
process.chdir(__dirname + '/..');

//
//= Process CLI input

program.version(package.version)
    .usage('spactacle [options] <specfile>')
    .description(package.description)
    .option('-A, --skip-assets', 'omit CSS and JavaScript generation (default: false)', Boolean, false)
    .option('-e, --embeddable', 'omit the HTML <body/> and generate the documentation content only (default: false)')
    .option('-d, --development-mode', 'start HTTP server with the file watcher and live reload (default: false)')
    .option('-s, --start-server', 'start the HTTP server without any development features')
    .option('-p, --port <dir>', 'the port number for the HTTP server to listen on (default: 4400)', Number, 4400)
    .option('-t, --target-dir <dir>', 'the target build directory (default: ./public)', String, './public')
    .option('-a, --app-dir <dir>', 'the application source directory (default: ./app)', String, './app')
    // .option('-f, --spec-file <file>', 'the input OpenAPI/Swagger spec file (default: test/fixtures/petstore.json)', String, 'test/fixtures/petstore.json')
    // .option('-c, --config-file <file>', 'Specify a custom configuration file (default: config.json)')
    // .option('-c, --cache-dir <dir>', 'the intermediate cache directory (default: ./.cache)', String, './.cache')
    .parse(process.argv);

// Show help if no specfile or options are specified
if (program.args.length <= 1 || program.rawArgs.length <= 1) {
    program.help();
}

//
//= Load the specification and set variables

var specFile = program.args[0],
    schema = require(path.resolve(specFile)),
    templateData = require(path.resolve(program.appDir + '/lib/preprocessor'))(schema);

//
//= Setup Grunt for the heavy lifting

grunt.initConfig({
    pkg: package,
    // jshint: {
    //     all: [program.appDir + '/**/*.js']
    // },
    compass: {
        dist: {
            options: {
                sassDir: program.appDir + '/stylesheets',
                cssDir: program.cacheDir + '/stylesheets',
                environment: 'development',
                outputStyle: 'compressed',
                importPath: [
                    path.resolve(__dirname, '..', 'node_modules', 'foundation-sites', 'scss')
                ]
            }
        }
    },
    concat: {
        js: {
            src: [program.appDir + '/javascripts/**/*.js', '!' + program.appDir + '/javascripts/jquery*.js'],
            dest: program.targetDir + '/javascripts/main.js',
        },
        css: {
            src: [program.cacheDir + '/stylesheets/*.css'],
            dest: program.targetDir + '/stylesheets/main.css',
        }
    },
    uglify: {
        build: {
            src: program.targetDir + '/javascripts/main.js',
            dest: program.targetDir + '/javascripts/main.min.js'
        }
    },
    cssmin: {
        minify: {
            expand: true,
            cwd: program.targetDir + '/stylesheets',
            src: ['*.css', '!*.min.css'],
            dest: program.targetDir + '/stylesheets',
            ext: '.min.css'
        }
    },
    // handlebars: {
    //     compile: {
    //         files: {
    //            program.cacheDir + '/hbs/templates.js': [program.appDir + '/views/**/*.hbs']
    //         }
    //     },
    //     options: {
    //         namespace: 'Spectacle.templates',
    //         partialsUseNamespace: true,
    //         processName: function(filePath) {
    //             var parts = filePath.split('/'),
    //                 target = parts[parts.length - 1];
    //             return target.split('.')[0];
    //         }
    //     }
    // },
    'compile-handlebars': {
        compile: {
            files: [{
                src: program.appDir + '/views/' + (program.embeddable ? 'minimal.hbs' : 'main.hbs'),
                dest: program.cacheDir + '/index.html'
            }],
            templateData: templateData,
            helpers: program.appDir + '/helpers/*.js',
            partials: program.appDir + '/views/partials/**/*.hbs'
        },
    },
    clean: {
        cache: [program.cacheDir],
        assets: [program.targetDir + '/**/*.css', program.targetDir + '/**/*.js'],
        html: [program.cacheDir + '/**/*.html', program.targetDir + '/**/*.html']
    },
    connect: {
        server: {
            options: {
                hostname: '*',
                port: program.port,
                base: program.targetDir,
                livereload: true
            }
        }
    },
    watch: {
        options: {
            livereload: true
        },
        js: {
            files: [program.appDir + '/javascripts/**/*.js'],
            tasks: ['javascripts']
        },
        css: {
            files: [program.appDir + '/stylesheets/**/*.scss'],
            tasks: ['stylesheets']
        },
        templates: {
            files: [
              program.appDir + '/views/**/*.hbs',
              program.appDir + '/helpers/**/*.js',
              program.appDir + '/lib/**/*.js'
            ],
            tasks: ['templates']
        }
    }
});

grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-compass');
grunt.loadNpmTasks('grunt-contrib-cssmin');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-contrib-connect');
grunt.loadNpmTasks('grunt-compile-handlebars');

grunt.registerTask('predentation', 'Remove indentation from generated <pre> tags.', function() {
  fs.createReadStream(program.cacheDir + '/index.html')
    .pipe(predentation())
    .pipe(fs.createWriteStream(program.targetDir + '/index.html'));
});

grunt.registerTask('stylesheets', ['compass', 'concat:css', 'cssmin']);
grunt.registerTask('javascripts', ['concat:js', 'uglify']);
grunt.registerTask('templates', ['clean:html', 'compile-handlebars', 'predentation']); //, 'handlebars'
grunt.registerTask('default', ['stylesheets', 'javascripts', 'templates']);
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

if (program.startServer) {
    grunt.task.run('server');
}
else {
  if (!program.skipAssets) {
      grunt.task.run(['stylesheets', 'javascripts']);
  }
  grunt.task.run('templates');
  if (program.developmentMode) {
      grunt.task.run('develop');
  }
}

grunt.task.start();
