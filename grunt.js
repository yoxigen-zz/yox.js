/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: '<json:package.json>',
        meta: {
            banner: '/*\n* <%= pkg.title || pkg.name %>\n' +
                    '* <%= pkg.description %>\n' +
                    '* <%= pkg.homepage %>\n' +
                    '*\n* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>\n*\n' +
                    '* License: <%= _.pluck(pkg.licenses, "type").join(", ") %> license\n' +
                    '* Date: <%= grunt.template.today("yyyy-mm-dd") %> \n*/'
        },
        concat: {
            dist: {
                src: [
                    '<banner:meta.banner>',
                    'src/polyfills/*.js',
                    'src/yox.js',
                    'src/yox.utils.js',
                    'src/yox.eventsHandler.js',
                    'src/modules/data/yox.data.js',
                    'src/modules/data/yox.data.item.js',
                    'src/modules/data/sources/yox.data.source.js',
                    'src/modules/data/sources/yox.data.source.<%= pkg.yox.dataSource %>.js',
                    'src/modules/statistics/yox.statistics.js',
                    'src/modules/statistics/reporters/yox.statistics.reporter.js',
                    'src/modules/statistics/reporters/yox.statistics.reporter.<%= pkg.yox.reporter %>.js',
                    'src/modules/thumbnails/*.js',
                    'src/modules/controller/*.js',
                    'src/modules/view/yox.view.js',
                    'src/modules/view/yox.view.cache.js',
                    'src/modules/view/transitions/yox.view.transition.js',
                    'src/modules/view/transitions/yox.view.transition.<%= pkg.yox.transition %>.js',
                    'src/themes/yox.theme.js',
                    'src/themes/switcher/*.js',
                    'src/themes/wall/*.js'
                ],
                dest: 'dist/<%= pkg.name %>.<%= pkg.yox.theme %>.js'
            },
            css: {
                src: [
                    "src/modules/view/yoxview.css",
                    "src/themes/wall/*.css",
                    "src/themes/switcher/*.css"
                ],
                dest: "dist/<%= pkg.name %>.<%= pkg.yox.theme %>.css"
            }
        },
        min: {
            dist: {
                src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest: 'dist/<%= pkg.name %>.<%= pkg.yox.theme %>.min.js'
            }
        },
        uglify: {}
    });

    // Default task.
    grunt.registerTask('default', 'concat min');

};
