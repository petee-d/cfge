function ReducedForm() { }

setupAlgorithmImplementation(
    ReducedForm,
    {
        id: "ReducedForm",
        name: _("reduced"),
        type: "FormConversion"
    }
);

/* 
algorithm:

    removeStupidRules
    
    removeNongenerating
        initTenerating
        (repeat) generatingStep
        removeNTSymbols

    removeNonreachable
        initReachable
        (repeat) reachableStep
        removeSymbols

*/

ReducedForm.main = function (c) {
    /// <summary>convert to reduced normal form</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("convert to reduced normal form"));

    c.task(ReducedForm.removeStupidRules)
     .task(ReducedForm.removeNongenerating)
     .task(ReducedForm.removeNonreachable)
     .task(ReducedForm.cleanUp);
}

ReducedForm.removeStupidRules = function (c) {
    /// <summary>remove rules of type X -> X</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("remove rules of type X -> X"));

    c.g().forEachRule(function (rule, left, right) {
        if (right.length() == 1 && right.contains(left))
            c.g().taskRemoveRule(rule);
    });
}

ReducedForm.removeNongenerating = function (c) {
    /// <summary>remove nonterminals that can't produce a terminal word</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("remove nonterminals that are not 'generating' - can't produce a terminal word"));

    c.task(ReducedForm.initGenerating)
     .task(ReducedForm.generatingStep)
     .task(ReducedForm.removeNTSymbols);
}

ReducedForm.initGenerating = function (c) {
    /// <summary>initialize 'generating' set construction</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("initialize 'generating' set construction"));

    var S = c.s().newSymbolSet('generating', "S/0");
    c.g().forEachTerminal(function (t) {
        t.highlight(Highlight.ATT_OLD);
    });
    c.g().forEachRule(function (rule, left, right) {
        if (right.match('T*', c.g())) {
            rule.highlight(Highlight.ATT_OLD);
            S.add(left);
            left.highlight(Highlight.ATT_NEW);
        }
    });
}

ReducedForm.generatingStep = function (c) {
    /// <summary>iterate 'generating' set construction</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("iterate 'generating' set construction"));

    var S = c.s().getSymbolSet('generating');
    S.name('S/' + (S.name().match(/S\/([0-9]+)/)[1] * 1 + 1));
    c.g().forEachRule(function (rule, left, right) {
        var isGenerating = true;
        right.forEachSymbol(function (symbol) {
            if (symbol.isNonterminal() && !S.contains(symbol))
                isGenerating = false;
        });
        if (isGenerating)
            if (S.add(left)) {
                left.highlight(Highlight.ATT_NEW);
                c.willRepeat();
            }
    });
}

ReducedForm.removeNTSymbols = function (c) {
    /// <summary>remove other nonterminals</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("remove other nonterminals"));

    var S = c.s().getSymbolSet("generating");
    S.name("S");
    c.g().forEachNonterminal(function (n) {
        if (!S.contains(n) && !c.g().getStarting().equals(n))
            c.g().taskRemoveSymbol(n);
    });
}

ReducedForm.removeNonreachable = function (c) {
    /// <summary>remove non-reachable nonterminals</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("remove non-reachable nonterminals"));

    c.g().cleanHighlights();
    c.s().remove("generating");
    c.task(ReducedForm.initReachable)
     .task(ReducedForm.reachableStep)
     .task(ReducedForm.removeNRSymbols);
}

ReducedForm.initReachable = function (c) {
    /// <summary>initialize 'reachable' set construction</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("initialize 'reachable' set construction"));

    var H = c.s().newSymbolSet('reachable', "H/0");
    H.add(c.g().getStarting());
    c.g().getStarting().highlight(Highlight.ATT_NEW);
}

ReducedForm.reachableStep = function (c) {
    /// <summary>iterate 'reachable' set construction</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("iterate 'reachable' set construction"));

    var H = c.s().getSymbolSet("reachable");
    H.name('H/' + (H.name().match(/H\/([0-9]+)/)[1] * 1 + 1));
    c.g().forEachRule(function (rule, left, right) {
        if (H.contains(left)) {
            right.forEachSymbol(function (symbol) {
                if (symbol.isNonterminal())
                    if (H.add(symbol)) {
                        symbol.highlight(Highlight.ATT_NEW);
                        c.willRepeat();
                    }
            });
        }
    });
}

ReducedForm.removeNRSymbols = function (c) {
    /// <summary>remove other nonterminals</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("remove other nonterminals"));

    var H = c.s().getSymbolSet("reachable");
    H.name("H");
    c.g().forEachNonterminal(function (n) {
        if (!H.contains(n))
            c.g().taskRemoveSymbol(n);
    });
}

ReducedForm.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="ReducedForm"></param>
    c.myNameIs(_("done"));

    c.g().cleanHighlights();
    c.s().remove("reachable");
}



ReducedForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    // this gets triggered a lot, so I need a lightweight version of the algorithm

    var shouldContinue = true;
    grammar.forEachRule(function (rule, left, right) {
        if (right.length() == 1 && right.contains(left))
            return shouldContinue = false;
    });
    if (!shouldContinue) return false;

    var S = new SymbolSet(), oldLen = -1;
    while (S.length() > oldLen && (oldLen = S.length(), 1))
        grammar.forEachRule(function (rule, left, right) {
            var isGenerating = true;
            right.forEachSymbol(function (symbol) {
                if (symbol.isNonterminal() && !S.contains(symbol))
                    isGenerating = false;
            });
            if (isGenerating)
                S.add(left, true);
        });
    if (!(S.length() == grammar.getNonterminalCount() ||
         (S.length() == grammar.getNonterminalCount() - 1 && !S.contains(grammar.getStarting())))) return false;

    var H = new SymbolSet(), oldLen = -1;
    H.add(grammar.getStarting(), true);
    while (H.length() > oldLen && (oldLen = H.length(), 1))
        grammar.forEachRule(function (rule, left, right) {
            if (H.contains(left))
                right.forEachSymbol(function (symbol) {
                    if (symbol.isNonterminal())
                        H.add(symbol, true);
                });
        });
    if (H.length() != grammar.getNonterminalCount()) return false;

    return true;
}
