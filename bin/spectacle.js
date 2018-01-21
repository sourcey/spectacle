#!/usr/bin/env node

var program = require('commander'),
    package = require('../package'),
    spectacle = require('../index.js')

//
//= Process CLI input

program.version(package.version)
    .usage('[options] <specfile>')
    .description(package.description)
    .option('-C, --disable-css', 'omit CSS generation (default: false)')
    .option('-J, --disable-js', 'omit JavaScript generation (default: false)')
    .option('-e, --embeddable', 'omit the HTML <body/> and generate the documentation content only (default: false)')
    .option('-d, --development-mode', 'start HTTP server with the file watcher and live reload (default: false)')
    .option('-s, --start-server', 'start the HTTP server without any development features')
    .option('-p, --port <dir>', 'the port number for the HTTP server to listen on (default: 4400)', Number)
    .option('-t, --target-dir <dir>', 'the target build directory (default: public)', String)
    .option('-f, --target-file <file>', 'the target build HTML file (default: index.html)', String)
    .option('-a, --app-dir <dir>', 'the application source directory (default: app)', String)
    .option('-l, --logo-file <file>', 'specify a custom logo file (default: null)', String, null)
    .option('-u, --logo-url <file>', 'specify a custom logo url (default: null)', String, null)
    .option('-c, --config-file <file>', 'specify a custom configuration file (default: app/lib/config.js)')
    // .option('-f, --spec-file <file>', 'the input OpenAPI/Swagger spec file (default: test/fixtures/petstore.json)', String, 'test/fixtures/petstore.json')
    .parse(process.argv)

// Show help if no specfile or options are specified
if (program.args.length < 1) { // && program.rawArgs.length < 1
    program.help()
}

program.specFile = program.args[0]; // || path.resolve(root, 'test/fixtures/cheese.json')

// Run the main app with parsed options
spectacle(program)
