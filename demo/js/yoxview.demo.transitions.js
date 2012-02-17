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

function setContainerSize(){
    var height = docElement.clientHeight - heightToSubtract;
    viewer.style.height = height + "px";
    if (isInit)
        $thumbnailsContainer.yoxview("update");

}

setContainerSize();

$(window).resize(function(){
    setContainerSize();
    $thumbnailsContainer.yoxscroll("update");
});

$slideshowBtn.on("click", function(e){
    $thumbnailsContainer.yoxview("toggleSlideshow");
});

var dataSource = new yox.data({
    source: {
        type: "picasa",
        url: "https://picasaweb.google.com/105098710956916751721/Trips",
        thumbsize: 104,
        cropThumbnails: false
    }
});

var thumbs = new yox.thumbnails($thumbnailsContainer, {
        data: dataSource,
        handleClick: false,
        events: {
            create: function(data){
                $thumbnailsContainer.yoxscroll("update");
            }
        }
    }),
    yoxviewOptions = {
        delayOpen: true,
        enableKeyboard: true,
        margin: { top: 10, right: 45, bottom: 10, left: 45 },
        container: viewer,
        controls: {
            prev: $("#yoxviewPrev"),
            next: $("#yoxviewNext")
        },
        createThumbnails: false,
        data: dataSource,
        events: {
            beforeSelect: function(e, items, data){
                var thumbnailIndex = items.newItem.id - 1;
                $thumbnailsContainer.yoxscroll("scrollTo", thumbs.thumbnails[thumbnailIndex], { centerElement: !data });
                thumbs.select(thumbnailIndex);
            },
            close: function(){ info.innerHTML = "" },
            select: function(e, item){
                infoTitle.innerHTML = item.title || "";
                itemCounter.innerHTML = [item.id, '/', this.items.length].join("");
                document.title = title + (item ? " - " + item.title : "");
            },
            cacheStart: function(e, item){ loader.style.display = "inline" },
            cacheEnd: function(e, item){ loader.style.display = "none" },
            init: function(){this.selectItem(0); },
            loadItem: function(e, item){ $(thumbs.thumbnails[item.id - 1]).addClass("loadedThumbnail"); },
            load: function(e, data){
                if (this.initialized)
                    this.selectItem(data.items[0]);
            },
            slideshowStop: function(){ $slideshowBtn.removeClass("slideshowBtn_on"); },
            slideshowStart: function(){ $slideshowBtn.addClass("slideshowBtn_on"); }
        },
        handleThumbnailClick: false,
        transition: "morph",
        transitionTime: 300
    };

function getQueryOptions(){
    var queryOptions = {},
        queryOptionsStr = document.location.href.match(/#(.*)$/);

    if (queryOptionsStr){
        queryOptionsStr = queryOptionsStr[1].split("&");
        for(var i=0; i<queryOptionsStr.length; i++){
            var keyValue = queryOptionsStr[i].split("=");
            queryOptions[keyValue[0]] = keyValue[1];
        }
    }

    return queryOptions;
}

$.extend(yoxviewOptions, getQueryOptions());

$thumbnailsContainer
    .yoxview(yoxviewOptions)
    .yoxscroll({
        events: {
            click: function(e, originalEvent){
                $thumbnailsContainer.yoxview("selectItem", parseInt(originalEvent.target.parentNode.getAttribute("data-yoxthumbindex"), 10), "yoxscroll");
            }
        },
        elements: $(".thumbnailsBtn"),
        pressedButtonClass: "enabledThumbnailsButton"
    });

transitionSelect.onchange = function(){
    var options = { transition: this.value };
    options.transitionTime = this.value === "flip" ? 1000 : 300;
    $thumbnailsContainer.yoxview("option", options);
}
for(var transitionName in yox.view.transitions){
    transitionEl = document.createElement("option");
    transitionEl.value = transitionName;
    transitionEl.innerHTML = transitionName;
    transitionSelect.appendChild(transitionEl);
}
transitionSelect.value = yoxviewOptions.transition;

isInit = true;