function EpsilonFreeForm() { }

setupAlgorithmImplementation(
    EpsilonFreeForm,
    {
        id: "EpsilonFreeForm",
        name: _("epsilon-free"),
        type: "FormConversion"
    }
);

/* 
algorithm:

    findEpsilonProducing
        (repeat) producingStep

    addCrossedOutRules
        (repeat) processSingleRule

    removeEpsilonRules

    fixEpsilonProduction

*/

EpsilonFreeForm.main = function (c) {
    /// <summary>convert to epsilon-free normal form</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("convert to epsilon-free normal form"));

    c.task(EpsilonFreeForm.findEpsilonProducing)
     .task(EpsilonFreeForm.addCrossedOutRules)
     .task(EpsilonFreeForm.removeEpsilonRules)
     .task(EpsilonFreeForm.fixEpsilonProduction)
     .task(EpsilonFreeForm.cleanUp);
}

EpsilonFreeForm.findEpsilonProducing = function (c) {
    /// <summary>find epsilon-producing nonterminals</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("find epsilon-producing nonterminals"));

    c.g().forEachRule(function (rule, left, right) {
        if (right.length() == 0)
            rule.highlight(Highlight.ATT_NEW);
    });

    c.task(EpsilonFreeForm.producingStep);
}

EpsilonFreeForm.producingStep = function (c) {
    /// <summary>iterate 'epsilon-producing' set construction</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("iterate 'epsilon-producing' set construction"));

    var H;
    if (H = c.s().getSymbolSet('epsProducing'))
        H.name('H/' + (H.name().match(/H\/([0-9]+)/)[1] * 1 + 1));
    else
        H = c.s().newSymbolSet('epsProducing', "H/0");

    c.g().forEachRule(function (rule, left, right) {
        if (H.contains(left))
            return true; // skip
        var containsOnlyProducing = true;
        right.forEachSymbol(function (s) {
            if (!H.contains(s))
                return containsOnlyProducing = false;
        });
        if (containsOnlyProducing) {
            H.add(left); // should always be a new addition
            left.highlight(Highlight.ATT_NEW);
            c.willRepeat();
        }
    });
}

EpsilonFreeForm.addCrossedOutRules = function (c) {
    /// <summary>add crossed out versions of rules containing nonterminals from H</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("add crossed out versions of rules containing nonterminals from H"));

    var s = c.d().epsFree_badRuleData = [];
    var H = c.s().getSymbolSet('epsProducing');
    H.name("H");
    c.g().cleanHighlights();
    c.g().forEachRule(function (rule, left, right) {
        var data = { ruleLeft: left.toString(), ruleRight: right.toString(), badCount: 0 };
        right.forEachSymbol(function (s) {
            if (H.contains(s))
                data.badCount++;
        });
        if (data.badCount) {
            s.push(data);
            rule.highlight(Highlight.ATT_TEMP);
        }
    });

    if(s.length)
        c.task(EpsilonFreeForm.processSingleRule);
}

EpsilonFreeForm.processSingleRule = function (c) {
    /// <summary>process yet another bad rule</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("process yet another bad rule"));

    var s = c.d().epsFree_badRuleData;
    var H = c.s().getSymbolSet('epsProducing');
    var data = s.shift(), rule = c.g().tryGetRule(data.ruleLeft, data.ruleRight);
    rule.highlight(Highlight.ATT_TEMP);

    var w = []; // this serves as an optimization, Word.forEachSymbol inside the for loop would be too slow
    rule.getRight().forEachSymbol(function (s) { w.push(s); });

    for (var mask = 0; mask < (1 << data.badCount) - 1; mask++) {
        var badCounter = 0, newWord = [];

        for (var j = 0; j < w.length; j++)
            if (H.contains(w[j])) {
                if ((1 << badCounter++) & mask)
                    newWord.push(w[j]);
            } else newWord.push(w[j]);
        if (newWord.length) // we don't wanna add another epsilon rule
            c.g().taskAddRule(rule.getLeft(), new Word(newWord, c.g()));
    }

    if (s.length)
        c.willRepeat();
}

EpsilonFreeForm.removeEpsilonRules = function (c) {
    /// <summary>remove epsilon rules</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("remove epsilon rules"));

    c.g().forEachRule(function (rule, left, right) {
        if (right.length() == 0)
            c.g().taskRemoveRule(rule);
    });
}

EpsilonFreeForm.fixEpsilonProduction = function (c) {
    /// <summary>if the original grammar generates empty word, fix the new one</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("if the original grammar generates empty word, fix the new one"));

    var H = c.s().getSymbolSet('epsProducing'), starting = c.g().getStarting();
    if (H.contains(starting)) {
        // epsilon production needs restoring... can I just add a starting -> epsilon rule?
        // I can only do that, if the starting nonterminal is not reachable from any other terminal in the grammar
        var good = true;
        c.g().forEachRule(function (rule, left, right) {
            if (!(right.match("[RT]+", c.g())))
                return good = false;
        });
        if (!good) {
            // I cannot simply add a starting -> epsilon rule, I need to make up a new starting nonterminal
            var newS = c.g().taskNewNonterminal("S");
            c.g().tryChangeStartingNonterminal(newS.toString());
            c.g().taskAddRule(newS, new Word([starting], c.g()));
            starting = newS;
        }
        c.g().taskAddRule(starting, new Word(Word.epsStr, c.g()));
    }
}

EpsilonFreeForm.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="EpsilonFreeForm"></param>
    c.myNameIs(_("done"));

    c.s().remove("epsProducing");
}



EpsilonFreeForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    var good = true;
    grammar.forEachRule(function (rule, left, right) {
        if (right.length() == 0)
            return good = false;
    });
    if (!good) {
        good = true;
        grammar.forEachRule(function (rule, left, right) {
            if (!(right.match("[RT]+", grammar)
                    || (left == grammar.getStarting() && right.length() == 0)))
                return good = false;
        });
    }
    return good;
}