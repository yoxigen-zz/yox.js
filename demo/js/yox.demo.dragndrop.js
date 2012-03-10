(function(){
    var dropzone = document.getElementById("dropzone"),
        leaveTimeoutId;

    if ((!window.URL || !window.URL.createObjectURL) && (!window.webkitURL || !window.webkitURL.createObjectURL)){
        dropzone.innerHTML = "Sorry, your browser can't handle this demo. Please try <a href='http://www.mozilla.org/en-US/firefox/fx/'>Firefox</a> or <a href='https://www.google.com/chrome'>Chrome</a>.";
        dropzone.className = "notSupported";
        return false;
    }

    function preventDefault(e){
        e.preventDefault();
        e.stopPropagation();
    }

    function endDrag(){
        dropzone.style.opacity = "0";
        dropzone.className = "";
    }

    // Drag and drop:
    document.body.addEventListener("dragenter", function(e){
        preventDefault(e);
        dropzone.style.opacity = "1";
    }, false);
    document.body.addEventListener("dragover", function(e){
        preventDefault(e);
        e.dataTransfer.dropEffect = "none";
    }, false);
    document.body.addEventListener("drop", function(e){
        preventDefault(e);
        endDrag();
    }, false);
    document.body.addEventListener("dragend", function(e){
        preventDefault(e);
        endDrag();
    }, false);

    dropzone.addEventListener("drop", function(e){
        preventDefault(e);
        var files = e.dataTransfer.files;

        modules.data.addSources({
            type: "files",
            files: files
        });
        endDrag();
    }, false);

    dropzone.addEventListener("dragenter", function(e){
        preventDefault(e);
        clearTimeout(leaveTimeoutId);
        this.className = "dragover";
        e.dataTransfer.dropEffect = "copy";
    }, false);
    dropzone.addEventListener("dragleave", function(e){
        preventDefault(e);
        var toElement = e.toElement || e.relatedTarget;

        if (toElement.nodeType === 1 && (toElement !== dropzone || e.toElement))
            dropzone.className = "";
    }, false);
    dropzone.addEventListener("dragover", function(e){
        preventDefault(e);
        e.dataTransfer.dropEffect = "copy";
    }, false);
})();