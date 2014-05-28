// class Rule

var Rule = function (left, right, highlight) {
    /// <summary>construct a Rule by specifying the left (Nonterminal) and right side (Word)</summary>
    /// <param name="left" type="Nonterminal">left side</param>
    /// <param name="right" type="Word">right side</param>
    /// <param name="highlight" type="Highlight">optional Highlight</param>
    /// <returns type="Word" />

    if(!(left instanceof Nonterminal) || !(right instanceof Word))
        return MyError('bad Rule construction: ' + left + ', ' + right);
    this._left = left;
    this._right = new Word(right, null, highlight);
    this._highlight = highlight || Highlight.NONE;
}

Rule.prototype.getLeft = function () {
    /// <summary>get the left side Nonterminal</summary>
    /// <returns type="Nonterminal" />

    return this._left;
}

Rule.prototype.getRight = function () {
    /// <summary>get the right side Word</summary>
    /// <returns type="Word" />

    return this._right;
}

Rule.prototype.highlight = function (arg) {
    /// <summary>get (no arguments) or set the highlight</summary>
    /// <param name="arg" type="Highlight">the highlight to set</param>
    if (arg instanceof Highlight)
        this.getRight().highlight(this._highlight = Highlight.whichShouldStay(this._highlight, arg));
    return this._highlight;
}

Rule.prototype.toString = function () {
    /// <summary>return a math-ified string representation of this rule for the user</summary>
    /// <returns type="String" />
    return this._left.toString() + " -> " + this._right.toString()
}

Rule.prototype.toUserString = function () {
    /// <summary>return a math-ified string representation of this rule for the user</summary>
    /// <returns type="String" />
    return makeMath(this._left.toString()) + " → " + makeMath(this._right.toString())
}