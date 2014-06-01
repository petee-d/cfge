function CLRParseTableCompute() { }

setupAlgorithmImplementation(
    CLRParseTableCompute,
    {
        id: "CLRParseTableCompute",
        name: _("CLR parse table"),
        type: "ParsingAlgorithm",
        parent: SLRParseTableCompute
    }
);

/* 
algorithm:

    initItems

    processStates
        processState
            closure
                closureStep
            addReductions
            createGotoSets
                createGotoSetsForSymbol

    cleanUp

*/

CLRParseTableCompute.main = function (c) {
    /// <summary>create the LR parsing table and automaton graph</summary>
    /// <param name="c" type="CLRParseTableCompute"></param>
    c.myNameIs(_("create the CLR parsing table and automaton graph"));

    c.task(FirstFollowCompute.main)
     .task(SLRParseTableCompute.initItems)
     .task(SLRParseTableCompute.processStates)
     .task(SLRParseTableCompute.cleanUp);
}

CLRParseTableCompute.prototype.initialLookeahead = function (c) {
    /// <summary>create a lookahead array of the initial item - in SLR there is no item lookahead</summary>
    /// <param name="c" type="CLRParseTableCompute"></param>
    /// <returns type="Array" />
    return [c.g().getEndMarker()];
}

CLRParseTableCompute.prototype.getTableName = function (c) {
    /// <summary>get the name for the LR parsing table created by this algorithm</summary>
    /// <param name="c" type="CLRParseTableCompute"></param>
    /// <returns type="String" />
    return _("CLR");
}

CLRParseTableCompute.prototype.createItemsByClosureExpansion = function (c, oldItem, rule) {
    /// <summary>create an array of items produced by expanding `oldItem`'s current nonterminal to `rule`</summary>
    /// <param name="c" type="CLRParseTableCompute"></param>
    /// <param name="oldItem" type="LRItem">item the current's nonterminal is being expanded</param>
    /// <param name="rule" type="Rule">rule to expand</param>
    /// <returns type="Array" />
    var firsts = new SymbolSet(),
        rest = oldItem.getWordAfterSymbolAfterDot(),
        firstsFrom = new Word(rest.get().concat([oldItem.getLookahead()[0]]), c.g()),
        result = [], epsInFirst = {};

    // calculate firsts := FIRST(rest) - { eps }
    FirstFollowCompute.addFirsts4Word(c, rest, firsts, epsInFirst);
    // if epsilon was in FIRST(rest), also add lookaheads
    if (epsInFirst.o)
        $.each(oldItem.getLookahead(), function (i, t) {
            firsts.add(t);
        });
    // create items
    firsts.finalize().forEachItem(function (t) {
        result.push(new LRItem(rule, 0, [t]));
    });
    return result;
}
