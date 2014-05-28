function ChomskyForm() { }

setupAlgorithmImplementation(
    ChomskyForm,
    {
        id: "ChomskyForm",
        name: _("weak Chomsky"),
        type: "FormConversion"
    }
);

/* 
algorithm:

    useFakeTerminals
        addFakeTerminals
        replaceWithFakeTerminals

    prolongShortRules
        addPaddingNonterminal
        usePaddingNonterminal

    subdivideLongRules
        (repeat) iterateSubdivideLongRules

*/

ChomskyForm.main = function (c) {
    /// <summary>convert to Chomsky normal form</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("convert to Chomsky normal form"));

    c.task(ChomskyForm.useFakeTerminals)
     .task(ChomskyForm.prolongShortRules)
     .task(ChomskyForm.subdivideLongRules)
     .task(ChomskyForm.cleanUp);
}

ChomskyForm.useFakeTerminals = function (c) {
    /// <summary>make sure fake terminals are used (each rule is a single terminal or a word over nonterminals)</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("make sure fake terminals are used (each rule is a single terminal or a word over nonterminals)"));

    var good = true;
    c.g().forEachRule(function (rule, left, right) {
        if (!right.match("N*|T", c.g())) {
            good = false;
            rule.highlight(Highlight.ATT_TEMP);
        }
    });
    if (!good)
        c.task(ChomskyForm.addFakeTerminals)
         .task(ChomskyForm.replaceWithFakeTerminals);
}

ChomskyForm.addFakeTerminals = function (c) {
    /// <summary>add fake terminals if none present already</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("add fake terminals if none present already"));

    var fakeSet = c.s().newSymbolSet('fakeTerminals', "T/Fake");
    var fakeMap = c.d().Chomsky_fakeTerminals = {};

    c.g().forEachTerminal(function (t) {
        /* find out if there exists a nonterminal n such that n -> t is the one and only rule for n */
        var found = null;
        c.g().forEachNonterminal(function (n) {
            if (c.g().getRuleCountForLeft(n) == 1) {
                var right = c.g().getAnyRuleForLeft(n).getRight();
                if (right.length() == 1 && right.contains(t)) {
                    found = n;
                    return false;
                }
            }
        });

        /* if no such nonterminals exists, make one */
        if (!found) {
            found = c.g().taskNewNonterminal('F/' + t);
            c.g().taskAddRule(found, new Word([t], c.g()));
        }

        /* now that we have a fake terminal, we need to remember it */
        fakeSet.add(found);
        fakeMap[t] = found.toString();
        found.highlight(Highlight.ATT_TEMP);
    });
}

ChomskyForm.replaceWithFakeTerminals = function (c) {
    /// <summary>replace terminals in bad rules with fake ones</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("replace terminals in bad rules with fake ones"));

    var fakeMap = c.d().Chomsky_fakeTerminals;
    
    c.g().forEachRule(function (rule, left, right) {
        if (!right.match("N*|T", c.g())) {
            var newRight = [];
            right.forEachSymbol(function (s) {
                newRight.push(s.isTerminal() ? c.g().tryGetSymbol(fakeMap[s]) : s);
            });
            c.g().taskReplaceRule(rule, new Word(newRight, c.g()));
        }
    });
}

ChomskyForm.prolongShortRules = function (c) {
    /// <summary>make rules consisting of only one nonterminal longer</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("make rules consisting of only one nonterminal longer"));

    c.s().remove('fakeTerminals');

    /* find out if even necessary */
    var good = true;
    c.g().forEachRule(function (rule, left, right) {
        if (right.match("N", c.g())) {
            good = false;
            rule.highlight(Highlight.ATT_TEMP);
        }
    });

    if(!good)
        c.task(ChomskyForm.addPaddingNonterminal)
         .task(ChomskyForm.usePaddingNonterminal);
}

ChomskyForm.addPaddingNonterminal = function (c) {
    /// <summary>add epsilon-only-producing nonterminal (padding) if none present already</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("add epsilon-only-producing nonterminal if none present already"));

    var epsilonSet = c.s().newSymbolSet('epsilonOnlyNonterminal', "E");

    /* find out if there exists a nonterminal n such that n -> 0 is the one and only rule for n */
    var found = null;
    c.g().forEachNonterminal(function (n) {
        if (c.g().getRuleCountForLeft(n) == 1) {
            var right = c.g().getAnyRuleForLeft(n).getRight();
            if (right.length() == 0) {
                found = n;
                return false;
            }
        }
    });

    /* if no such nonterminals exists, make one */
    if (!found) {
        found = c.g().taskNewNonterminal('Eps');
        c.g().taskAddRule(found, new Word([], c.g()));
    }

    /* now that we have the padding nonterminal, we need to remember it */
    epsilonSet.add(found);
    c.d().Chomsky_epsilonOnlyNonterminal = found.toString();
    found.highlight(Highlight.ATT_TEMP);
}

ChomskyForm.usePaddingNonterminal = function (c) {
    /// <summary>add epsilon-producing padding to each rule containing one nonterminal</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("add epsilon-producing padding to each rule containing one nonterminal"));

    var padding = c.g().tryGetSymbol(c.d().Chomsky_epsilonOnlyNonterminal);

    c.g().forEachRule(function (rule, left, right) {
        if (right.match("N", c.g())) {
            var newRight = [];
            right.forEachSymbol(function (s) {
                newRight.push(s);
            });
            newRight.push(padding);
            c.g().taskReplaceRule(rule, new Word(newRight, c.g()));
        }
    });
}

ChomskyForm.subdivideLongRules = function (c) {
    /// <summary>make sure all nonterminal-only rules have no more than 2 nonterminals</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("make sure all nonterminal-only rules have no more than 2 nonterminals"));

    c.s().remove('epsilonOnlyNonterminal');
    var stack = c.d().Chomsky_subdivideStack = [];

    /* find out if even necessary */
    c.g().forEachRule(function (rule, left, right) {
        if (right.match("NNN+", c.g())) {
            stack.push({ l: left.toString(), r: right.toString(), p: stack.length + 1, i: 1 });
            rule.highlight(Highlight.ATT_TEMP);
        }
    });

    stack.reverse();

    if (stack.length)
        c.task(ChomskyForm.iterateSubdivideLongRules);
}

ChomskyForm.iterateSubdivideLongRules = function (c) {
    /// <summary>process yet another bad rule</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("process yet another bad rule"));

    var stack = c.d().Chomsky_subdivideStack,
        e = stack.pop(), rule = c.g().tryGetRule(e.l, e.r);

    var part = [], rest = [];
    var newN = c.g().taskNewNonterminal('P/' + e.p + '/' + e.i);
    rule.getRight().forEachSymbol(function (s, i) {
        (i == 0 ? part : rest).push(s);
    });
    part.push(newN);

    c.g().taskReplaceRule(rule, new Word(part, c.g()));
    var ruleRest = c.g().taskAddRule(newN, new Word(rest, c.g()));
    /* if the rest of the rule is too long, I need to process it, better in the next step */
    if(rest.length > 2)
        stack.push({ l: ruleRest.getLeft().toString(), r: ruleRest.getRight().toString(), p: e.p, i: e.i + 1 });

    if (stack.length)
        c.willRepeat();
}

ChomskyForm.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="ChomskyForm"></param>
    c.myNameIs(_("done"));
}



ChomskyForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    var good = true;
    grammar.forEachRule(function (rule, left, right) {
        if (!right.match("NN|T|", grammar))
            return good = false;
    });
    return good;
}

