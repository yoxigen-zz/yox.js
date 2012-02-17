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
        cache: false // Set this to true to enable caching on localStorage. Cache is used only for external sources - it saves the data retrieved from the source (what's return from the source's load() method).
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

            self.triggerEvent("loadSources", Array.prototype.slice.call(arguments, 0));
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
        var dataSource = source.type ? this.getDataSource(source.type) : this.findDataSource(source),
            self = this;

        if (!dataSource)
            return;

        var dfd = $.Deferred(),
            onLoadSource = function(sourceData){
                self.store(source, sourceData);
                dfd.resolve(sourceData);
            },
            savedSourceData = this.store(source);

        if (savedSourceData)
            onLoadSource(savedSourceData);
        else{
            dataSource.load(source, onLoadSource,
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
    store: function(source, data){
        if (!this.options.cache || !window.localStorage || !source.url)
            return false;

        var keyName = this.namespace + ".source." + source.url;

        if (!data){
            var item = window.localStorage.getItem(keyName);
            if (item)
                return JSON.parse(item);

            return null;
        }
        window.localStorage.setItem(keyName, JSON.stringify(data));
    },
    triggerEvent: function(eventName, data){
        this.$eventsElement.trigger(eventName + "." + this.namespace, data);
    }
};