# resource-tree

## 节点用法

```javascript
var node = Node.create('filePath');
node.walk({
    // 是否递归遍历
    recursive: true,
    // 扩展 html 中的依赖提取规则
    htmlRules: [
        {
            pattern: //g,
            match: function (result, file, amdConfig) {
                var terms = result.split(/['"]/);
                if (terms.length === 3) {
                    return terms[1];
                }
            }
        }
    ],
    // 扩展 css 中的依赖提取规则
    cssRules: [
        {
            pattern: //g,
            match: function (result, file, amdConfig) {
                var terms = result.split(/['"]/);
                if (terms.length === 3) {
                    return terms[1];
                }
            }
        }
    ],
    // AMD require config 配置
    amdConfig: {
        baseUrl: '',
        paths: {

        },
        packages: [

        ]
    },
    // 处理每一个依赖
    processDependency: function (dependency, node) {

        // 对于不合法的依赖，需要进行过滤
        // 过滤是通过 return 实现的，即不 return 或 return null 表示过滤

        // 纠正依赖的路径通过改写 dependency.raw 实现
        // 如果是 amd 插件，会传入 dependency.plugin，可改写该属性
        // 例如，对于一个模板文件，如果希望打包成 amd 模块，可分为两步：
        // 1. 把 dependency.raw 改写成符合 amd 命名规则的名字
        // 2. 把 dependency.plugin 改写为 ''


    }
});
```

var projectDir = '/Users/zhujl/github/marketing';

exports.parse({
    files: [
        projectDir + '/couponAdd.html'
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