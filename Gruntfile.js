'use strict';

module.exports = function (grunt) {
  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    requirejs: {
      compile: {
        options: {
          baseUrl: "src",
          mainConfigFile: "src/config.js",
          name: "bacon.validation",
          out: "dist/bacon.validation.js",
          optimize: "none",
          include: "bacon.validation",
          exclude: ["lodash", "bacon", "jquery"]
        }
      }
    }
  });

  grunt.registerTask('default', ["requirejs"]);
};