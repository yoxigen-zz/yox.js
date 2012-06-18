yox.theme = function(){};
yox.themes = {}; // Will hold the theme types

yox.theme.prototype = {
    // Creates the elements required for the theme, adds event listeners, etc.
    create: function(container){
        throw new Error("'create' method is not implemented for this theme.");
    },
    // Removes all elements and event listeners created by the 'create' method.
    destroy: function(){
        throw new Error("'destroy' method is not implemented for this theme.");
    },
    getThemeClass: function(className){
        return "yox-theme-" + this.name + (className ? "-" + className : "");
    },
    init: function(container, options){
        if (!(options.data instanceof yox.data))
            throw new Error("Invalid data provided for theme, must be an instance of yox.data.");

        $.extend(this, options.eventBus);

        this.create(container);

        function createModule(container, moduleName, moduleOptions){
            moduleOptions.data = options.data;

            moduleOptions.eventBus = {
                addEventListener: function(eventName, eventHandler){
                    options.eventBus.addEventListener(eventName, eventHandler.bind(this));
                },
                triggerEvent: function(eventName, eventData, sender){
                    options.eventBus.triggerEvent.call(this, eventName + "." + moduleName, eventData, sender || this);
                }
            };

            return new moduleConstructor(container, moduleOptions);
        }

        var modulesConfig = $.extend(true, {}, this.config, options.modules);
        for(var moduleName in modulesConfig){
            var moduleOptions = modulesConfig[moduleName],
                moduleConstructor = yox[moduleName];

            if (!moduleConstructor)
                throw new Error("Module not found: '" + moduleName + "', can't create theme '" + this.name + "'.");

            var moduleElements = $(".yox" + moduleName, container);
            if (moduleOptions instanceof Array){
                this.modules[moduleName] = [];

                for(var i=0, options; options = moduleOptions[i]; i++){
                    this.modules[moduleName].push(createModule(moduleElements[i], moduleName, options));
                }
            }
            else
                this.modules[moduleName] = createModule(moduleElements[0], moduleName, moduleOptions);
        }
    },
    // The configuration for modules used by the theme.
    config: {},
    modules: {}
}