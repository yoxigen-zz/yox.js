yox.data.prototype.addDataSource((function(){
    var dataSourceName = "files",
        createObjectURL;

    if (window.URL && window.URL.createObjectURL)
        createObjectURL = function(file){ return window.URL.createObjectURL(file); };
    else if (window.webkitURL && window.webkitURL.createObjectURL){
        createObjectURL = function(file){
            return window.webkitURL.createObjectURL(file);
        }
    }
    else
        createObjectURL = function(file){ return null; }

    return {
        name: dataSourceName,
        match: function(source){
            return false;
        },
        load: function(source, callback){
            var items = [];
            for(var i=0, file; file = source.files[i]; i++){
                if (/^image\//.test(file.type)){
                    var url = createObjectURL(file);
                    items.push({
                        url: url,
                        type: "image",
                        title: file.name || file.fileName,
                        thumbnail: {
                            src: url
                        }
                    });
                }
            }

            var data = {
                items: items,
                source: source,
                sourceType: dataSourceName,
                createThumbnails: true
            };

            if (callback)
                callback(data);
        }
    };
})());