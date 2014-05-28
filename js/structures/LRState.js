// class LRState : Structure

function LRState(id, name, noItems) {
    /// <summary>constructor of an LR state, will be created with empty set of core and noncore items</summary>
    /// <param name="id" type="String">id for manipulation</param>
    /// <param name="name" type="String">name of this state, displayed to the user</param>
    /// <param name="noItems" type="Boolean">if true, the core and non-core sets will not be really created (only the name is interesting)</param>
    this.initStructure(id, name);
    this.coreSet = noItems ? null : new LRItemSet();
    this.nonCoreSet = noItems ? null : new LRItemSet();
}
LRState.prototype = new Structure();
LRState.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    if (!this.coreSet) return { noItems: true };
    return { coreSet: this.coreSet.toData(), nonCoreSet: this.nonCoreSet.toData() };
}
LRState.prototype.toElement = function () {
    /// <returns type="$Element" />
    return $('<div class="lr-state"></div>')
        .append($('<div></div>').append($('<span class="lr-state-id"></span>').text(this.name())))
        .append(this.toStructureInnerElement());
}
LRState.prototype.toStructureInnerElement = function () {
    /// <returns type="$Element" />
    if (!this.coreSet) return $();
    var e = $('<div class="lr-state-core"></div>').append(this.coreSet.toStructureInnerElement(true));
    if (this.nonCoreSet.length())
        e = e.add($('<div class="lr-state-noncore"></div>').append(this.nonCoreSet.toStructureInnerElement(true)));
    return e;
}
LRState.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    if (data.noItems)
        return this.coreSet = this.nonCoreSet = null;
    this.coreSet = Structure.fromData(data.coreSet, grammar);
    this.nonCoreSet = Structure.fromData(data.nonCoreSet, grammar);
}
LRState.prototype.finalize = function () {
    if (!this.coreSet) return this;
    this.coreSet.finalize();
    this.nonCoreSet.finalize();
    return this;
}
LRState.prototype.getCoreHash = function (noLookahead) {
    /// <summary>create a unique string representation of core items</summary>
    /// <returns type="String" />
    if (!this.coreSet) return '[]';
    return '[' + this.coreSet.getItemHashes(noLookahead).sort().join(',') + ']';
}
LRState.prototype.toUserString = function () {
    /// <returns type="String" />
    if (!this.coreSet) return '[]';
    var c = [], n = [];
    this.coreSet.forEachItem(function (item) { c.push(item.toUserString()) });
    this.nonCoreSet.forEachItem(function (item) { n.push(item.toUserString()) });
    return '[' + c.join(', ') + (n.length ? ' | ' + n.join(', ') : '') + ']';
}
LRState.prototype.forEachItem = function (callback) {
    /// <summary>evaluate callback for each item of this state</summary>
    /// <param name="callback" type="Function">function(LRItem)</param>
    /// <returns type="SetStructure" />
    if (!this.coreSet) return this;

    var cont = true;
    $.each(this.coreSet._setFinalized, function (_i, i) {
        return cont = callback.call(i, i);
    });
    if (cont !== false)
        $.each(this.nonCoreSet._setFinalized, function (_i, i) {
            return callback.call(i, i);
        });
    return this;
}
LRState.prototype.getType = function () {
    return "LRState";
}


// class LRItemSet : SetStructure : Structure

function LRItemSet() {
    /// <summary>constructor of an LRItemSet, will be created with empty set of items</summary>
    this.initSetStructure(null, null);
}
LRItemSet.prototype = new SetStructure();
LRItemSet.prototype.getHashOfItem = function (item) {
    /// <param name="item" type="LRItem">item object to hash</param>
    /// <returns type="String" />
    return item.toString(true);
}
LRItemSet.prototype.add = function (newItem, immediately) {
    /// <summary>add item to this set (or add its lookaheads to an existing similar item), return boolean whether a change was made</summary>
    /// <param name="newItem" type="LRItem">LR item to add (or its lookaheads)</param>
    /// <param name="immediately" type="Boolean">if set, this change will have immediate effect</param>
    /// <returns type="Boolean" />
    var hash = this.getHashOfItem(newItem), present = this._setFinalized[hash], wasChanged = false,
        finalLookahead = {}, final;

    if (present) {
        // if an item like that already exists, we need to merge their lookaheads
        var presentLookahead = present.getLookahead(), newLookahead = newItem.getLookahead();
        for (var i = 0; i < presentLookahead.length; i++)
            finalLookahead[presentLookahead[i]] = presentLookahead[i];
        for (var i = 0; i < newLookahead.length; i++)
            if (!finalLookahead[newLookahead[i]]) {
                finalLookahead[newLookahead[i]] = newLookahead[i];
                wasChanged = true;
            }

        if (wasChanged)
            // new item has to be created with the merged lookahead
            final = new LRItem(newItem.getRule(), newItem.getIndex(),
                $.map(finalLookahead, function (s) { return s; }));
        else
            // nothing new added, the old item is OK
            final = present;
    } else {
        wasChanged = true;
        final = newItem;
    }

    this._setFinalized[hash] = final;
    if (immediately)
        this._set[hash] = final;
    return wasChanged;
}
LRItemSet.prototype.getItemHashes = function (noLookahead) {
    /// <summary>get a list of hashes of all items in this set</summary>
    /// <returns type="Array" />
    if (noLookahead)
        return getPropertyKeyList(this._setFinalized);
    else
        return $.map(this._setFinalized, function (item) {
            return item.toString();
        });
}
LRItemSet.prototype.toStructureInnerElement = function () {
    /// <returns type="$Element" />
    var list = $('<div class="set_map rules"></div>');
    $.each(this._setFinalized, function () { list.append(this.toElement()); })
    return list;
}
LRItemSet.prototype.getType = function () {
    return "LRItemSet";
}
LRItemSet.prototype.createSetItemFromText = function (text, grammar) {
    /// <param name="grammar" type="Grammar">the grammar used to parse symbols</param>
    return LRItem.fromData(JSON.parse(text), grammar);
}