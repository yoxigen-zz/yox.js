yox.statistics.reporters.ga = function(options){
    if (!_gaq)
        throw new Error("Can't initialize Google Analytics reporter, Google Analytics isn't loaded.");

    this.report = function(data){
        _gaq.push(['_trackEvent', data.category || options.category, data.action, data.label, data.value]);
    }
};

yox.statistics.reporters.ga.prototype = new yox.statistics.reporter("ga");