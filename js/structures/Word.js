// class Word - represents a string of symbols

var Word = function (arg, grammar, highlight) {
    /// <summary>construct a Word from a text representation, Symbol[] or Word (copied)</summary>
    /// <param name="arg" type="String">text representation of a word</param>
    /// <param name="arg" type="Symbol[]">array of Symbols (copied)</param>
    /// <param name="arg" type="Word">Word (copied)</param>
    /// <param name="grammar" type="Grammar">container of the alphabets</param>
    /// <returns type="Word" />

    this._w = [];
    this._grammar = grammar;
    this._highlight = highlight || Highlight.NONE;
    if (arg instanceof Word) {
        this._w = arg._w.slice();
        this._grammar = this._grammar || arg._grammar;
    } else if (arg instanceof Array)
        this._w = arg.slice();
    else if (typeof arg == 'string') {
        if (!(this._w = Word.tryParseString(arg, grammar)))
            return MyError('unparsable word ' + arg);
    } else return MyError('bad Word construction');
}

Word.epsStrRE = Word.epsStr = "eps";
Word.strRE = "(?:" + Symbol.strRE + "(?: *" + Symbol.strRE + ")*)";

Word.epsRE = new RegExp("^ *" + Word.epsStrRE + " *$");
Word.RE = new RegExp("^ *" + Word.strRE + " *$");

Word.symbolSeparatorHTML = '<span>&nbsp;</span>';

Word.prototype.isTerminal = function() {
    /// <summary>make sure the word is composed of terminal symbols only</summary>
    /// <returns type="Boolean" />

    var terminalOnly = true;
    $.each(this._w, function(i,e){
        return terminalOnly = e.isTerminal(); // acts as break if false, continue if true
    });
    return terminalOnly;
}

Word.prototype.contains = function (symbol) {
    /// <summary>does this word contain such a symbol?</summary>
    /// <param name="symbol" type="Symbol">symbol to search for</param>
    /// <returns type="Boolean" />

    var contains = false;
    $.each(this._w, function (i, s) {
        if (s.equals(symbol))
            return contains = true;
    });
    return contains;
}

Word.prototype.length = function () {
    /// <summary>return the word's length</summary>
    /// <returns type="Number" />

    return this._w.length;
}

Word.prototype.toString = function () {
    /// <summary>convert to ascii string (bijective)</summary>
    /// <returns type="String" />

    return this._w.length > 0 ? this._w.join(' ') : Word.epsStr;
}

Word.prototype.toElement = function () {
    /// <summary>create an element representing the word</summary>
    /// <returns type="$Element" />

    return $('<span class="word '+ this._highlight.addClass +'"></span>')
        .append(this._w.length > 0 ? $.map(this._w, function (symbol, i) {
            return i == 0 ? symbol.toElement() : [$(Word.symbolSeparatorHTML), symbol.toElement()];
        }) : '<span class="epsilon terminal">&#949;</span>');
}

Word.prototype.forEachSymbol = function (callback) {
    /// <summary>evaluate callback for each symbol in this word</summary>
    /// <param name="callback" type="Function">function(Symbol symbol, Number i)</param>
    /// <returns type="Word" />

    $.each(this._w, function (i, symbol) {
        return callback.call(symbol, symbol, i);
    });

    return this;
}

Word.prototype.match = function (regexp) {
    /// <summary>find out if this word looks like the given regexp</summary>
    /// <param name="regexp" type="String">a special regexp string matching words over N (nonterminals), T (terminals), S (starting nonterminal), R (non-starting nonterminals)</param>

    var grammar = this._grammar;
    return !!$.map(this._w, function (symbol) {
        return symbol.isTerminal() ? 'T' :
            (grammar.getStarting().equals(symbol) ? 'S' : 'R');
    }).join('').match(new RegExp('^(?:' + regexp.toString().replace(/\//g, '').replace(/N/g, '[SR]') + ')$'));
}

Word.prototype.get = function (i) {
    /// <signature>
    /// <summary>get the i-th (starting with i = 0) symbol in this word, or null if the word isn't long enough</summary>
    /// <param name="i" type="Number">index of the desired symbol, starting with 0</param>
    /// <returns type="Symbol" />
    /// </signature>
    /// <signature>
    /// <summary>get an array of all symbols</summary>
    /// <returns type="Array" />
    /// </signature>
    return i == null ? this._w.slice() : this._w[i] || null;
}

Word.prototype.getGrammar = function () {
    /// <summary>return the grammar in which context this word exists</summary>
    /// <returns type="Grammar" />
    return this._grammar;
}

Word.prototype.slice = function (start, end) {
    /// <summary>get a new Word consisting of a substring of this one</summary>
    /// <param name="start" type="Number">zero based index of the first character in the substring</param>
    /// <param name="end" type="Number">(optional) zero based index of the last character in the substring</param>
    return new Word(this._w.slice(start, end), this._grammar);
}

Word.prototype.highlight = function (arg) {
    /// <summary>get (no arguments) or set the highlight</summary>
    /// <param name="arg" type="Highlight">the highlight to set</param>
    if (arg instanceof Highlight)
        this._highlight = Highlight.whichShouldStay(this._highlight, arg);
    return this._highlight;
}

Word.tryParseString = function(text, grammar) {
    /// <summary>(static, private use) try to parse a word, return Symbol[] or null on failure</summary>
    /// <param name="str" type="String">input word</param>
    /// <param name="grammar" type="Grammar">grammar with the aplhabets used to parse the word</param>
    /// <returns type="Symbol[]" />
    
    if (text.match(Word.epsRE)) // epsilon
        return [];
    else {
        var valid = true, a = text.match(/[^ \n\t]+/g); // decompose it
        if(!grammar) try {
            //MyError.warn("parsing without a grammar");
            var word = $.map(a, function (e) {
                if(Symbol.check(e))
                    return Symbol.create(e)
                else 
                    return valid = false;
            });
            return valid ? word : null;
        } catch (e) { return null; }
        else {
            var res = $.map(a, function (e) {
                    var s = grammar.tryGetSymbol(e);
                    if(!s) valid = false;
                    return s;
                });
            return valid ? res : null;
        }
    }
}

Word.check = function (text, grammar) {
    /// <summary>(static) check if the text represents a valid word over the specified grammar</summary>
    /// <param name="text" type="String">word text representation</param>
    /// <param name="grammar" type="Grammar">grammar with the aplhabets used to check the word</param>
    /// <returns type="Boolean" />

    return this.tryParseString(text, grammar) ? true : false;
}

Word.tryCreate = function (text, grammar) {
    /// <summary>try to create a word with the given text representation over the given grammar</summary>
    /// <param name="str" type="String">input word</param>
    /// <param name="grammar" type="Grammar">grammar with the aplhabets used to parse the word</param>
    /// <returns type="Word" />

    return this.check(text, grammar) ?
        new Word(text, grammar) : null;
}