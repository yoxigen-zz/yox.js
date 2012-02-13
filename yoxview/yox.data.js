yoxview = {};
yox.data = function(options){
    this.$eventsElement = $("<div>");
    this.data = [];
    this.options = $.extend(true, {}, this.defaults, options);

    if (this.options.events){
        for(var eventName in this.options.events)
            this.addEventListener(eventName, this.options.events[eventName]);
    }

    this.options.source && this.addSources(this.options.source);
}

yox.data.prototype = {
    dataSources: {},
    defaults: {

    },
    namespace: "yoxdata",
    addDataSource: function(dataSource){
        if (this.dataSources[dataSource.name])
            return false;

        this.dataSources[dataSource.name] = dataSource;
    },
    addEventListener: function(eventName, eventHandler){
        this.$eventsElement.on(eventName + "." + this.namespace, $.proxy(eventHandler, self));
    },
    addSources: function(sourceArr){
        var deferredPromises = [],
            sources = sourceArr instanceof Array ? sourceArr : arguments,
            self = this;

        this.triggerEvent("loadSourcesStart", sources);

        for(var i=0; i < sources.length; i++){
            var promise = this.loadSource(sources[i]);
            if (promise)
                deferredPromises.push(promise);
        }

        $.when.apply(this, deferredPromises).done(function () {
            for(var i=0; i < arguments.length; i++)
                self.data.push(arguments[i]);

            self.triggerEvent("loadSources", arguments);
        });
    },
    clear: function(){
        this.triggerEvent("removeSources", this.data);
        this.triggerEvent("clear");
        data = [];
    },
    findDataSource: function(sourceData){
        for(var dataSourceName in this.dataSources){
            var dataSource = this.dataSources[dataSourceName];

            if (dataSource.match(sourceData))
                return dataSource;
        }
    },
    getData: function(){ return this.data; },
    getDataSource: function(dataSourceName){
        return this.dataSources[dataSourceName];
    },
    loadSource: function(source){
        var sourceIsObject = typeof(source) === "object",
            sourceUrl = sourceIsObject ? source.url : source,
            sourceOptions = sourceIsObject ? source : {},
            dataSource = source.type ? this.getDataSource(source.type) : this.findDataSource(sourceUrl),
            self = this;

        if (!dataSource)
            return;

        var dfd = $.Deferred(),
            onLoadSource = function(sourceData){ self.store(sourceUrl, sourceData); dfd.resolve(sourceData); },
            savedSourceData = this.store(sourceUrl);

        if (savedSourceData)
            onLoadSource(savedSourceData);
        else{
            dataSource.load(sourceUrl, sourceOptions, onLoadSource,
                function(error){
                    dfd.reject();
                }
            )
        }
        return dfd;
    },
    removeEventListener: function(eventName, eventHandler){
        if (eventHandler && typeof(eventHandler) !== "function")
            throw new Error("Invalid event handler, must be a function or undefined.");

        this.$eventsElement.off(eventName + "." + this.namespace, eventHandler);
    },
    source: function(sources){
        this.clear();
        this.addSources.apply(this, arguments);
    },
    store: function(key, data){
        if (!this.options.storeDataSources || !window.localStorage || typeof(key) !== "string")
            return;

        var keyName = this.namespace + ".source." + key;

        if (!data){
            var item = window.localStorage.getItem(keyName);
            if (item)
                return JSON.parse(item);

            return;
        }
        window.localStorage.setItem(keyName, JSON.stringify(data));
    },
    triggerEvent: function(eventName, data){
        this.$eventsElement.trigger(eventName + "." + this.namespace, data);
    }
};