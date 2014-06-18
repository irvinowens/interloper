/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        src: ['html/lib/**/*.js','html/build/**/*.js'],
        dest: 'html/js/<%= pkg.title || pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'html/js/<%= pkg.title || pkg.name %>.min.js'
      }
    },
    react: {
      dynamic_mappings : {
        files: [
         {
           expand: true,
           cwd: 'html/src',
           src: ["**/*.jsx"],
           dest: 'html/build',
           ext: '.js'
         }
        ]
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        browser: true,
        globals: {}
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['html/lib/**/*.js', 'html/test/**/*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: '<%= jshint.lib_test.src %>',
        tasks: ['jshint:lib_test', 'qunit']
      }
    },
    clean: ["html/build", "html/js"],
    copy: {
        prod: {
          files : [
                {
                   expand: true,
                   src: 'node/config.js',
                   dest: 'node/environments/',
                   rename : function(dest, src){
                       return dest + "config-old.js"
                   }
                },
                {
                  expand: true,
                  src: 'node/environments/config-prod.js',
                  dest: 'node/',
                  rename : function(dest, src){
                     return dest + "config.js"
                  }
                }
            ]
        },
        stage :{
                files : [
                    {
                       expand: true,
                       src: 'node/config.js',
                       dest: 'node/environments/',
                       rename : function(dest, src){
                           return dest + "config-old.js"
                       }
                    },
                    {
                      expand: true,
                      src: 'node/environments/config-stage.js',
                      dest: 'node/',
                      rename : function(dest, src){
                         return dest + "config.js"
                      }
                    }
                ]
        },
        dev : {
                files : [
                    {
                       expand: true,
                       cwd: './',
                       src: 'node/config.js',
                       dest: 'node/environments/',
                       rename : function(dest, src){
                         return dest + "config-old.js"
                       }
                    },
                    {
                      expand: true,
                      cwd: './',
                      src: 'node/environments/config-dev.js',
                      dest: 'node/',
                      rename : function(dest, src){
                        return dest + "config.js"
                      }
                    }
                ]
              }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-react');

  // Default task.
  grunt.registerTask('default', ['react', 'concat', 'uglify','copy:dev']);
  grunt.registerTask('prod',['react','concat','uglify','copy:prod']);
  grunt.registerTask('dev', ['react', 'concat', 'uglify','copy:dev']);
  grunt.registerTask('stage', ['react', 'concat', 'uglify','copy:stage']);
};
