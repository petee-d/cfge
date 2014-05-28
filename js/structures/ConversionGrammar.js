// class ConversionGrammar : Grammar

function ConversionGrammar(arg){
    /// <summary>construct a Grammar from a data object</summary>
    /// <param name="arg" type="Object">data object</param>
    this.init(arg);
}
ConversionGrammar.prototype = new Grammar("# abstract #");

ConversionGrammar.prototype.toConversionData = function () {
    /// <summary>return a data object representation of this conversion grammar</summary>
    /// <returns type="Object" />

    var N = {}, T = {}, P = {};
    $.each(this._N, function (_n, n) { N[n] = n.highlight().value; });
    $.each(this._T, function (_t, t) { T[t] = t.highlight().value; });
    $.each(this._P, function (left, rights) {
        P[left] = {};
        $.each(rights, function (right, rule) { P[left][right] = rule.highlight().value; });
    });

    return { N: N, T: T, P: P, S: this._S.toString() };
}

ConversionGrammar.prototype.toConversionString = function () {
    /// <summary>return a JSON representation of this conversion grammar</summary>
    /// <returns type="String" />

    return JSON.stringify(this.toConversionData());
}

ConversionGrammar.prototype.cleanHighlights = function () {
    /// <summary>clean highlights (except for REMOVED) of this grammar</summary>
    this.modifyHighlights(true);
    return this;
}

ConversionGrammar.prototype.finalize = function () {
    /// <summary>remove temporary highlights and decay special types of highlights in this grammar</summary>
    this.modifyHighlights(false);
    return this;
}

ConversionGrammar.prototype.modifyHighlights = function (clean) {
    /// <summary>remove temporary highlights and decay special types of highlights in this grammar</summary>
    /// <param name="remove" type="Boolean">if false, the highlights will decay and stuff removed, if true, highlights will only be cleaned</param>

    var that = this;
    
    function handler() {
        if (this.highlight() == Highlight.REMOVED && !clean)
            if (this instanceof Symbol)
                 that.removeSymbol(this);
            else that.removeRule(this);
        this.highlight(clean ? Highlight.NONE : this.highlight().decay());
    }
    this.forEachSymbol(handler);
    this.forEachRule(handler);
    return this;
}

ConversionGrammar.prototype.taskAddSymbol = function (symbol) {
    /// <summary>ensure adding symbol to this grammar, return it</summary>
    /// <param name="symbol" type="Symbol">the symbol to add</param>
    var t;
    if (t = this.tryGetSymbol(symbol.toString())) {
        return t;
    }
    symbol.highlight(Highlight.NEW);
    return (symbol.isNonterminal() ? this._N : this._T)[symbol.toString()] = symbol;
}

ConversionGrammar.prototype.taskNewNonterminal = function (text) {
    /// <summary>make up a new nonterminal in this grammar trying to use the desired text representation</summary>
    /// <param name="text" type="String">desired text representation of the new nonterminal (might end up different)</param>
    /// <returns type="Nonterminal" />

    return this.taskAddSymbol(new Nonterminal(this.makeUpNewNonterminalName(text)));
}

ConversionGrammar.prototype.taskRemoveSymbol = function (symbol) {
    /// <summary>make sure this symbol is gone in the next step</summary>
    /// <param name="symbol" type="Symbol">the symbol to remove</param>
    symbol.highlight(Highlight.REMOVED);
}

ConversionGrammar.prototype.taskAddRule = function (left, right) {
    /// <summary>ensure adding a rule with the given left/right sides to this grammar, return the rule</summary>
    /// <param name="left" type="Nonterminal">left side nonterminal</param>
    /// <param name="right" type="Word">right side word</param>
    /// <returns type="Rule" />

    var rights, leftWasNew;
    if (!(rights = this._P[left] = this._P[left] || (leftWasNew = {}))[right])
        rights[right] = new Rule(left, right, Highlight.NEW);
    else
        rights[right].highlight(Highlight.DUPLICATE);

    if (leftWasNew)
        this.rehash();
    this.changed();
    return rights[right];
}

ConversionGrammar.prototype.taskRemoveRule = function (rule) {
    /// <summary>make sure this rule is gone in the next step</summary>
    /// <param name="rule" type="Rule">the rule to remove</param>
    rule.highlight(Highlight.REMOVED);
}

ConversionGrammar.prototype.taskReplaceRule = function (oldRule, newRight) {
    /// <summary>make sure oldRule's right side is replaced with newRight</summary>
    /// <param name="oldRule" type="Rule">the rule the right side of which is to be replaced</param>
    /// <param name="newRight" type="Word">the new right side</param>
    /// <returns type="Rule" />

    this.taskRemoveRule(oldRule);
    var r = this.taskAddRule(oldRule.getLeft(), newRight);
    r.highlight(Highlight.REPLACED);
    return r;
}