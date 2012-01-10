var popupContainer =  document.getElementById("popupContainer"),
    $thumbnailsPanel = $("#thumbnailsPanel"),
    $thumbnailsContainer = $("#thumbnails"),
    $slideshowBtn = $("#slideshowBtn"),
    $addPanel = $("#addPanel"),
    docElement = document.documentElement,
    info = document.getElementById("info"),
    infoTitle = document.getElementById("infoTitle"),
    loader = document.getElementById("loader"),
    itemCounter = document.getElementById("itemCounter"),
    isInit,
    heightToSubtract = document.getElementsByTagName("header")[0].clientHeight + info.clientHeight + $thumbnailsPanel.height() +2,
    title = document.title;

function setContainerSize(){
    var height = docElement.clientHeight - heightToSubtract;
    popupContainer.style.height = height + "px";
    if (isInit)
        $thumbnailsContainer.yoxview("update");

}

setContainerSize();

function addItem(){
    $thumbnailsContainer.yoxview("addItems", [{
        thumbnail: { src: document.getElementById("add_thumbnail").value },
        url: document.getElementById("add_image").value,
        title: document.getElementById("add_title").value,
        "type": "image"
    }], true)
}

function setSource(){
    $thumbnailsContainer.yoxview("source", {
        url: document.getElementById("source_input").value,
        thumbsize: 104,
        cropThumbnails: false
    })
}

$(window).resize(function(){
    setContainerSize();
    $thumbnailsContainer.yoxscroll("update");
});

$slideshowBtn.on("click", function(e){
    $thumbnailsContainer.yoxview("toggleSlideshow");
});

$("#addBtn").on("click", function(e){ e.preventDefault(); $addPanel.slideToggle("fast"); });
$thumbnailsContainer.yoxview({
    delayOpen: true,
    enableKeyboard: true,
    margin: { top: 10, right: 45, bottom: 10, left: 45 },
    container: popupContainer,
    controls: {
        prev: $("#yoxviewPrev"),
        next: $("#yoxviewNext")
    },
    //popupPadding: 20,
    events: {
        beforeSelect: function(e, items, data){
            try{
                $thumbnailsContainer.yoxscroll("scrollTo", items.newItem.thumbnail.element, { centerElement: !data });
            }
            catch(e){ }
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
        loadItem: function(e, item){ $(item.thumbnail.element).addClass("loadedThumbnail"); },
        createThumbnails: function(e, data){
            $thumbnailsContainer.yoxscroll("update");
            if (this.initialized)
                this.selectItem(data.items[0]);
        },
        slideshowStop: function(){ $slideshowBtn.removeClass("slideshowBtn_on"); },
        slideshowStart: function(){ $slideshowBtn.addClass("slideshowBtn_on"); }
    },
    handleThumbnailClick: false,
    selectedThumbnailClass: "selectedThumbnail",
    source: [{
        url: "https://picasaweb.google.com/105098710956916751721/Trips",
        thumbsize: 104,
        cropThumbnails: false
    }
    ],
    zoom: true,
    transform: true,
    //transition: "evaporate",
    transitionTime: 300
})
.yoxscroll({
    events: {
        click: function(e, originalEvent){ $thumbnailsContainer.yoxview("selectItem", originalEvent.target.parentNode, "yoxscroll"); }
    },
    elements: $(".thumbnailsBtn"),
    pressedButtonClass: "enabledThumbnailsButton"
});
isInit = true;