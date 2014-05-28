function ChainRuleFreeForm() { }

setupAlgorithmImplementation(
    ChainRuleFreeForm,
    {
        id: "ChainRuleFreeForm",
        name: _("chain-rule-free"),
        type: "FormConversion"
    }
);

/* 
algorithm:

    makeChainReachableSets
        (repeat) constructChainReachableSet
            (repeat) chainReachableStep

    addChainReachableRules
        (repeat) processSingleNonterminal

    removeChainRules

*/

ChainRuleFreeForm.main = function (c) {
    /// <summary>convert to chain-rule-free normal form</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("convert to chain-rule-free normal form"));

    c.task(ChainRuleFreeForm.makeChainReachableSets)
     .task(ChainRuleFreeForm.addChainReachableRules)
     .task(ChainRuleFreeForm.removeChainRules)
     .task(ChainRuleFreeForm.cleanUp);
}

ChainRuleFreeForm.makeChainReachableSets = function (c) {
    /// <summary>find chain-reachable set for each nonterminal</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("find chain-reachable set for each nonterminal"));

    c.g().forEachRule(function (rule, left, right) {
        if (right.match("N", c.g()))
            rule.highlight(Highlight.ATT_TEMP);
    });

    var s = c.d().chainFree_nonterminalData = [];
    c.g().forEachNonterminal(function (n) {
        s.push(n.toString());
    });

    c.task(ChainRuleFreeForm.constructChainReachableSet);
}

ChainRuleFreeForm.constructChainReachableSet = function (c) {
    /// <summary>construct the 'chain-reachable' set for yet another nonterminal</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("construct the 'chain-reachable' set for yet another nonterminal"));

    if (c.d().chainFree_CN)
        c.s().getSymbolSet('chainReachable_' + c.d().chainFree_CN).name('M/' + c.d().chainFree_CN);

    var s = c.d().chainFree_nonterminalData;
    var n = c.g().tryGetSymbol(c.d().chainFree_CN = s.shift());
    var M = c.s().newSymbolSet('chainReachable_' + c.d().chainFree_CN, 'M/' + c.d().chainFree_CN + '/0');
    c.d().chainFree_CNI = 0;
    M.add(n);
    c.g().cleanHighlights();
    n.highlight(Highlight.ATT_NEW);

    c.task(ChainRuleFreeForm.chainReachableStep);
    if (s.length) c.willRepeat();
}

ChainRuleFreeForm.chainReachableStep = function (c) {
    /// <summary>iterate 'chain-reachable' set construction</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("iterate 'chain-reachable' set construction"));

    var M = c.s().getSymbolSet('chainReachable_' + c.d().chainFree_CN);
    M.name('M/' + c.d().chainFree_CN + '/' + (++c.d().chainFree_CNI));

    c.g().forEachRule(function (rule, left, right) {
        if (!M.contains(left))
            return true; // skip
        var n;
        if (right.match("N", c.g()))
            if (M.add(n = right.get(0))) {
                n.highlight(Highlight.ATT_NEW);
                c.willRepeat();
            }
    });
}

ChainRuleFreeForm.addChainReachableRules = function (c) {
    /// <summary>expand chain-reachable rules</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("expand chain-reachable rules"));

    c.g().cleanHighlights();
    if (c.d().chainFree_CN)
        c.s().getSymbolSet('chainReachable_' + c.d().chainFree_CN).name('M/' + c.d().chainFree_CN);

    var s = c.d().chainFree_nonterminalData = [];
    c.g().forEachNonterminal(function (n) {
        s.push(n.toString());
    });

    c.task(ChainRuleFreeForm.processSingleNonterminal);
}

ChainRuleFreeForm.processSingleNonterminal = function (c) {
    /// <summary>add rules chain-reachable from yet another nonterminal</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("add rules reachable from yet another nonterminal"));

    var s = c.d().chainFree_nonterminalData;
    var n = c.g().tryGetSymbol(s.shift());
    n.highlight(Highlight.ATT_TEMP);
    var M = c.s().getSymbolSet('chainReachable_' + n.toString(), 'M/' + n.toString() + '/0');

    c.g().forEachRule(function (rule, left, right) {
        if (left != n && M.contains(left))
            c.g().taskAddRule(n, new Word(right));
    });

    if (s.length) c.willRepeat();
}

ChainRuleFreeForm.removeChainRules = function (c) {
    /// <summary>remove the chain rules, they are redundant now</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("remove the chain rules, they are redundant now"));

    c.g().forEachRule(function (rule, left, right) {
        if (right.match("N", c.g()))
            c.g().taskRemoveRule(rule);
    });
}

ChainRuleFreeForm.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="ChainRuleFreeForm"></param>
    c.myNameIs(_("done"));

    c.g().forEachNonterminal(function (n) {
        c.s().remove("chainReachable_" + n.toString());
    });
}



ChainRuleFreeForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    var good = true;
    grammar.forEachRule(function (rule, left, right) {
        if (right.match("N", grammar))
            return good = false;
    });
    return good;
}