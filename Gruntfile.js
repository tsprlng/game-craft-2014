module.exports = function (grunt) {

  // autoload grunt modules
  require('load-grunt-tasks')(grunt);

  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bower: { install: {} },
    project: {
      app: 'game',
      dist: 'dist'
    },

    watch: {
      js: {
        files: ['<%= project.app %>/js/{,*/}*.js'],
        tasks: ['jshint:all'],
        options: {
          // livereload: true
        }
      },
      gruntfile: {
        files: ['Gruntfile.js'],
        tasks: ['generateenv']
      }
      // livereload: {
      //   options: {
      //     livereload: '<%= connect.options.livereload %>'
      //   },
      //   files: [
      //     '<%= project.app %>/{,*/}*.html',
      //     '<%= project.app %>/css/{,*/}*.css',
      //     '<%= project.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
      //   ]
      // }
    },
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= project.dist %>/*',
            '!<%= project.dist %>/.git*'
          ]
        }]
      },
      server: '.tmp'
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        'Gruntfile.js',
        '<%= project.app %>/js/{,*/}*.js'
      ],
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/{,*/}*.js']
      }
    },
    connect: {
      options: {
        port: grunt.option('port') || 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: 'localhost',
        // livereload: 35729,
        middleware: function (connect, options) {
          return [
            connect.static(options.base)
          ];
        }
      },
      livereload: {
        options: {
          open: true,
          base: '<%= project.app %>'
        }
      },
      dist: {
        options: {
          base: '<%= project.dist %>'
        }
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= project.app %>',
          dest: '<%= project.dist %>',
          src: [
            '*.{ico,png,txt}',
            '*.html',
            'views/{,*/}*.html',
            'partials/{,*/}*.html',
            'images/{,*/}*.{webp}',
            'fonts/*'
          ]
        },
        {
          expand: true,
          cwd: '<%= project.app %>/images',
          dest: '<%= project.dist %>/images',
          src: ['**/*']
        }]
      },
      styles: {
        expand: true,
        cwd: '<%= project.app %>/css',
        dest: '.tmp/css/',
        src: '{,*/}*.css'
      }
    },
  });


  // grunt.registerTask('build', [
  //   'clean:dist',
  //   'generateenv',
  //   'bower:install',
  //   'useminPrepare',
  //   //'sass',
  //   'concat',
  //   'ngmin',
  //   'copy:dist',
  //   'cssmin',
  //   'uglify',
  //   'filerev',
  //   'usemin',
  //   'htmlmin'
  // ]);

  grunt.registerTask('server', function (target) {
    grunt.task.run([
      // 'bower:install',
      'connect:livereload',
      'watch'
    ]);
  });
};
