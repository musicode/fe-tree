/**
 * @file 资源节点
 * @author musicode
 */

var path = require('path');
var util = require('./util');

/**
 * 构造函数
 *
 * @param {string} file
 */
function Node(file) {
    this.file = file;
    this.content = util.readFile(file);
    this.children = [ ];
}

var proto = Node.prototype;

/**
 * 获得文件的扩展名，格式为 `.name`
 *
 * @return {string}
 */
proto.getExtname = function () {
    return path.extname(this.file);
};

/**
 * 添加子节点
 *
 * @param {Node} node
 */
proto.addChild = function (node) {
    this.children.push(node);
};

/**
 * 通过扩展名筛选子节点
 *
 * @param {string} extname
 * @return {Array.<Node>}
 */
proto.getChildrenByExtname = function (extname) {

    var result = [ ];

    extname = extname.toLowerCase();

    this.children.forEach(
        function (node) {
            if (extname === node.getExtname().toLowerCase()) {
                result.push(node);
            }
        }
    );

    return result;

};

var nodeCache = { };

Node.create = function (file) {
    if (!nodeCache[file]) {
        nodeCache[file] = new Node(file);
    }
    return nodeCache[file];
};

module.exports = Node;


