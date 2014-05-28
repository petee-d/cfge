// class ParserActions : SetStructure : Structure

function ParserActions(id, name) {
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    this.initSetStructure(id, name);
    this._disabled = {};
}
ParserActions.prototype = new SetStructure();
ParserActions.prototype.toStructureInnerElement = function (brief, interactive) {
    /// <param name="brief" type="Boolean">if true, only the list of items will be output</param>
    /// <returns type="$Element" />
    var that = this, list = $('<div></div>').addClass('parser-actions');
    $.each(this._setFinalized, function () {
        var itemObject = this, itemElement =
            $('<div></div>').addClass(that.contains(this) ? null : 'disabled')
            .append(this.toElement());
        if (interactive)
            itemElement.addClass('interactive').click(function () {
                if ($(this).toggleClass('disabled').hasClass('disabled'))
                    that.disableAction(itemObject);
                else
                    that.enableAction(itemObject);
            });
        list.append(itemElement);
    });
    return list;
}
ParserActions.prototype.contains = function (object) {
    /// <summary>find out if object is contained in this set and enabled</summary>
    /// <param name="object" type="Object">object to find</param>
    return this._disabled[this.getHashOfItem(object)] ? null :
        SetStructure.prototype.contains.call(this, object) || null;
}
ParserActions.prototype.length = function () {
    /// <summary>how many enabled items are in this set?</summary>
    /// <returns type="Number" />
    return SetStructure.prototype.length.call(this) - getPropertyCount(this._disabled);
}
ParserActions.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    return $.extend(SetStructure.prototype.toConcreteData.call(this),  {
        disabled: $.extend({}, this._disabled)
    });
}
ParserActions.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    var that = this;
    $.each(data.set, function (i, str) {
        that.add(that.createSetItemFromText(str, grammar), true);
    });
    that._disabled = $.extend({}, data.disabled);
}
ParserActions.prototype.forEachItem = function (callback) {
    /// <summary>evaluate callback for each enabled item in this set</summary>
    /// <param name="callback" type="Function">function(Object item)</param>
    /// <returns type="SetStructure" />

    var that = this;
    $.each(this._set, function (_i, item) {
        return that._disabled[item] ? true :
            callback.call(item, item);
    });

    return this;
}
ParserActions.prototype.disableAction = function (action) {
    /// <summary>disable an action in this set</summary>
    this._disabled[action] = true;
}
ParserActions.prototype.enableAction = function (action) {
    /// <summary>enable an action in this set</summary>
    delete this._disabled[action];
}
ParserActions.prototype.createSetItemFromText = function (text, grammar) {
    /// <param name="text" type="String">string representation of the action</param>
    /// <param name="grammar" type="Grammar">the grammar used to parse symbols</param>
    var str = text.substr(2);
    switch (text.charAt(0)) {
        case 'g': return new LRGotoEntry(str);
        case 's': return new LRActionShift(str);
        case 'r': var m = str.split(' -> ');
            return new LRActionReduce(grammar.tryGetRule(m[0], m[1]));
        case 'a': return new LRActionAccept();
        case 'e': return new ParserActionError(str);
        case 'p': var m = str.split(' -> ');
            return new LLActionProduce(grammar.tryGetRule(m[0], m[1]));
        default: MyError('invalid action string representation: ' + text);
    }
}
ParserActions.prototype.getType = function () {
    return "ParserActions";
}



// class LRGotoEntry

function LRGotoEntry(state) {
    /// <param name="state" type="String">identifier of the state to go to after a reduction</param>
    this.state = state;
}
LRGotoEntry.prototype.toElement = function () {
    return $('<span class="entry-goto"></span>').append(
        $('<span class="syntax">g</span> '),
        $('<span class="lr-state"></span>').text(this.state)
    );
}
LRGotoEntry.prototype.toString = function () {
    return 'g:' + this.state;
}



// class LRActionShift

function LRActionShift(state) {
    /// <param name="state" type="String">identifier of the state to go to after shifting</param>
    this.state = state;
}
LRActionShift.prototype.toElement = function () {
    return $('<span class="action-shift"></span>').append(
        $('<span class="syntax">s</span> '),
        $('<span class="lr-state"></span>').text(this.state)
    );
}
LRActionShift.prototype.toString = function () {
    return 's:' + this.state;
}



// class LRActionReduce

function LRActionReduce(rule) {
    /// <param name="rule" type="Rule">rule to reduce</param>
    this.rule = rule;
}
LRActionReduce.prototype.toElement = function () {
    return $('<span class="action-reduce"> <span class="syntax">→</span> </span>')
                .prepend(this.rule.getLeft().toElement())
                .append(this.rule.getRight().toElement());
}
LRActionReduce.prototype.toString = function () {
    return 'r:' + this.rule.getLeft().toString() + ' -> ' + this.rule.getRight().toString();
}



// class LRActionAccept

function LRActionAccept() {
}
LRActionAccept.prototype.toElement = function () {
    return $('<span class="action-accept syntax"></span>').text(_('accept'));
}
LRActionAccept.prototype.toString = function () {
    return 'a:';
}



// class ParserActionError

function ParserActionError(message) {
    /// <param name="message" type="String">parser error message</param>
    this.message = message;
}
ParserActionError.prototype.toElement = function () {
    return $('<span class="action-error"></span>').text(this.message);
}
ParserActionError.prototype.toString = function () {
    return 'e:' + this.message;
}



// class LLActionProduce

function LLActionProduce(rule) {
    /// <param name="rule" type="Rule">rule to expand</param>
    this.rule = rule;
}
LLActionProduce.prototype.toElement = function () {
    return $('<span class="action-produce"> <span class="syntax">→</span> </span>')
                .prepend(this.rule.getLeft().toElement())
                .append(this.rule.getRight().toElement());
}
LLActionProduce.prototype.toString = function () {
    return 'p:' + this.rule.getLeft().toString() + ' -> ' + this.rule.getRight().toString();
}