/**
 * @file 资源树
 * @author musicode
 */

var fs = require('fs');

var walker = require('./lib/walker');
var Node = require('./lib/Node');
var util = require('./lib/util');

/**
 * 依赖表（一个资源依赖哪些资源）
 *
 * @inner
 * @type {Object}
 */
var dependencyMap = { };

/**
 * 反向依赖表（一个资源被哪些资源依赖）
 *
 * @inner
 * @type {Object}
 */
var reverseDependencyMap = { };

/**
 * 分析入口文件，可以是一个或多个
 *
 * @param {Object} files
 * @return {Object}
 */
exports.parse = function (files, amdConfig) {

    var process = function (file) {

        var node = Node.create(file);
        dependencyMap[ file ] = node;

        var dependencies = walker.walkDependencies(node, amdConfig);
        dependencies.forEach(
            function (dependency) {

                var absolute = dependency.absolute;
                if (!fs.existsSync(absolute)) {
                    return;
                }

                var child = process(absolute);
                node.addChild(child);

                var parents = reverseDependencyMap[ absolute ];
                if (!Array.isArray(parents)) {
                    parents = reverseDependencyMap[ absolute ] = [ ];
                }

                var exists = false;

                parents.forEach(
                    function (node) {
                        if (node.file === absolute) {
                            exists = true;
                            return false;
                        }
                    }
                );

                if (!exists) {
                    parents.push(node);
                }



            }
        );

        return node;

    };

    if (!Array.isArray(files)) {
        files = [ files ];
    }

    files.forEach(
        function (file) {
            process(file);
        }
    );

    util.writeJSON(__dirname + '/dependencyMap.json', dependencyMap);
    util.writeJSON(__dirname + '/reverseDependencyMap.json', reverseDependencyMap);

};

exports.parse(
    '/Users/zhujl/github/marketing/couponAdd.html',
    {
        baseUrl: '/Users/zhujl/github/marketing/src',
        packages: [
            {
                name: 'cc',
                location: '../dep/cc/1.0.0/src',
                main: 'main'
            },
            {
                name: 'moment',
                location: '../dep/moment/2.10.6/src',
                main: 'moment'
            }
        ]
    }
);

