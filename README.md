# Spectacle

Spectacle helps you "save time and look good" by automatically generating beautiful HTML5 documentation from your OpenAPI/Swagger 2.0 API specification.

## Features:

* **No more out-of-date documentation**: With Spectacle you don't need to worry about out of date documentation any more. All you need is a well written spec and Spectacle to autogenerate your documentation each time it changes. Check out [Optimizing Your Workflow](#optimizing-your-workflow)
* **OpenAPI/Swagger 2.0 support**: Support for the latest OpenAPI/Swagger specification which is the new standard for documenting REST APIs.
* **Clean responsive design**: Spectacle features a responsive HTML5 and CSS3 grid layout built with [Foundation 6](http://foundation.zurb.com/sites.html) that works beautifully across all devices.
* **Embed into your existing website**: Spectacle features an embedded option that lets you generate docs without a HTML `<body>` layout for convenient integration into your existing website.
* **Live preview developer mode**: Spectacle comes with a development mode that starts a local HTTP server with a file watcher and live reload so you can preview changes to your live documentation in your browser as you write your spec.
* **Configurable templates and styles**: Nobody wants to be boxed in, which is Spectacle comes with easily configurable Handlebars templates and SCSS styles so you can add your own flavor. See [Custom Builds](#custom-builds)

## Getting Started

Simply install Spectacle from `npm` like so:

```bash
npm install spectacle-docs
```

Next pass your `swagger.json` document use the CLI to generate your documentation.

```bash
spectacle your_swagger_api.json

# Or use the petstore.json example
# spectacle test/fixtures/petstore.json
```

Your generated documentation will be located in the `/public` directory. You can either copy the generated HTML to your web server, or view your docs by starting the internal web server like so:

```bash
spectacle -s
```

Now point your browser to [http://localhost:4400/](http://localhost:4400/) and presto - sexy docs for your API!

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

* **--development-mode** `-d`: This option starts a development server with a file watcher and live reload, and will automatically regenerate your docs when any of your spec or app files change.

* **--start-server** `-s`: This option starts a production server without any development options enabled that serves the contents of your `--target-dir`.

* **--embeddable** `-e`: This option lets you build a minimal version of the documentation without the HTML `<body>` tags, so you can embed Spectacle into your own website template. More info on [custom builds](#custom-builds) here.

* **--app-dir** `-a`: This option overrides the default directory which contains all the Handlebars templates, SCSS, and JavaScript source files. This option is useful for development because you can copy the contents of `app` to a remote location or a separate repo for custom builds.

* **--target-dir** `-t`: This option specifies where the generated documentation HTML files will be output.

## Custom Builds

The best option for building your own custom functionality into Spectacle is to [fork Spectacle on GitHub](https://help.github.com/articles/fork-a-repo/), and make your own modifications in source. This way you can keep up to date by merging changes from the `master` branch, and your can also contribute your updates back to `master` by creating a [Pull Request](https://help.github.com/articles/creating-a-pull-request/) if you think they improve Spectacle somehow.

To fork Spectacle go to `https://github.com/sourcey/spectacle`, and press the 'Fork' button. Now you can `git clone git@github.com:<yourname>/spectacle.git` to make your own changes.

Alternatively, you can just copy the contents of `app` from the main repo which contains all the source files such as templates, stylesheets and JavaScripts. Now just pass the path to your custom `app` path to the CLI like so: `spectacle -a /path/to/your/app your_swagger_api.json`

## Optimizing Your Workflow

If you're a developer you may also want to check out [inline code generators](http://swagger.io/open-source-integrations/) that build your OpenAPI/Swagger API from source code comments so you can automate your entuire workflow from `code > spec > documentation`.

## More Information

More info is available on the [Spectacle homepage](http://sourcey.com/spectacle).

Please use the [GitHub issue tracker](https://github.com/sourcey/spectacle/issues) if you have any ideas or bugs to report.

All contributions are welcome.

Good luck and enjoy Spectacle!
