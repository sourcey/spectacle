# Spectacle

[Spectacle](http://sourcey.com/spectacle) is a static documentation generator that lets you autogenerate your documentation from a OpenAPI/Swagger 2.0 JSON specification file. With Spectacle you can have beautiful HTML5 documentation for your API ready to be deployed in a matter of minutes.

Here's what Spectacle features:

* OpenAPI/Swagger 2.0 support
* Mobile friendly responsive HTML5 and CSS3 grid layout
* Modern and readable design
* Embedded option to generate docs without a layout for convenient integration with your own website
* Development mode with file watcher and live reload for regenerating docs when your spec is updated
* Simple and extendable Handlebars templates and SCSS styles

## Getting Started

Simply install Spectacle from `npm` like so:

```bash
npm install spectacle-docs
```

Next pass your `swagger.json` document use the CLI to generate your documentation.

```bash
spectacle your_swagger_api.json
```

Your documentation will be located in the `/public` directory. You can either copy the generated HTML to your web server, or view your docs by starting the internal web server like so:

```bash
spectacle -s
```

Now point your browser to [http://localhost:4400/](http://localhost:4400/) in order to view your docs.

## Configuration Options

The basic CLI options are detailed below:

```bash
$ spectacle -h

  Usage: cli spactacle [options] <specfile>

  Options:

    -h, --help              output usage information
    -V, --version           output the version number
    -A, --skip-assets       omit CSS and JavaScript generation (default: false)
    -e, --embeddable        omit the HTML <body/> and generate the documentation content only (default: false)
    -d, --development-mode  start HTTP server with the file watcher and live reload (default: false)
    -s, --start-server      start the HTTP server without any development features
    -p, --port <dir>        the port number for the HTTP server to listen on (default: 4400)
    -a, --app-dir <dir>     the application source directory (default: ./app)
    -t, --target-dir <dir>  the target build directory (default: ./public)
```

Most options are self explanatory, but the following options warrant some further explanation:

* **--development-mode**: This option starts a development server with a file watcher and live reload, and will automatically regenerate your docs when any of your spec or app files change.

* **--start-server **: This option starts a production server without any development options enabled that serves the contents of your `--target-dir`.

* **--embeddable**: This option lets you build a minimal version of the documentation without the HTML `<body>` tags, so you can embed Spectacle into your own website template. More info on [custom builds](#custom-builds) here.

* **--app-dir**: This option overrides the default directory which contains all the Handlebars templates, SCSS, and JavaScript source files. This option is useful for development because you can copy the contents of `app` to a remote location or a separate repo for custom builds.

* **--target-dir**: This option specifies where the generated documentation HTML files will be output.

## Custom Builds

The best option for building your own custom functionality into Spectacle is to [fork Spectacle on GitHub](https://help.github.com/articles/fork-a-repo/), and make your own modifications in source. This way you can keep up to date by merging changes from the `master` branch, and your can also contribute your updates back to `master` by creating a [Pull Request](https://help.github.com/articles/creating-a-pull-request/) if you think they improve Spectacle somehow.

To fork Spectacle go to `https://github.com/sourcey/spectacle`, and press the 'Fork' button. Now you can `git clone git@github.com:<yourname>/spectacle.git` to make your own changes.

Alternatively, you can just copy the contents of `app` from the main repo which contains all the source files such as templates, stylesheets and JavaScripts. Now just pass the path to your custom `app` path to the CLI like so: `spectacle -a /path/to/your/app your_swagger_api.json`

Good luck and enjoy Spectacle!
