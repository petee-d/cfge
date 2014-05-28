function GreibachForm() { }

setupAlgorithmImplementation(
    GreibachForm,
    {
        id: "GreibachForm",
        name: _("Greibach"),
        type: "FormConversion"
    }
);

/* 
algorithm:

    EpsilonFreeForm.main

    ChainRuleFreeForm.main

    removeEpsilonRule

    enumerateNonterminals
        renameNonterminals

    makeRulesAscending
        (repeat) iterateMakeRulesAscending
            cleanLessThan
                (repeat) expandRule
            cleanEqualTo
                addAuxiliaryNonterminal
                (repeat) iterateCleanEqual

    expandAscendingRules
        (repeat) expandAscendingPerNonterminal
            (repeat) expandRule

    unenumerateNonterminals
        doUnenumerateNonterminals

    restoreEpsilonRule

*/

GreibachForm.main = function (c) {
    /// <summary>convert to Greibach normal form</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("convert to Greibach normal form"));

    c.task(EpsilonFreeForm.main)
     .task(ChainRuleFreeForm.main)
     .task(GreibachForm.removeEpsilonRule)
     .task(GreibachForm.enumerateNonterminals)
     .task(GreibachForm.makeRulesAscending)
     .task(GreibachForm.expandAscendingRules)
     .task(GreibachForm.unenumerateNonterminals)
     .task(GreibachForm.restoreEpsilonRule)
     .task(GreibachForm.cleanUp);
}

GreibachForm.removeEpsilonRule = function (c) {
    /// <summary>if the grammar has an epsilon rule, remove it and remember</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("if the grammar has an epsilon rule, remove it and remember"));

    /* remember true/false if eps was generated */
    var epsRule = c.g().tryGetRule(c.g().getStarting().toString(), Word.epsStr);
    c.d().Greibach_epsilon = !!epsRule;

    /* remove it */
    if (epsRule)
        c.g().taskRemoveRule(epsRule);
}

GreibachForm.enumerateNonterminals = function (c) {
    /// <summary>enumerate all nonterminals, temporarily changing their names</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("enumerate all nonterminals, temporarily changing their names - prepare a mapping"));

    var a = [], backwardsEnum = c.d().Greibach_enumeration = c.g().enumerateNonterminals(true);
    for (var newName in backwardsEnum)
        a.push({ from: Symbol.create(backwardsEnum[newName]), to: Symbol.create(newName) });
    var mapping = c.s().newConstantSymbolMappingStructure('Greibach_enumMap', null, a);

    c.task(GreibachForm.renameNonterminals);
}

GreibachForm.renameNonterminals = function (c) {
    /// <summary>enumerate all nonterminals, temporarily changing their names</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("rename the nonterminals according to the mapping"));

    c.d().Greibach_enumeration = c.g().enumerateNonterminals();
}

GreibachForm.makeRulesAscending = function (c) {
    /// <summary>modify rules so that if [N_k -> N_i ...] is a rule, then i > k</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("modify rules so that if [N<sub>k</sub> -> N<sub>i</sub> ...] is a rule, then i > k"));

    var queue = c.d().Greibach_nonterminalQueue = [];
    
    c.g().forEachNonterminal(function (n) {
        queue.push(n.toString());
    });

    c.task(GreibachForm.iterateMakeRulesAscending);
}

GreibachForm.iterateMakeRulesAscending = function (c) {
    /// <summary>process the next nonterminal</summary>
    /// <param name="c" type="GreibachForm"></param>

    var queue = c.d().Greibach_nonterminalQueue;
    var n = c.g().tryGetSymbol(queue.shift());
    c.myNameIs(_("process the next number k - nonterminal:") + ' ' + n.toString().replace(/\/(.+)/, function (a, b) { return '<sub>' + b + '</sub>'; }));

    c.g().cleanHighlights();
    n.highlight(Highlight.ATT_NEW);
    c.d().Greibach_currentNonterminal = n.toString();

    c.task(GreibachForm.cleanLessThan)
     .task(GreibachForm.cleanEqualTo);

    if (queue.length)
        c.willRepeat();
}

GreibachForm._isBefore = function (a, b) {
    /// <summary>find out if nonterminal a is before symbol b in their enumerated state (both look like X_00047)</summary>
    /// <param name="a" type="Nonterminal">one nonterminal ..</param>
    /// <param name="b" type="Nonterminal">.. and the another</param>

    return a.toString().substr(2)*1 < b.toString().substr(2)*1;
}

GreibachForm.cleanLessThan = function (c) {
    /// <summary>expand rules with i less than k</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("expand rules with i < k"));

    var n = c.g().tryGetSymbol(c.d().Greibach_currentNonterminal),
        queue = c.d().Greibach_expandQueue = [];

    c.g().forEachRuleWithLeft(n, function (rule, left, right) {
        if (right.get(0).isNonterminal() && GreibachForm._isBefore(right.get(0), n)) {
            queue.push(right.toString());
            rule.highlight(Highlight.ATT_NEW);
        }
    });

    if (queue.length)
        c.task(GreibachForm.expandRule);
}

GreibachForm.expandRule = function (c) {
    /// <summary>expand yet another bad rule</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("expand yet another bad rule"));

    var queue = c.d().Greibach_expandQueue,
        badRule = c.g().tryGetRule(c.d().Greibach_currentNonterminal, queue.shift());
    /* get the right part of our rule without the first symbol */
    var rightRest = badRule.getRight().get();
    var leftmost = rightRest.shift();
    
    /* expand the leftmost nonterminal */
    c.g().forEachRuleWithLeft(leftmost, function (rule, left, right) {
        var r = c.g().taskAddRule(badRule.getLeft(), new Word(right.get().concat(rightRest), c.g())),
            newLeftMost = r.getRight().get(0);
        /* the expanded rule could become a bad rule! */
        if (newLeftMost.isNonterminal() && GreibachForm._isBefore(newLeftMost, r.getLeft())) {
            queue.push(r.getRight().toString());
            r.highlight(Highlight.ATT_NEW);
        }
            
    });
    c.g().taskRemoveRule(badRule);

    if (queue.length)
        c.willRepeat();
}

GreibachForm.cleanEqualTo = function (c) {
    /// <summary>get rid of rules with i equal to k</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("get rid of rules with i = k"));

    var n = c.g().tryGetSymbol(c.d().Greibach_currentNonterminal),
        queue = c.d().Greibach_equalToQueue = [];

    c.g().cleanHighlights();
    n.highlight(Highlight.ATT_OLD);

    c.g().forEachRuleWithLeft(n, function (rule, left, right) {
        if (n.equals(right.get(0))) {
            if (right.length() == 1)
                // shouldn't happen with chain-rule-free
                c.g().taskRemoveRule(rule);
            else {
                queue.push(right.toString());
                rule.highlight(Highlight.ATT_TEMP);
            }
        }
    });

    if (queue.length)
        c.task(GreibachForm.addAuxiliaryNonterminal)
         .task(GreibachForm.iterateCleanEqualTo);
}

GreibachForm.addAuxiliaryNonterminal = function (c) {
    /// <summary>add an auxiliary nonterminal optionally generated by good rules</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("add an auxiliary nonterminal optionally generated by good rules"));

    var n = c.g().tryGetSymbol(c.d().Greibach_currentNonterminal),
        auxN = c.g().taskNewNonterminal('M/' + n.toString().substr(2));
    c.d().Greibach_currentAuxiliaryNonterminal = auxN.toString();

    c.g().forEachRuleWithLeft(n, function (rule, left, right) {
        if (!n.equals(right.get(0)))
            c.g().taskAddRule(left, new Word(right.get().concat([auxN]), c.g()));
    });
}

GreibachForm.iterateCleanEqualTo = function (c) {
    /// <summary>add auxiliary nonterminal rules simulating yet another bad rule, then delete it</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("add auxiliary nonterminal rules simulating yet another bad rule, then delete it"));

    var queue = c.d().Greibach_equalToQueue,
        n = c.d().Greibach_currentNonterminal,
        auxN = c.g().tryGetSymbol(c.d().Greibach_currentAuxiliaryNonterminal),
        badRule = c.g().tryGetRule(n, queue.shift()),
        badRuleRight = badRule.getRight().get();
    badRuleRight.shift();
    
    /* get rid of badRule */
    c.g().taskAddRule(auxN, new Word(badRuleRight.concat([auxN]), c.g()));
    c.g().taskAddRule(auxN, new Word(badRuleRight, c.g()));
    c.g().taskRemoveRule(badRule);

    if (queue.length)
        c.willRepeat();
}

GreibachForm.expandAscendingRules = function (c) {
    /// <summary>expand all the bad rules for each left side nonterminal (in descending order)</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("expand all the bad rules for each left side nonterminal (in descending order)"));
    
    var queue = c.d().Greibach_nonterminalStack = [];
    c.g().cleanHighlights();
    
    c.g().forEachNonterminal(function (n) {
        queue.push(n.toString());
    });

    c.task(GreibachForm.expandAscendingPerNonterminal);
}

GreibachForm.expandAscendingPerNonterminal = function (c) {
    /// <summary>process the next nonterminal</summary>
    /// <param name="c" type="GreibachForm"></param>

    var stack = c.d().Greibach_nonterminalStack,
        n = c.g().tryGetSymbol(stack.pop()),
        queue = c.d().Greibach_expandQueue = [];
    c.myNameIs(_("process the next nonterminal:") + ' ' + n.toString().replace(/\/(.+)/, function (a, b) { return '<sub>' + b + '</sub>'; }));
    c.d().Greibach_currentNonterminal = n.toString();

    c.g().cleanHighlights();
    n.highlight(Highlight.ATT_OLD);

    c.g().forEachRuleWithLeft(n, function (rule, left, right) {
        if (right.get(0).isNonterminal()) {
            queue.push(right.toString());
            rule.highlight(Highlight.ATT_NEW);
        }
    });

    if (queue.length)
        c.task(GreibachForm.expandRule);

    if (stack.length)
        c.willRepeat();
}

GreibachForm.unenumerateNonterminals = function (c) {
    /// <summary>try to restore nonterminals' old names</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("try to restore nonterminals' old names"));

    c.g().cleanHighlights();

    c.task(GreibachForm.doUnenumerateNonterminals);
}

GreibachForm.doUnenumerateNonterminals = function (c) {
    /// <summary>rename all old nonterminals, resolve conflicts</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("rename all old nonterminals, resolve conflicts"));

    var deEnum = c.d().Greibach_enumeration, restDeEnum = {};
    c.g().forEachNonterminal(function (n) {
        if (n.toString().match(/M\/[0-9]+/))
            restDeEnum[n] = 'M/' + deEnum[n.toString().replace('M', 'N')];
    });
    c.g().unenumerateNonterminals(deEnum, restDeEnum);
    c.hook(function () {
        c.s().remove('Greibach_enumMap');
    });
}

GreibachForm.restoreEpsilonRule = function (c) {
    /// <summary>add epsilon production back if we've removed it</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("add epsilon production back if we've removed it"));

    if (c.d().Greibach_epsilon)
        c.g().taskAddRule(c.g().getStarting(), new Word([], c.g()));
}

GreibachForm.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("done"));

    c.g().cleanHighlights();
}



GreibachForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    var good = true, epsilon = !!grammar.tryGetRule(grammar.getStarting() + "", Word.epsStr);
    grammar.forEachRule(function (rule, left, right) {
        if (!(right.match(epsilon ? "T[RT]*" : "T[SRT]*", grammar)
                || (left == grammar.getStarting() && right.length() == 0)))
            return good = false;
    });

    return good;
}