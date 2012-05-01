var elements = {
        options: {
            bar: document.getElementById("options"),
            theme: document.getElementById("options_theme"),
            dataSource: document.getElementById("options_data_source"),
            transition: document.getElementById("options_transition"),
            container: document.getElementById("options_container")
        }
    },
    yoxApi,
    yoxData,
    yoxContainer = document.getElementById("contentsInner"),
    currentItemIndex = 0;

function getDataSource(){
    var source = {
        type: elements.options.dataSource.value
    };

    // Get data source options:
    var dataSourceElementName = "options_data_sources_list_" + source.type,
        dataSourceOptionsItem = document.getElementById(dataSourceElementName);

    if (dataSourceOptionsItem){
        $("input, select", dataSourceOptionsItem).each(function(){
            var fieldName = this.id.replace(dataSourceElementName + "_", ""),
                value = this.getAttribute("type") === "checkbox" ? this.checked : this.value;

            if (value !== "")
                source[fieldName] = value;
        });
    }

    return source;
}

function readOptions(setData){
    var options = {
        theme: elements.options.theme.value,
        modules: {
            view: {
                firstItem: currentItemIndex,
                events: {
                    "load.view": function(){
                        this.selectItem(currentItemIndex);
                    }
                }
            }
        }
    };

    if (setData !== false || !yoxData){
        yoxData = options.data = new yox.data({ source: getDataSource() });
    }
    else
        options.data = yoxData;

    return options;
}

function fillOptions(options){
    var viewOptions = options.modules.view.options;
    if (viewOptions){
        $("[data-option]", $("[data-section='view']")).each(function(){
            var option = this.getAttribute("data-option"),
                optionValue = viewOptions[option];

            if (Object(optionValue) === optionValue)
                optionValue = optionValue.name || optionValue.prototype.name;

            if (optionValue !== undefined){
                this.value = optionValue;
            }
        });


        $("#options input[type=range]").each(function(){
            $(this).data("units").innerHTML = this.value;
        });
    }
}

function applyOptions(setData){
    var options = readOptions(setData);
    yoxApi = new Yox($(elements.options.container.getAttribute("data-value"))[0], options);
    yoxApi.addEventListener("beforeSelect", function(e){
        currentItemIndex = e.newItem.id - 1;
    });

    fillOptions(yoxApi);
}

var sectionHandlers = {
    data: function(e){
        yoxData.source(getDataSource());
    },
    view: function(e){
        var yoxview = yoxApi.modules.view;
        if (yoxview){
            yoxview.option(e.target.getAttribute("data-option"), e.target.value);
        }
    }
};

function reloadOptions(e){
    var sectionHandler = sectionHandlers[$(e.target).closest("section").data("section")];
    if (sectionHandler)
        sectionHandler(e);
    else{
        yoxApi.destroy();
        applyOptions(false);
    }
}

function init(){
    function addNameOptions(selectElement, items, defaultOptionText){
        var frag = document.createDocumentFragment();

        if (defaultOptionText){
            var defaultoption = document.createElement("option");
            defaultoption.innerHTML = defaultOptionText;
            frag.appendChild(defaultoption);
        }

        for(var itemName in items){
            var option = document.createElement("option"),
                item = items[itemName];

            option.value = itemName;
            option.innerHTML = item.name || itemName;
            frag.appendChild(option);
        }
        selectElement.appendChild(frag);
    }

    addNameOptions(elements.options.theme, yox.themes);
    addNameOptions(elements.options.dataSource, yox.data.sources);
    addNameOptions(elements.options.transition, yox.view.transitions);

    elements.options.theme.value = "classic";
    elements.options.dataSource.value = "picasa";


    $("#options")
        .on("change", "input, select", reloadOptions)
        .on("keydown", "input[type=text]", function(e){
            if (e.keyCode === 13)
                reloadOptions(e);
            else if (e.keyCode === 27){
                this.value = this.getAttribute("data-current");
                this.removeAttribute("data-current");
            }

            return true;
        })
        .on("focus", "input[type=text]", function(e){
            this.setAttribute("data-current", this.value);
            yoxApi.modules.view && yoxApi.modules.view.disableKeyboard();
            return true;
        })
        .on("blur", "input[type=text]", function(e){
            yoxApi.modules.view && yoxApi.modules.view.enableKeyboard();
            return true;
        })
        // Show units for range inputs:
        .on("change", "input[type=range]", function(e){
            $(this).data("units").innerHTML = this.value;
        })
        .find(".rangeUnits").each(function(){
            var $input = $("#" + this.getAttribute("data-input"));
            $input.data("units", this);
            this.innerHTML = $input.val();
        });

    $(document.body).on("click", ".clickList li", function(e){
        var $this = $(this),
            $parent = $this.parent();

        if ($this.attr("data-value") !== $parent.attr("data-value")){
            $(".selected", $parent).removeClass("selected");
            $this.addClass("selected");

            $parent.attr("data-value", $this.attr("data-value"));
            reloadOptions({ target: this });
        }
    });

    $("#optionsTab").on("click", function(){
        $(this).parent().toggleClass("optionsClosed");
    });

    applyOptions();
}

init();