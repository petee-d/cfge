// abstract class Symbol - represents a symbol (terminal/nonterminal)
// class Terminal
// class Nonterminal
//#########################

// abstract class Symbol

// (abstract) constructor
var Symbol = function () {
    var _text = new String();
}

Symbol.endMarkerStr = "$";

Symbol.termStartStrRE = "[a-z0-9~!@#_';:\\+\\-\\*\\/\\(\\)\\[\\]\\?]";
Symbol.nontermStartStrRE = "[A-Z]";
Symbol.singleStrRE = "[a-zA-Z0-9~!@#_';:\\+\\-\\*\\/\\(\\)\\[\\]\\?]";
Symbol.strRE = "(?:" + Symbol.singleStrRE + "+)";
Symbol.indexStrRE = "(?:(" + Symbol.singleStrRE + "+?)\/(" + Symbol.singleStrRE + "+))";

Symbol.termStartRE = new RegExp("^" + Symbol.termStartStrRE + "$");
Symbol.nontermStartRE = new RegExp("^" + Symbol.nontermStartStrRE + "$");
Symbol.RE = new RegExp("^" + Symbol.strRE + "$");
Symbol.indexRE = new RegExp("^" + Symbol.indexStrRE + "$");

Symbol.prototype.equals = function(o) {
    /// <summary>compare two symbols</summary>
    /// <param name="o" type="Symbol">another symbol</param>
    /// <returns type="Boolean" />
    
    return o instanceof Symbol && this._text == o._text;
}

Symbol.prototype.isNonterminal = function () {
    /// <returns type="Boolean" />

    return !this.isTerminal();
}

Symbol.prototype.toString = function () {
    /// <summary>text-only representation</summary>
    /// <returns type="String" />

    return this._text;
}
Symbol.prototype.toElement = function () {
    /// <summary>create an element representing the symbol, no highlighting</summary>
    /// <returns type="$Element" />

    var indexed = this._text.match(Symbol.indexRE) || [0, this._text];
    return $('<span value="' + this._text + '" ' +
                'class="' + this.getClass() + ' ' + this._highlight.addClass + '">' + indexed[1] +
                (indexed[2] ? '<sub>' + indexed[2] + '</sub>' : '') + '</span>');
}

Symbol.prototype.rename = function (text) {
    /// <summary>change the name of this symbol (must represent a symbol of the same type)</summary>
    /// <param name="text" type="String">new text representation</param>

    if (Symbol.check(text) && this.isTerminal() === Symbol.isTerminal(text))
        this._text = text;
    else return MyError("bad renaming of symbol " + this + " to " + text);
}

Symbol.prototype.highlight = function (arg) {
    /// <summary>get (no arguments) or set the highlight</summary>
    /// <param name="arg" type="Highlight">the highlight to set</param>
    if (arg instanceof Highlight)
        this._highlight = Highlight.whichShouldStay(this._highlight, arg);
    return this._highlight;
}




// static methods

Symbol.isTerminal = function(text){
    /// <summary>find out if the text represents a terminal symbol in case it really is a symbol</summary>
    /// <param name="text" type="String">text representation</param>
    /// <returns type="Boolean" />

    return !!(text.charAt(0).match(Symbol.termStartRE));
}
Symbol.isNonterminal = function (text) {
    /// <summary>find out if the text represents a nonterminal symbol in case it really is a symbol</summary>
    /// <param name="text" type="String">text representation</param>
    /// <returns type="Boolean" />

    return !!(text.charAt(0).match(Symbol.nontermStartRE));
}
Symbol.isTerminalSymbol = function (text) {
    /// <summary>find out if the text represents a symbol and it is terminal</summary>
    /// <param name="text" type="String">text representation</param>
    /// <returns type="Boolean" />

    return !!(Symbol.check(text) && text.charAt(0).match(Symbol.termStartRE));
}
Symbol.isNonterminalSymbol = function (text) {
    /// <summary>find out if the text represents a symbol and it is nonterminal</summary>
    /// <param name="text" type="String">text representation</param>
    /// <returns type="Boolean" />

    return !!(Symbol.check(text) && text.charAt(0).match(Symbol.nontermStartRE));
}
Symbol.check = function (text) {
    /// <summary>(static) check if the text represents a valid symbol</summary>
    /// <param name="text" type="String">symbol text representation</param>
    /// <returns type="Boolean" />

    return !!(text.match(Symbol.RE));

}

Symbol.create = function (text) {
    /// <summary>(static) create a terminal/nonterminal symbol</summary>
    /// <param name="text" type="String">symbol text representation</param>
    /// <returns type="Symbol" />

    return Symbol.isTerminal(text) ? new Terminal(text) : new Nonterminal(text);
}




// class Terminal extends Symbol

var Terminal = function (text, highlight, onlyException) {

    if (!text) return;
    if (!Symbol.isTerminalSymbol(text)) {
        if (onlyException)
            throw 0;
        else return MyError('bad Terminal construction: ' + text);
    }
    this._text = text;
    this._highlight = highlight || Highlight.NONE;

}
Terminal.prototype = new Symbol();
Terminal.prototype.isTerminal = function () {
    /// <returns type="Boolean" />

    return true;
}
Terminal.prototype.getClass = function () {
    return 'terminal';
}





// class Nonterminal extends Symbol

function Nonterminal(text, highlight, onlyException) {

    if (!Symbol.isNonterminalSymbol(text)) {
        if (onlyException)
            throw 0;
        else return MyError('bad Nonterminal construction: ' + text);
    }
    this._text = text;
    this._highlight = highlight || Highlight.NONE;

}
Nonterminal.prototype = new Symbol();
Nonterminal.prototype.isTerminal = function () {
    /// <returns type="Boolean" />

    return false;
}
Nonterminal.prototype.getClass = function () {
    return 'nonterminal';
}




function EndMarker() {

    this._text = Symbol.endMarkerStr;
    this._highlight = Highlight.NONE;

}
EndMarker.prototype = new Terminal();