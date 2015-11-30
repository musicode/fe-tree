/**
 * @file 资源树
 * @author musicode
 */

var path = require('path');

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
 * 把两个 map 转成可输出的格式
 *
 * @param {Object|Array} obj
 * @return {Object|Array}
 */
function toJSON(obj) {
    var result = Array.isArray(obj) ? [ ] : { };
    util.each(
        obj,
        function (value, key) {
            if (value instanceof Node) {
                value = value.toJSON();
            }
            else if (Array.isArray(value)) {
                value = toJSON(value);
            }
            result[ key ] = value;
        }
    );
    return result;
}

/**
 * 分析入口文件，生成正反两棵依赖树
 *
 * @param {Object} options
 * @property {Array} options.files 入口文件
 * @property {Array=} options.htmlRules 分析 html 文件的扩展规则
 * @property {Array=} options.cssRules 分析 css 文件的扩展规则
 * @property {Object} options.amdConfig AMD require.config 配置
 * @property {Function} options.processDependency 处理依赖的函数。方法签名是(dependency, file)
 */
exports.parse = function (options) {

    var files = options.files;

    var htmlRules = options.htmlRules;
    var cssRules = options.cssRules;
    var amdConfig = options.amdConfig;

    var processFile = function (file) {

        if (dependencyMap[ file ]) {
            return;
        }

        var node = Node.create(file);
        dependencyMap[ file ] = node;

        node.walk({
            htmlRules: htmlRules,
            cssRules: cssRules,
            amdConfig: amdConfig,
            processDependency: function (dependency, node) {

                if (options.processDependency(dependency, node)
                    && dependency.file !== node.file
                ) {
                    var file = dependency.file;

                    var child = processFile(file);
                    if (!child) {
                        return;
                    }

                    node.addChild(child);

                    var parents = reverseDependencyMap[ file ];
                    if (!Array.isArray(parents)) {
                        parents = reverseDependencyMap[ file ] = [ ];
                    }

                    if (parents.indexOf(node.file) < 0) {
                        parents.push(node.file);
                    }
                }

            }
        });

        return node;

    };

    if (!Array.isArray(files)) {
        files = [ files ];
    }

    files.forEach(processFile);

    util.writeJSON(__dirname + '/dependencyMap.json', toJSON(dependencyMap));
    util.writeJSON(__dirname + '/reverseDependencyMap.json', toJSON(reverseDependencyMap));

};


var projectDir = '/Users/zhujl/github/marketing';

exports.parse({
    files: [
        projectDir + '/couponAdd.html',
        projectDir + '/couponDetail.html',
        projectDir + '/couponGrant.html',
        projectDir + '/couponList.html',
        projectDir + '/couponSend.html',
    ],
    amdConfig: {
        baseUrl: projectDir + '/src',
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
    },
    processDependency: function (dependency, node) {

        var raw = dependency.raw;

        // 过滤依赖
        if (/[{}$]/.test(raw)) {
            return;
        }

        // 纠正依赖路径
        if (!dependency.amd) {

            var prefix = {
                'src': projectDir + '/',
                'dep': projectDir + '/',
                '/src': projectDir,
                '/dep': projectDir,
                'common': projectDir + '/src/'
            };

            util.each(
                prefix,
                function (value, key) {
                    if (raw.startsWith(key)) {
                        dependency.file = value + raw;
                        return;
                    }
                }
            );

            if (!dependency.file && /^(\.\/|[^./])/.test(raw)) {
                dependency.file = path.join(node.file, '..', raw);
            }

        }

        console.log(node.file);
        console.log(dependency);
        console.log('-----------------------------------')

        var moduleExclude = {
            jquery: 1,
            text: 1,
            tpl: 1,
            css: 1,
            js: 1
        };

        var rawExclude = {
            require: 1,
            exports: 1,
            module: 1
        };

        if (!moduleExclude[dependency.module]
            && !rawExclude[dependency.raw]
        ) {
            return dependency;
        }

    }
});


