yox.data.source = function(){};
yox.data.sources = {}; // Will hold the transition types

yox.data.source.prototype = {
    load: function(source, callback){ throw new Error("'load' function isn't implemented for this data source."); },
    match: function(source){ throw new Error("'match' function isn't implemented for this data source."); }
};