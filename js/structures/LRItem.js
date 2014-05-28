// class LRItem

var LRItem = function (rule, index, lookaheads) {
    /// <summary>abstract constructor of an LR item</summary>
    /// <param name="rule" type="Rule">rule the item is formed from</param>
    /// <param name="index" type="Number">0-based position of the dot</param>
    /// <param name="lookaheads" type="Array">array of terminals that serve as LR(1) item lookaheads, empty array if this is LR(0) item</param>
    this._rule = rule;
    this._index = index;
    this._lookaheads = lookaheads || [];
    this._highlight = Highlight.NONE;
    this._stringCache = null;
}

LRItem.dotHTML = '<span class="syntax">•</span>';
LRItem.lookaheadSeparatorHTML = Word.symbolSeparatorHTML + '<span class="syntax">&</span>' + Word.symbolSeparatorHTML;

LRItem.prototype.toUserString = function () {
    /// <returns type="String" />

    var ret = [];
    this._rule.getRight().forEachSymbol(function (s, i) {
        ret.push(s.toString());
    });
    ret.splice(this._index, 0, '.');
    var lookaheads = this._lookaheads ? ', ' + this._lookaheads.join(' & ') : '';
    return '[' + this._rule.getLeft().toString() + ' -> ' + ret.join(' ') + lookaheads +  ']';
}
LRItem.prototype.toString = function (noLookahead) {
    /// <returns type="String" />

    return JSON.stringify({
            l: this._rule.getLeft().toString(),
            r: this._rule.getRight().toString(),
            i: this._index,
            la: noLookahead ? [] : $.map(this._lookaheads, function (e) { return e.toString(); })
        });
}
LRItem.fromData = function (data, grammar) {
    /// <param name="grammar" type="ConversionGrammar">grammar this item is created from</param>
    /// <returns type="LRItem" />
    var rule = grammar.tryGetRule(data.l, data.r),
        lookaheads = $.map(data.la, function (str) { return grammar.tryGetSymbol(str); });
    return new LRItem(rule, data.i, lookaheads);
}
LRItem.prototype.toElement = function () {
    /// <returns type="$Element" />

    var left = this._rule.getLeft().toElement(), word = this._rule.getRight().toElement();
    if (this._index == 0)
        word.prepend($(LRItem.dotHTML + Word.symbolSeparatorHTML));
    else
        word.find('span:eq(' + (this._index - 1) * 2 + ')').after(
            $(Word.symbolSeparatorHTML + LRItem.dotHTML)
        );
    var lookaheads = this._lookaheads.length ? $('<div class="lookaheads"><span class="syntax">, </span></div>') : null;
    $.each(this._lookaheads || [], function (i, t) {
        if (i > 0)
            lookaheads.append($(LRItem.lookaheadSeparatorHTML));
        lookaheads.append(t.toElement());
    })
    var rule = $('#rule_template > .rule').clone().toggleClass('rule lr-item');
    rule.find('.nonterminal').replaceWith(left);
    rule.find('> div').replaceWith(word);
    return rule.append(lookaheads).addClass(this._highlight.addClass);
}
LRItem.prototype.highlight = function () {
    /// <summary>get (no arguments) or set the highlight</summary>
    /// <param name="arg" type="Highlight">the highlight to set</param>
    if (arg instanceof Highlight)
        this._highlight = Highlight.whichShouldStay(this._highlight, arg);
    this._stringCache = null;
    return this._highlight;
}
LRItem.prototype.getSymbolAfterDot = function () {
    /// <summary>return the symbol after this item's dot, or null if it's a final item</summary>
    /// <returns type="Symbol" />

    return this._rule.getRight().get(this._index);
}
LRItem.prototype.getWordAfterSymbolAfterDot = function () {
    /// <summary>return a word cosisting of all the symbols after the symbol this item's dot is pointing at</summary>
    /// <returns type="Word" />
    return this._rule.getRight().slice(this._index + 1);
}
LRItem.prototype.isFinal = function () {
    /// <summary>is this item final?</summary>
    /// <returns type="Boolean" />
    return this._index >= this._rule.getRight().length();
}
LRItem.prototype.createFollowingItem = function () {
    /// <summary>return a new item created by moving the dot further, or null if this is a final item</summary>
    /// <returns type="LRItem" />
    return !this.isFinal()
        ? new LRItem(this._rule, this._index + 1, this._lookaheads.slice())
        : null;
}
LRItem.prototype.getRule = function () {
    /// <summary>return the rule this item was made from</summary>
    /// <returns type="Rule" />
    return this._rule;
}
LRItem.prototype.getLeft = function () {
    /// <summary>return the left side of the rule this item was made from</summary>
    /// <returns type="Nonterminal" />
    return this._rule.getLeft();
}
LRItem.prototype.getIndex = function () {
    /// <summary>return the dot's position</summary>
    /// <returns type="Number" />
    return this._index;
}
LRItem.prototype.getLookahead = function () {
    /// <summary>return the array of LR(1) lookahead symbols (0 for SLR, 1 for CLR, many for LALR)</summary>
    /// <returns type="Array" />
    return this._lookaheads;
}