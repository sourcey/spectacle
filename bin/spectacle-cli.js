#!/usr/bin/env node

var program = require('commander'),
    grunt = require('grunt'),
    fs = require('fs'),
    path = require('path'),
    predentation = require('predentation'),
    package = require('../package'),
    _ = require('lodash');

// Set CWD to root dir
process.chdir(__dirname + '/..');

//
//= Process CLI input

program.version(package.version)
    .usage('spactacle [options] <specfile>')
    .description(package.description)
    .option('-C, --disable-css', 'omit CSS generation (default: false)')
    .option('-J, --disable-js', 'omit JavaScript generation (default: false)')
    .option('-e, --embeddable', 'omit the HTML <body/> and generate the documentation content only (default: false)')
    .option('-d, --development-mode', 'start HTTP server with the file watcher and live reload (default: false)')
    .option('-s, --start-server', 'start the HTTP server without any development features')
    .option('-p, --port <dir>', 'the port number for the HTTP server to listen on (default: 4400)', Number, 4400)
    .option('-t, --target-dir <dir>', 'the target build directory (default: ./public)', String, './public')
    .option('-f, --target-file <file>', 'the target build HTML file (default: index.html)', String, 'index.html')
    .option('-a, --app-dir <dir>', 'the application source directory (default: ./app)', String, './app')
    .option('-i, --cache-dir <dir>', 'the intermediate build cache directory (default: ./.cache)', String, './.cache')
    .option('-l, --logo-file <file>', 'specify a custom logo file (default: null)', String, null)
    .option('-c, --config-file <file>', 'specify a custom configuration file (default: ./app/lib/config.js)', String, './app/lib/config.js')
    // .option('-f, --spec-file <file>', 'the input OpenAPI/Swagger spec file (default: test/fixtures/petstore.json)', String, 'test/fixtures/petstore.json')
    .parse(process.argv);

// Show help if no specfile or options are specified
if (program.args.length < 1 && program.rawArgs.length < 1) {
    program.help();
}

// Set the specFile option for passing to the `config.js` file
program.specFile = program.args[0] || 'test/fixtures/cheese.json';

//
//= Load the specification and set variables

var specData = require(path.resolve(program.specFile)),
    specTemplate = require(path.resolve(program.appDir + '/lib/preprocessor'))(specData),
    config = require(path.resolve(program.configFile))(grunt, program, specTemplate);

//
//= Setup Grunt to do the heavy lifting

grunt.initConfig(_.merge({ pkg: package }, config));

grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-compass');
grunt.loadNpmTasks('grunt-contrib-cssmin');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-contrib-connect');
grunt.loadNpmTasks('grunt-compile-handlebars');

grunt.registerTask('predentation', 'Remove indentation from generated <pre> tags.', function() {
  var html = fs.readFileSync(program.cacheDir + '/' + program.targetFile, 'utf8');
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
  fs.writeFileSync(program.targetDir + '/' + program.targetFile, html);
});

grunt.registerTask('stylesheets', ['compass:scss', 'concat:css', 'cssmin']);
grunt.registerTask('javascripts', ['concat:js', 'uglify']);
grunt.registerTask('templates', ['clean:html', 'compile-handlebars', 'predentation']);
grunt.registerTask('foundation', ['compass:foundation_scss', 'concat:foundation_css']); // 'concat:foundation_js'
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

if (program.startServer) {
    grunt.task.run('server');
}
else {
  if (!program.disableCss) {
      grunt.task.run(['stylesheets', 'foundation']);
  }
  if (!program.disableJs) {
      grunt.task.run('javascripts');
  }
  grunt.task.run('templates');
  if (program.developmentMode) {
      grunt.task.run('develop');
  }
}

grunt.task.start();
