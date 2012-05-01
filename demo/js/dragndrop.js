(function(){
    var dropzone = document.getElementsByClassName("dropZone")[0],
        leaveTimeoutId,
        isDragging;

    yoxApi.data.addEventListener("loadSources", function(e){
        yoxApi.modules.view.selectItem(0);
    });

    if ((!window.URL || !window.URL.createObjectURL) && (!window.webkitURL || !window.webkitURL.createObjectURL)){
        dropzone.innerHTML = "Sorry, your browser doesn't support this feature. Please try <a href='http://www.mozilla.org/en-US/firefox/fx/'>Firefox</a> or <a href='https://www.google.com/chrome'>Chrome</a>.";
        dropzone.className = "notSupported";
        return false;
    }

    function preventDefault(e){
        e.preventDefault();
        e.stopPropagation();
    }

    function onMouseMove(e){
        if (isDragging)
            endDrag();
    }

    function endDrag(){
        dropzone.className = "dropZone";
        isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
    }

    function onDrop(e){
        preventDefault(e);
        var files = e.dataTransfer.files;
        yoxApi.data.clear();
        yoxApi.data.addSources({
            type: "files",
            files: files
        });
        endDrag();
    }

    // Drag and drop:
    document.body.addEventListener("dragenter", function(e){
        preventDefault(e);
        if (!isDragging){
            isDragging = true;
            dropzone.className = "dropZone dropZone_dragging";
            window.addEventListener("mousemove", onMouseMove);
        }
    }, false);
    document.body.addEventListener("dragover", function(e){
        preventDefault(e);
        e.dataTransfer.dropEffect = "none";
    }, false);

    document.body.addEventListener("dragleave", function(e){
        preventDefault(e);
    });

    dropzone.addEventListener("drop", onDrop, false);

    dropzone.addEventListener("dragenter", function(e){
        preventDefault(e);
        clearTimeout(leaveTimeoutId);
        this.className = "dropZone dropZone_dragging dropZone_over";
        e.dataTransfer.dropEffect = "copy";
    }, false);
    dropzone.addEventListener("dragleave", function(e){
        preventDefault(e);
        var toElement = e.toElement || e.relatedTarget;
        if (toElement.nodeType === 1 && (toElement !== dropzone || e.toElement))
            dropzone.className = "dropZone dropZone_dragging";
    }, false);
    dropzone.addEventListener("dragover", function(e){
        preventDefault(e);
        e.dataTransfer.dropEffect = "copy";
    }, false);
})();