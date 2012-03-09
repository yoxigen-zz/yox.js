function Yox(container, options){
    this.container = container;
    this.options = options || {};

    this.init();
}

Yox.prototype = {
    init: function(){
        if (this.options.theme){
            var themeConstructor = yox.themes[this.options.theme],
                data;

            if (this.options.data){
                data = new yox.data(this.options.data);
            }

            if (!themeConstructor)
                throw new Error("Invalid theme, '" + this.options.theme + "' does not exist.");

            var theme = new themeConstructor(data, this.options);
            if (!(theme instanceof yox.theme))
                throw new Error("Invalid theme, '" + this.options.theme + "' is not an instance of yox.theme.");

            theme.init(this.container, data, this.options);
            $.extend(this, {
                destroy: theme.destroy,
                modules: theme.modules
            });
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