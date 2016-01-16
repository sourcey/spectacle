module.exports = function(grunt, options, spec) {
  return {

      // Compile SCSS source files into the cache directory
      compass: {
          dist: {
              options: {
                  sassDir: options.appDir + '/stylesheets',
                  cssDir: options.cacheDir + '/stylesheets',
                  environment: 'development',
                  // outputStyle: 'compressed',
                  importPath: [
                      'node_modules/foundation-sites/scss'
                  ]
              }
          }
      },

      concat: {

          // Concentrate source JS files from the directory into the traget directory
          js: {
              src: [options.appDir + '/javascripts/**/*.js', '!' + options.appDir + '/javascripts/jquery*.js'],
              dest: options.targetDir + '/javascripts/spectacle.js',
          },

          // Concentrate compiled CSS files into the traget directory
          css: {
              src: [options.cacheDir + '/stylesheets/*.css'],
              dest: options.targetDir + '/stylesheets/spectacle.css',
          }
      },

      // Minify compiled JS files in the traget directory
      uglify: {
          build: {
              src: options.targetDir + '/javascripts/spectacle.js',
              dest: options.targetDir + '/javascripts/spectacle.min.js'
          }
      },

      // Minify compiled CSS files in the traget directory
      cssmin: {
          minify: {
              expand: true,
              cwd: options.targetDir + '/stylesheets',
              src: ['*.css', '!*.min.css'],
              dest: options.targetDir + '/stylesheets',
              ext: '.min.css'
          }
      },

      // Compile the Handlebars templates as HTML into the target directory
      'compile-handlebars': {
          compile: {
              files: [{
                  src: options.appDir + '/views/' + (options.embeddable ? 'minimal.hbs' : 'main.hbs'),
                  dest: options.cacheDir + '/' + options.targetFile
              }],
              templateData: spec,
              helpers: options.appDir + '/helpers/*.js',
              partials: options.appDir + '/views/partials/**/*.hbs'
          },
      },

      // Cleanup cache and traget files
      clean: {
          cache: [options.cacheDir],
          assets: [options.targetDir + '/stylesheets/**/*.css', options.targetDir + '/javascripts/**/*.js'],
          html: [options.cacheDir + '/**/*.html', options.targetDir + '/**/*.html']
      },

      // Raise a HTTP server for previewing generated docs
      connect: {
          server: {
              options: {
                  hostname: '*',
                  port: options.port,
                  base: options.targetDir,
                  livereload: true
              }
          }
      },

      // Watch the filesystem and regenerate docs if sources change
      watch: {
          options: {
              livereload: true
          },
          js: {
              files: [options.appDir + '/javascripts/**/*.js'],
              // tasks: ['javascripts']
          },
          css: {
              files: [options.appDir + '/stylesheets/**/*.scss'],
              // tasks: ['stylesheets']
          },
          templates: {
              files: [
                options.appDir + '/views/**/*.hbs',
                options.appDir + '/helpers/**/*.js',
                options.appDir + '/lib/**/*.js'
              ],
              // tasks: ['templates']
          }
      }
  }
}
