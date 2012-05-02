function Yox(container, options){
    this.container = container;
    this.options = options || {};

    this.init();
}

Yox.prototype = {
    init: function(){
        if (this.options.theme){
            var eventsHandler = new yox.eventsHandler(),
                data,
                self = this;

            if (this.options.data){
                if (this.options.data instanceof yox.data)
                    data = this.options.data;
                else
                    data = new yox.data(this.options.data);
            }

            function createTheme(themeName, themeOptions){
                var themeConstructor = yox.themes[themeName];

                if (!themeConstructor)
                    throw new Error("Invalid theme, '" + themeName + "' does not exist.");

                var theme = new themeConstructor(data, $.extend({}, themeConstructor.defaults, themeOptions));
                if (!(theme instanceof yox.theme))
                    throw new Error("Invalid theme, '" + themeName + "' is not an instance of yox.theme.");

                theme.init(self.container, data, eventsHandler, themeOptions);
                return theme;
            }

            if (this.options.theme instanceof Array){
                this.themes = {};
                for(var i=0, theme; theme = this.options.theme[i]; i++){
                    this.themes[theme.id || theme.name] = createTheme(theme.name, theme.options || {});
                }
            }
            else{
                var theme = createTheme(this.options.theme, this.options);
                this.modules = theme.modules;
            }

            $.extend(this, {
                destroy: function(){
                    for(var moduleName in this.modules){
                        var module = this.modules[moduleName],
                            moduleDestroy = module.destroy;

                        moduleDestroy && moduleDestroy.call(module);
                    }
                    theme.destroy.call(theme);
                },
                data: data
            },
            eventsHandler);
        }

        delete this.init;
    }
};

yox = typeof(yox) === "undefined" ? {} : yox;

$.fn.yox = function(options) 
{
    if (!this.length)
        return this;

    return this.each(function(i, el){
        var yoxObj = $(this).data("yox");
        if (typeof(options) === "string" && yoxObj){
            if (yoxObj && yoxObj[options])
                yoxObj[options].apply(yoxObj, Array.prototype.slice.call(arguments, 1));
            else
                throw new Error("Invalid method '" + options + "'");
        }
        else if (Object(options) === options || !options){
            $(this).data("yox", new Yox(this, options));
        }
        else
            $.error( 'Method ' +  options + ' does not exist on Yox.' );
    });
};