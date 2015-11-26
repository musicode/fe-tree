/**
 * @file 依赖遍历器
 * @author musicode
 */

var path = require('path');
var util = require('./util');
var parseFile = require('amd-deploy/lib/parseFile');
var resolveResourceId = require('amd-deploy/lib/resolveResourceId');
var resourceIdToFilePath = require('amd-deploy/lib/resourceIdToFilePath');

/**
 * 模板中的依赖规则
 *
 * @inner
 * @type {Array}
 */
var htmlRules = [

    {
        pattern: /href=['"](?:[^'"]+\.(?:ico|css|less|styl|sass)(?:\?.+)?)['"]/gi,
        match: function (result) {
            var terms = result.split(/['"]/);
            if (terms.length === 3) {
                return terms[1];
            }
        }
    },

    {
        pattern: /src=['"][^'"]+['"]/gi,
        match: function (result) {
            var terms = result.split(/['"]/);
            if (terms.length === 3) {
                return terms[1];
            }
        }
    },

    {
        // require('xx'
        // require(['xx']
        pattern: /require\s*?\(\s*?(\[?[^{}\]]+\]?)/g,
        match: function (result, file, amdConfig) {
            return parseAmdDependencies(
                result,
                result.replace(/require\s*?\(/, ''),
                amdConfig
            );
        }
    },

];

/**
 * 样式中的依赖规则
 *
 * 对于动态样式语言，强烈建议保留以下写法：
 *
 * @import ""
 * @import ''
 * url(xxx)
 * url("xxx")
 * url('xxx')
 *
 * 这样便于正则分析，无需使用动态样式语言提供的语法分析工具（可能会很慢）
 *
 * @inner
 * @type {Array}
 */
var cssRules = [

    {
        pattern: /@import\s+['"](?:[^'")]+)['"]/gi,
        match: function (result, file) {
            var terms = result.split(/['"]/);
            if (terms.length === 3) {

                var result = terms[1];

                if (path.extname(result) === '') {
                    return {
                        extname: path.extname(file),
                        raw: result
                    };
                }
                else {
                    return result;
                }

            }
        }
    },

    {
        pattern: /url\(\s*?['"]?(?:[^'")]+)['"]?\s*?\)/gi,
        match: function (result, file) {

            var terms = result.split(/['"]/);
            var result;

            if (terms.length === 3) {
                result = terms[1];
            }
            else {
                result = result.split('(')[1].split(')')[0];

                // background: url( ../img/a.png )
                // 类似这种，两边可以有空白符，因此要 trim
                result = result.trim();
            }

            if (result) {

                if (path.extname(result) === '') {
                    return {
                        extname: path.extname(file),
                        raw: result
                    };
                }
                else {
                    return result;
                }

            }
        }

    }

];


/**
 * 解析 amd 依赖
 *
 * @inner
 * @param {string} match 文件中匹配到的原始字符串
 * @param {string} literal 从 match 中抽离出的符合 id 规则的字面量
 * @param {Object} amdConfig
 * @return {Array.<string>}
 */
function parseAmdDependencies(match, literal, amdConfig) {

    // literal 可能是 'moduleId'、'[ "module1", "module2" ]'、xxx（非法 js 变量）

    literal = literal.trim();

    var resources;

    try {
        var factory = new Function('return ' + literal);
        resources = factory();
    }
    catch (e) {

        console.log('[resource-tree error][amd id parse error]');
        console.log(match);
        console.log('');

        resources = literal;
    }

    if (!resources) {
        return;
    }

    if (!Array.isArray(resources)) {
        resources = [ resources ];
    }

    var result = [ ];

    resources.forEach(function (resourceId) {

        var filePath = resourceIdToFilePath(
            resourceId,
            amdConfig
        );

        if (filePath) {
            result.push({
                amd: true,
                raw: resourceId,
                absolute: filePath
            });
        }

    });

    return result;

}


/**
 * 获取文件对应的类型
 *
 * @inner
 * @param {string} extname
 * @return {string}
 */
function getFileType(extname) {

    var type = '';

    switch (extname.toLowerCase()) {

        case '.html':
        case '.tpl':
        case '.hbs':
        case '.ejs':
        case '.volt':
        case '.twig':
        case '.phtml':
            type = 'html';
            break;

        case '.css':
        case '.less':
        case '.styl':
        case '.sass':
            type = 'css';
            break;

        case '.js':
            type = 'js';
            break;

    }

    return type;

}


/**
 * 依赖去重
 *
 * 一个文件可能多次引用同一个文件，因此一定要去重
 *
 * @inner
 * @param {Array.<Object>} dependencies
 * @return {Array.<Object>}
 */
function uniqueDependencies(dependencies) {

    var map = { };
    var list = [ ];

    dependencies.forEach(
        function (dependency) {

            if (!map[dependency.absolute]) {
                map[dependency.absolute] = 1;
                list.push(dependency);
            }

        }
    );

    return list;

}

/**
 * 正则提取依赖
 *
 * @inner
 * @param {string} file
 * @param {string} content
 * @param {Object} amdConfig
 * @param {Array.<Object>} rules
 * @return {Array.<Object>}
 */
function getDependenciesByRules(file, content, amdConfig, rules) {

    var directory = path.dirname(file);

    var list = [ ];

    rules.forEach(function (parser, index) {

        var results = content.match(parser.pattern);

        if (results) {
            results.forEach(function (result) {

                var dependencies = parser.match(result, file, amdConfig);
                if (!dependencies) {
                    return;
                }

                if (!Array.isArray(dependencies)) {
                    dependencies = [ dependencies ];
                }

                dependencies.forEach(function (dependency) {

                    // 支持返回对象，必须包含 raw 属性
                    if (typeof dependency === 'string') {
                        dependency = {
                            raw: dependency
                        };
                    }

                    var raw = dependency.raw;
                    var absolute = dependency.absolute;

                    if (util.isAbsoluteUrl(raw)) {
                        absolute = '';
                    }
                    else if (!absolute) {
                        absolute = /^(?:\w|\.(?:\.)?)/.test(raw)
                                 ? path.join(directory, raw)
                                 : raw;
                    }

                    var extname = dependency.extname;
                    if (extname && extname.length > 1) {

                        var terms = absolute.split('.');
                        terms.pop();
                        terms.push(
                            extname.substr(1)
                        );

                        absolute = terms.join('.');

                    }

                    dependency.raw = util.cleanQuery(raw);
                    dependency.absolute = util.cleanQuery(absolute);

                    list.push(dependency);

                });

            });

        }

    });

    return list;

}



exports.walkDependencies = function (node, amdConfig) {

    var rules;

    var dependencies = [ ];

    var file = node.file;
    var content = node.content.toString();

    switch (getFileType(node.getExtname())) {

        case 'html':
            rules = util.merge(htmlRules, this.rules);
            break;

        case 'css':
            rules = util.merge(cssRules, this.rules);
            break;

        case 'js':

            if (!amdConfig || !amdConfig.baseUrl) {
                console.error('[resource-tree error]amdConfig missing.');
                return;
            }

            var amd = node.amd;
            if (!amd) {
                amd =
                node.amd =
                parseFile(file, content, amdConfig);
            }

            amd.modules.forEach(
                function (module) {
                    module.dependencies.forEach(
                        function (dependency) {

                            var id = dependency.id;

                            if (id !== 'require'
                                && id !== 'exports'
                                && id !== 'module'
                            ) {
                                dependencies.push({
                                    amd: true,
                                    raw: id,
                                    absolute: resourceIdToFilePath(
                                        resolveResourceId(id, module.id),
                                        amdConfig
                                    )
                                });
                            }

                        }
                    );
                }
            );

            break;

    }

    if (rules) {
        dependencies = getDependenciesByRules(file, content, amdConfig, rules);
    }

    return uniqueDependencies(dependencies);

};




