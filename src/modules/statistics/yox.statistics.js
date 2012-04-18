/**
 * Statistics module, used for saving or sending usage data.
 * Data is send through reporter sub-modules, each of which has a single method, 'report'.
 *
 * @constructor
 * @param container
 * @param options
 */
yox.statistics = function(container, options){
    if (arguments.length === 1){
        options = container;
        container = null;
    }

    this.reporter = new yox.statistics.reporters[options.reporter || yox.statistics.defaults.reporter](options);
    this.category = options.category || "yox.js";

    var eventsHandler = options.eventsHandler || new yox.eventsHandler();
    $.extend(this, eventsHandler);

    if (options.events){
        for(var eventName in options.events)
            this.addEventListener(eventName, options.events[eventName]);
    }
};
yox.statistics.prototype = {
    /**
     * Sends data through a reporter.
     * @param data
     */
    report: function(data){
        data.category = data.category || this.category;
        this.reporter.report(data);
    }
};

yox.statistics.defaults = {
    reporter: "ga"
};
