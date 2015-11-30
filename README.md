# resource-tree

使用方式

```javascript
var node = new Node('file');
node.walk({
    recursive: true,
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
    amdConfig: {
        baseUrl: '',
        packages: [

        ]
    },

});
```

