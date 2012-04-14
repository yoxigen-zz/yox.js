yox.statistics.reporter = function(name){ this.name = name; };
yox.statistics.reporters = {};

yox.statistics.reporter.prototype = {
    report: function(data){ throw new Error("'report' method isn't implemented yet for this reporter type."); }
};