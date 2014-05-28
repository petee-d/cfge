$Element = jQuery.fn;

function getAnyProperty(object) {
    /// <summary>return any property (not the key) of the object, or null</summary>

    for (var i in object)
        return object[i];
    return null;
}

function getAnyPropertyKey(object) {
    /// <summary>return any property key of the object, or null</summary>

    for (var i in object)
        return i;
    return null;
}


function getPropertyKeyList(object) {
    /// <summary>return a list of this object's enumerable property keys</summary>

    var keys = [];
    for (var i in object)
        keys.push(i);
    return keys;
}

function getPropertyList(object) {
    /// <summary>return a list of this object's enumerable property values</summary>

    var keys = [];
    for (var i in object)
        keys.push(object[i]);
    return keys;
}

function getPropertyCount(object) {
    /// <summary>return the number of properties of the object</summary>

    var n = 0;
    for (var i in object)
        n++;
    return n;
}

function _(str, otherArguments) {
    /// <summary>for possible future language versions, also does some basic templating</summary>

    if (!otherArguments)
        return str;
    else {
        var thatArgs = $.map(arguments, function (e) { return e; });
        return thatArgs.shift().replace(/%s\b/g, function () {
            return thatArgs.shift().toString();
        });
    }
}

function sortObjectKeys(object, sort) {
    /// <summary>reorder the key-value pairs of this object by natural or explicit sorting method; return the same object</summary>
    /// <param name="object" type="Object">object the keys of which will be sorted</param>
    /// <param name="sort" type="function(a,b) -> {-1,0,1}">(optional) if supplied, will be used to sort the keys</param>
    /// <returns type="Object" />

    var pairs = $.map(object, function (value, key) { return { key: key, value: value } })
        .sort(function (a, b) {
            return sort ? sort(a.key, b.key) : (a.key > b.key ? 1 : (a.key == b.key ? 0 : -1));
        });
    for (var key in object)
        delete object[key];
    $.each(pairs, function (i, pair) {
        object[pair.key] = pair.value;
    });

    return object;
}

jQuery.fn.outerHTML = function (s) {
    /// <summary>return the HTML of the first element in this set, with its contents</summary>
    /// <returns type="String" />
    return s
        ? this.before(s).remove()
        : jQuery("<div></div>").append(this.eq(0).clone()).html();
}