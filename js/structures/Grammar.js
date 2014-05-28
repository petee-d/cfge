// class Grammar

var Grammar = function (arg) {
    /// <summary>construct a Grammar from a data object</summary>
    /// <param name="arg" type="Object">data object</param>
    if (arg == "# abstract #") return;
    this.init(arg);
}

Grammar.prototype.init = function(arg){
    /// <summary>initialize a Grammar from a data object</summary>
    /// <param name="arg" type="Object">data object</param>
    var that = this;

    if (!(arg && arg.N && arg.T && arg.P && arg.S))
        return MyError(_('bad Grammar construction: ') + arg);

    if (arg.N.length) {
        // arrays used instead of objects! preprocessing necessary
        var newArg = { N: {}, T: {}, P: {}, S: arg.S };
        for (var i = 0; i < arg.N.length; i++)
            newArg.N[arg.N[i]] = Highlight.NONE;
        for (var i = 0; i < arg.T.length; i++)
            newArg.T[arg.T[i]] = Highlight.NONE;
        for (var left in arg.P) {
            newArg.P[left] = {};
            for (var i = 0; i < arg.P[left].length; i++)
                newArg.P[left][arg.P[left][i]] = Highlight.NONE
        }
        arg = newArg;
    }

    /*  {
            N: { '': 0 } nonterminals, (symbol text: highlight value)
            T: { '': 0 } terminals,
            P: { '': { "": 0 } } rules,
            S: '' start symbol
        }                                          */

    try {

        this._N = {};
        $.each(arg.N, function (n, h) {
            if (!Symbol.check(n))
                throw UserError(_("This symbol is not a valid nonterminal") + ": " + n);
            var sn = new Nonterminal(n, Highlight.get(h));
            that._N[sn] = sn;
        });

        this._T = {};
        $.each(arg.T, function (t, h) {
            if (!Symbol.check(t))
                throw UserError(_("This symbol is not a valid terminal") + ": " + t);
            var st = new Terminal(t, Highlight.get(h));
            that._T[st] = st;
        });

        this._P = {};
        $.each(arg.P, function (left, rights) {
            var sl;
            if (!(sl = that.tryGetSymbol(left)))
                throw UserError(_("The left side must be an existing nonterminal") + ": " + left);
            that._P[sl] = that._P[sl] || {};
            $.each(rights, function (right, h) {
                var sr;
                if (!(sr = Word.tryCreate(right, that)))
                    throw UserError(_("The right side must be a valid word over the alphabets") + ": " + left + " -> " + right);
                that._P[sl][sr] = new Rule(sl, sr, Highlight.get(h));
            });
        });

        if (!(this._S = this.tryGetSymbol(arg.S)))
            throw UserError(_("The start symbol must be a valid existing nonterminal") + ": " + arg.S);

        this._end = new EndMarker();

        this._GUIs = [];
        this._lastChange = new Date();

    } catch (e) { if (e) throw e; else this.fail = true; }
}

Grammar.prototype.tryGetSymbol = function (text) {
    /// <summary>try to find such a symbol in this grammar and return it's instance (or null otherwise)</summary>
    /// <param name="text" type="String">text representation of the symbol</param>
    /// <returns type="Symbol" />

    return this._T[text] || this._N[text] || (this._end.toString() == text ? this._end : null);
}

Grammar.prototype.getEndMarker = function () {
    /// <returns type="Terminal" />
    return this._end;
}

Grammar.prototype.tryGetRule = function (left, right) {
    /// <summary>try to find such a rule in this grammar and return it's instance (or null otherwise)</summary>
    /// <param name="left" type="String">text representation of the left side nonterminal</param>
    /// <param name="right" type="String">text representation of the right side word</param>
    /// <returns type="Rule" />

    return (this._P[left] || {})[right] || null;
}

Grammar.prototype.toData = function () {
    /// <summary>return a data object representation of this grammar</summary>
    /// <returns type="Object" />

    var P = {};
    $.each(this._P, function (left, rights) {
        P[left] = $.map(rights, function (rule) { return rule.getRight().toString(); });
    });

    return {
        N: $.map(this._N, function (symbol) { return symbol.toString(); }),
        T: $.map(this._T, function (symbol) { return symbol.toString(); }),
        P: P, S: this._S.toString()
    };
}

Grammar.prototype.toString = function () {
    /// <summary>return a JSON representation of this grammar</summary>
    /// <returns type="String" />

    return JSON.stringify(this.toData());
}

Grammar.prototype.rehash = function () {
    /// <summary>(private use) maintain the grammar's internal objects after changes, including ordering of rule groups</summary>

    var that = this, temp = { N: this._N, T: this._T, P: this._P };
    var s = that.getStarting().toString();
    var comparator = s != "N/1" ?
        function (a, b) {
            return a == s ? -1 : (b == s ? 1 : (a < b ? -1 : 1));
        } :
        function (a, b) {
            return a < b ? -1 : 1;
        };
    $.extend(this, { _N: {}, _T: {}, _P: {} });

    // after clearing the old objects, hash nonterminals, terminals and rules
    $.each(temp.N, function (_n, n) {
        that._N[n] = n;
    });
    sortObjectKeys(that._N, comparator);

    $.each(temp.T, function (_t, t) {
        that._T[t] = t;
    });

    $.each(temp.P, function (_l, rights) {
        if (!getAnyProperty(rights))
            return true;
        var nr = that._P[getAnyProperty(rights).getLeft()] = {};
        $.each(rights, function (_r, rule) {
            nr[rule.getRight()] = rule;
        });
    });
    sortObjectKeys(that._P, comparator);
}

Grammar.prototype.changed = function (noUpdate) {
    /// <summary>use to report changes already done in the grammar, is used for scheduling auto-updating registered GUI</summary>
    /// <param name="noUpdate" type="$Element">(optional) GUI container to exclude from html update</param>

    // schedule GUI update
    var that = this;
    this._GUIs.toBeUpdated = true;
    this._lastChange = new Date();
    if (that._GUIs.length)
        setTimeout(function () {
            if (that._GUIs.toBeUpdated) {
                that._GUIs.toBeUpdated = false;
                that.rewriteGUIs(noUpdate);
            }
        }, 0);
    
}

Grammar.prototype.lastChange = function () {
    /// <returns type="Date" />
    return this._lastChange;
}

Grammar.prototype.rewriteGUIs = function (exclude) {
    /// <summary>fills each registered GUI still existing in the DOM tree with fresh grammar html</summary>
    /// <param name="exclude" type="$Element">(optional) GUI container to exclude from html update</param>

    var that = this;
    $.each(this._GUIs, function (i, e) {
        if ($(e) && $(e).width()) {
            if (!$(e).is(exclude))
                that.drawInto($(e), true);
            Evaluator.update(Current.grammar);
        }
    });
}

Grammar.prototype.removeRulesLeft = function (n) {
    /// <summary>search & destroy rules with n as their left side</summary>
    /// <param name="n" type="Nonterminal">nonterminal to search for</param>

    if (n.isNonterminal())
        delete this._P[n];
    this.changed();
}

Grammar.prototype.removeRulesContainingRight = function (symbol) {
    /// <summary>search & destroy rules with symbol in their right side</summary>
    /// <param name="symbol" type="Symbol">symbol to search for</param>

    $.each(this._P, function (_l, rights) {
        $.each(rights, function (_r, rule) {
            if (rule.getRight().contains(symbol))
                delete rights[_r];
        });
    });
    this.rehash();
    this.changed();
}

Grammar.prototype.getNonterminalCount = function(){
    /// <summary>returns the count of nonterminals in this grammar</summary>

    return getPropertyCount(this._N);
}

Grammar.prototype.getTerminalCount = function(){
    /// <summary>returns the count of terminals in this grammar</summary>

    return getPropertyCount(this._T);
}

Grammar.prototype.getRuleCountForLeft = function (left) {
    /// <summary>returns the count of rules in this grammar with left as the left side</summary>
    /// <param name="left" type="Nonterminal">the left side to search for</param>
    
    return this._P[left] ? getPropertyCount(this._P[left]) : 0;
}

Grammar.prototype.getAnyRuleForLeft = function (left) {
    /// <summary>returns one of rules in this grammar with left as the left side</summary>
    /// <param name="left" type="Nonterminal">the left side to search for</param>
    /// <returns type="Rule" />

    return this._P[left] ? getAnyProperty(this._P[left]) : null;
}

Grammar.prototype.getStarting = function () {
    /// <summary>return the starting nonterminal in this grammar</summary>
    /// <returns type="Nonterminal" />

    return this._S;
}

Grammar.tryCreate = function (obj) {
    /// <summary>check whether the argument is a valid grammar object and create it if yes, throw user errors</summary>
    /// <param name="obj" type="Object">Object representation of the grammar to be created</param>
    /// <returns type="Grammar" />

    if (!(obj && obj.N && obj.T && obj.P && obj.S))
        return MyError(_('bad Grammar check: ') + obj);

    var g = new Grammar(obj);
    return !g.fail ? g : null;
}

Grammar.prototype.forEachNonterminal = function (callback) {
    /// <summary>evaluate callback for each nonterminal in this grammar</summary>
    /// <param name="callback" type="Function">function(Nonterminal n)</param>
    /// <returns type="Grammar" />

    var starting = this._S;
    if (callback.call(starting, starting) !== false)

        $.each(this._N, function (_n, n) {
            if (starting.equals(n)) return true;
            return callback.call(n, n);
        });

    return this;
}
Grammar.prototype.forEachTerminal = function (callback) {
    /// <summary>evaluate callback for each terminal in this grammar</summary>
    /// <param name="callback" type="Function">function(Terminal t)</param>
    /// <returns type="Grammar" />

    $.each(this._T, function (_t, t) {
        return callback.call(t, t);
    });

    return this;
}
Grammar.prototype.forEachSymbol = function (callback) {
    /// <summary>evaluate callback for each symbol in this grammar</summary>
    /// <param name="callback" type="Function">function(Symbol s)</param>
    /// <returns type="Grammar" />

    this.forEachNonterminal(callback);
    this.forEachTerminal(callback);
    return this;
}

Grammar.prototype.forEachRule = function (callback) {
    /// <summary>evaluate callback for each rule in this grammar</summary>
    /// <param name="callback" type="Function">function(Rule rule, Nonterminal leftSide, Word rightSide)</param>
    /// <returns type="Grammar" />
    
    var stop = false;
    $.each(this._P, function (left, rights) {
        $.each(rights, function (right, rule) {
            if (stop = false == callback.call(rule, rule, rule.getLeft(), rule.getRight()))
                return false;
        });
        if(stop) return false;
    });

    return this;
}

Grammar.prototype.forEachRuleWithLeft = function (left, callback) {
    /// <summary>evaluate callback for each rule with given left side in this grammar</summary>
    /// <param name="left" type="Nonterminal">left side nonterminal, other rules will be ignored</param>
    /// <param name="callback" type="Function">function(Rule rule, Nonterminal leftSide, Word rightSide)</param>
    /// <returns type="Grammar" />

    if(this._P[left])
        $.each(this._P[left], function (right, rule) {
            return callback.call(rule, rule, rule.getLeft(), rule.getRight());
        });

    return this;
}

Grammar.prototype.makeUpNewNonterminalName = function (desiredName, usedSet) {
    /// <summary>use the built-in heuristic to make up a good non-conflicting name for a new symbol</summary>
    /// <param name="desiredName" type="String">the name that would be the best</param>
    /// <param name="usedSet" type="Object">if specified, the properties of this set will be used instead of tryGetSymbol on this grammar</param>
    /// <returns type="String" />
    while (usedSet ? usedSet[desiredName] : this.tryGetSymbol(desiredName))
        desiredName += '/0';
    return desiredName;
}

Grammar.prototype.enumerateNonterminals = function (onlyPrepare) {
    /// <summary>enumerate nonterminals in this grammar and rename them to the form N/i</summary>
    /// <param name="onlyPrepare" type="Boolean">if set, nonterminals aren't actually renamed - just return a mapping</param>
    /// <returns type="Object">hash map mapping enumerated names to original names</returns>

    var i = 1, map = {},
        /* we want to give the numbers some zero padding, so that they sort well */
        zeros = "0000000000".substring(0, this.getNonterminalCount().toString().length);
    this.forEachNonterminal(function (n) {
        var newName = "N/" + zeros.substr(i.toString().length) + i;
        map[newName] = n.toString();
        if (!onlyPrepare)
            n.rename(newName);
        i++;
    });
    if (!onlyPrepare) {
        this.rehash();
        this.changed();
    }
    
    return map;
}

Grammar.prototype.unenumerateNonterminals = function (mapping, auxiliaryMapping) {
    /// <summary>rename each nonterminal by using the given (incomplete) mapping, nonmapped nonterminals may be renamed to avoid conflicts</summary>
    /// <param name="mapping" type="Object">incomplete mapping (hash oldName -> newName)</param>

    var usedNames = {}, that = this, restOf = [];

    if (auxiliaryMapping) {
        /* first do a dirty auxiliary mapping */
        this.forEachNonterminal(function (n) {
            if (auxiliaryMapping[n]) {
                n.rename(auxiliaryMapping[n]);
            }
        });
        this.rehash();
    }

    /* do the nonterminals with mapping specified */
    this.forEachNonterminal(function (n) {
        if (mapping[n]) {
            usedNames[mapping[n]] = true;
            n.rename(mapping[n]);
        } else restOf.push(n);
    });
    
    /* then do the rest, resolving conflicts */
    $.each(restOf, function (i, n) {
        var name = that.makeUpNewNonterminalName(n.toString(), usedNames);
        usedNames[name] = true;
        n.rename(name);
    });

    this.rehash();
    this.changed();
}



/*
######################################################################

The definition of methods for this class continues in file RichInput.js

######################################################################
*/