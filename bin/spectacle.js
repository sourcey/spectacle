#!/usr/bin/env node

var program = require('commander'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    package = require('../package'),
    spectacle = require('../index.js');

var cwd = process.cwd(),
    root = path.resolve(__dirname, '..');

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
    .option('-t, --target-dir <dir>', 'the target build directory (default: public)', String, path.resolve(cwd, 'public'))
    .option('-f, --target-file <file>', 'the target build HTML file (default: index.html)', String, 'index.html')
    .option('-a, --app-dir <dir>', 'the application source directory (default: app)', String, path.resolve(root, 'app'))
    .option('-l, --logo-file <file>', 'specify a custom logo file (default: null)', String, null)
    .option('-c, --config-file <file>', 'specify a custom configuration file (default: app/lib/config.js)', String, path.resolve(root, 'app/lib/config.js'))
    // .option('-f, --spec-file <file>', 'the input OpenAPI/Swagger spec file (default: test/fixtures/petstore.json)', String, 'test/fixtures/petstore.json')
    .parse(process.argv);

// Show help if no specfile or options are specified
if (program.args.length < 1) { // && program.rawArgs.length < 1
    program.help();
}

// Set some necessary defaults
program.cacheDir = os.tmpdir() + '/.spectacle';
program.specFile = program.args[0]; // || path.resolve(root, 'test/fixtures/cheese.json');

// Run the main app with parsed options
spectacle(program);
