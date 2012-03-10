var viewer =  document.getElementById("viewer"),
    $thumbnailsPanel = $("#thumbnailsPanel"),
    $thumbnailsContainer = $("#thumbnails"),
    $slideshowBtn = $("#slideshowBtn"),
    docElement = document.documentElement,
    info = document.getElementById("info"),
    infoTitle = document.getElementById("infoTitle"),
    loader = document.getElementById("loader"),
    itemCounter = document.getElementById("itemCounter"),
    isInit,
    heightToSubtract = document.getElementsByTagName("header")[0].clientHeight + info.clientHeight + $thumbnailsPanel.height() +2,
    title = document.title,
    transitionSelect = document.getElementById("transitionSelect");

var dataSource = document.location.href.match(/yoxview\.demo\.transitions\.html/) ? {
    type: "picasa",
    url: "https://picasaweb.google.com/112402114851229244394/Collages",
    thumbsize: 104,
    cropThumbnails: false,
    imgmax: 1024
} : undefined;

var modules = {
    data: new yox.data({
        cache: true,
        source: dataSource
    })
};

$thumbnailsContainer.yoxscroll({
    events: {
        click: function(originalEvent){
            modules.view.selectItem(parseInt(originalEvent.target.parentNode.getAttribute("data-yoxthumbindex"), 10), "yoxscroll");
        }
    },
    elements: $(".thumbnailsBtn"),
    pressedButtonClass: "enabledThumbnailsButton"
});

modules.thumbnails = new yox.thumbnails($thumbnailsContainer, {
    data: modules.data,
    handleClick: false,
    events: {
        create: function(data){
            $thumbnailsContainer.yoxscroll("update");
        }
    }
});

var yoxviewOptions = {
        delayOpen: true,
        enableKeyboard: true,
        margin: { top: 10, right: 45, bottom: 10, left: 45 },
        container: viewer,
        controls: {
            prev: $("#yoxviewPrev"),
            next: $("#yoxviewNext")
        },
        createThumbnails: false,
        data: modules.data,
        events: {
            beforeSelect: function(e){
                var thumbnailIndex = e.newItem.id - 1;
                $thumbnailsContainer.yoxscroll("scrollTo", modules.thumbnails.thumbnails[thumbnailIndex], { centerElement: !e.data });
                modules.thumbnails.select(thumbnailIndex);
            },
            close: function(){ info.innerHTML = "" },
            select: function(item){
                infoTitle.innerHTML = item.title || "";
                itemCounter.innerHTML = [item.id, '/', this.items.length].join("");
                document.title = title + (item ? " - " + item.title : "");
            },
            cacheStart: function(item){ loader.style.display = "inline" },
            cacheEnd: function(item){ loader.style.display = "none" },
            init: function(){this.selectItem(0); },
            loadItem: function(item){ $(modules.thumbnails.thumbnails[item.id - 1]).addClass("loadedThumbnail"); },
            load: function(data){
                if (this.initialized)
                    this.selectItem(data.items[0]);
            },
            slideshowStop: function(){ $slideshowBtn.removeClass("slideshowBtn_on"); },
            slideshowStart: function(){ $slideshowBtn.addClass("slideshowBtn_on"); }
        },
        handleThumbnailClick: false,
        transition: "morph",
        //resizeMode: "fill",
        transitionTime: 300,
        slideshowDelay: 2000
    };

$.extend(yoxviewOptions, getHashOptions());


function setContainerSize(){
    var height = docElement.clientHeight - heightToSubtract;
    viewer.style.height = height + "px";
    if (isInit)
        modules.view.update();
}

setContainerSize();
modules.view = new yox.view(viewer, yoxviewOptions);
$(window).resize(function(){
    setContainerSize();
    $thumbnailsContainer.yoxscroll("update");
});

$slideshowBtn.on("click", function(e){
    modules.view.toggleSlideshow();
});




transitionSelect.onchange = function(){
    var options = { transition: this.value };
    if (!timeChanged){
        options.transitionTime = this.value === "flip" || this.value === "evaporate" ? 1000 : 300;
        transitionTime.value = options.transitionTime;
    }
    setHashOptions(options);
}

function setHashOptions(options){
    var hash = [];
    for (var optionName in options)
        hash.push([optionName, "=", options[optionName]].join(""));
    document.location.href = "#" + hash.join("&");
}

function getHashOptions(){
    var hashOptions = {},
        hashOptionsStr = document.location.href.match(/#(.*)$/);

    if (hashOptionsStr){
        hashOptionsStr = hashOptionsStr[1].split("&");
        for(var i=0; i<hashOptionsStr.length; i++){
            var keyValue = hashOptionsStr[i].split("=");
            hashOptions[keyValue[0]] = keyValue[1];
        }
    }

    return hashOptions;
}
window.addEventListener("hashchange", function(){
    var hashOptions = getHashOptions();
    modules.view.option(hashOptions);

    if (hashOptions.transitionTime !== undefined){
        transitionTime.value = hashOptions.transitionTime;
        transitionTimeStr.innerHTML = hashOptions.transitionTime;
    }

    hashOptions.transition && (transitionSelect.value = hashOptions.transition);
}, false);

var transitionTimeStr = document.getElementById("transitionTimeStr"),
    transitionTimeTimeoutId,
    transitionTime = document.getElementById("transitionTime"),
    timeChanged = false;

transitionTime.onchange = function(){
    timeChanged = true;
    clearTimeout(transitionTimeTimeoutId);
    var timeNumber = parseInt(this.value, 10);
    if (!isNaN(timeNumber)){
        transitionTimeStr.innerHTML = this.value;
        transitionTimeTimeoutId = setTimeout(function(){
            var options = { transition: transitionSelect.value, transitionTime: timeNumber };
            setHashOptions(options);
        }, 100);
    }
}
$(transitionTime).on("keyup", function(e){
    if(e.keyCode === 13)
        $(this).trigger("change");
});

for(var transitionName in yox.view.transitions){
    transitionEl = document.createElement("option");
    transitionEl.value = transitionName;
    transitionEl.innerHTML = transitionName;
    transitionSelect.appendChild(transitionEl);
}
transitionSelect.value = yoxviewOptions.transition;

isInit = true;