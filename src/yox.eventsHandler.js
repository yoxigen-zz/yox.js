yox.eventsHandler = function(){
    var namespaces = {
        _default: {}
    };

    this.triggerEvent = function(eventName, data, id){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1];

        if (namespaceName){
            var namespace = namespaces[namespaceName];
            if (namespace){
                var namespaceEvents = namespace[eventType];
                if (namespaceEvents){
                    for(var i=0, eventHandler; eventHandler = namespaceEvents[i]; i++){
                        eventHandler.call(this, data, id);
                    }
                }
            }
        }

        var noNamespacedEvents = namespaces._default[eventType];
        if (noNamespacedEvents){
            for(var i=0, eventHandler; eventHandler = noNamespacedEvents[i]; i++){
                eventHandler.call(this, data, id);
            }
        }
    };

    this.addEventListener = function(eventName, eventHandler){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1],
            namespace;

        if (namespaceName){
            namespace = namespaces[namespaceName];
            if (!namespace)
                namespace = namespaces[namespaceName] = { };
        }
        else
            namespace = namespaces._default;

        var event = namespace[eventType];
        if (!event)
            event = namespace[eventType] = [];

        event.push(eventHandler);
    };

    this.removeEventListener = function(eventName, eventHandler){
        var eventNameParts = eventName.split("."),
            eventType = eventNameParts[0],
            namespaceName = eventNameParts[1],
            namespace,
            foundHandler = false;

        if (namespaceName){
            namespace = namespaces[namespaceName];
            if (!namespace)
                namespace = namespaces[namespaceName] = { };
        }
        else
            namespace = namespaces._default;

        var event = namespace[eventType];
        if (event && event.length){
            for(var i=event.length; i--;){
                if (event[i] === eventHandler){
                    event.splice(i, 1);
                    foundHandler = true;
                }
            }
        }

        return foundHandler;
    }
};