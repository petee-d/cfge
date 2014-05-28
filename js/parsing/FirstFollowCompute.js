function FirstFollowCompute() { }

setupAlgorithmImplementation(
    FirstFollowCompute,
    {
        id: "FirstFollowCompute",
        name: _("FIRST & FOLLOW"),
        type: "ParsingAlgorithm"
    }
);

/* 
algorithm:

    computeFirst
        initFirst
        firstFromRules
            (repeat) nextRule4First

    computeFollow
        initFollow
        followFromRules
	        (repeat) nextRule4Follow

*/

FirstFollowCompute.main = function (c) {
    /// <summary>compute the FIRST and FOLLOW sets</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("compute the FIRST and FOLLOW sets"));

    c.task(FirstFollowCompute.computeFirst)
     .task(FirstFollowCompute.computeFollow)
     .task(FirstFollowCompute.cleanUp);

    c.hook(function () {
        var rows = {};
        c.g().forEachNonterminal(function (n) {
            rows[n] = n.toString();
        });
        c.s().newTableStructure("FFset", false, SymbolSet, rows, {});
    });
}

FirstFollowCompute.computeFirst = function (c) {
    /// <summary>compute the FIRST sets for all nonterminals</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("compute the FIRST sets for all nonterminals"));

    c.s().getTableStructure("FFset").addColumn("first", "FIRST");
    c.d().firstSet = { rules: [], current: 0, noChange: 0, end: null };

    c.task(FirstFollowCompute.firstFromRules);
}

FirstFollowCompute.firstFromRules = function (c) {
    /// <summary>fill the sets with appropriate terminals using grammar rules</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("fill the sets with appropriate terminals using grammar rules"));

    var d = c.d().firstSet;
    c.g().forEachRule(function (r) {
        d.rules.push({ l: r.getLeft(), r: r.getRight() });
    })

    c.task(FirstFollowCompute.nextRule4First);
}

FirstFollowCompute.nextRule4First = function (c) {
    /// <summary>process yet another rule (this vizualisation skips rules that have no effect)</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("process yet another rule (this vizualisation skips rules that have no effect)"));

    var d = c.d().firstSet,  // { rules: [{l:, r:}], current: 0, noChange: 0 }
        table = c.s().getTableStructure("FFset");
    (function step() {
        if (d.noChange >= d.rules.length) {
            // we've tried all rules with no effect
            c.myNameIs(_("no other rule would have effect, the sets are complete"));
        } else {
            // we can try if another rule would have effect
            var _r = d.rules[d.current], rule = c.g().tryGetRule(_r.l, _r.r);
            // this might add some terminals/epsilon to the FIRST set of nonterminal rule.getLeft()
            var effect = FirstFollowCompute.addFirsts4Word(c, rule.getRight(), table.get(rule.getLeft(), "first"));

            d.current = (d.current + 1) % d.rules.length;
            if (effect) {
                d.noChange = 0;
                c.willRepeat();
                rule.highlight(Highlight.ATT_TEMP);
            } else {
                d.noChange++;
                step();
            }
        }
    })();
}

FirstFollowCompute.computeFollow = function (c) {
    /// <summary>compute the FOLLOW sets for all nonterminals</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("compute the FOLLOW sets for all nonterminals"));
    
    c.s().getTableStructure("FFset").addColumn("follow", "FOLLOW");

    c.task(FirstFollowCompute.initFollow)
     .task(FirstFollowCompute.followFromRules);
}

FirstFollowCompute.initFollow = function (c) {
    /// <summary>initialize FIRST sets for epsilon-producing nonterminals</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("add a temporary endmarker $ and add it to the starting nonterminal's FOLLOW set"));

    var end = c.g().getEndMarker();
    c.s().getTableStructure("FFset").get(c.g().getStarting(), "follow").add(end);
    c.d().followSet = { rules: [], current: 0, noChange: 0, end: end.toString() };
}

FirstFollowCompute.followFromRules = function (c) {
    /// <summary>fill the sets with appropriate terminals using grammar rules</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("fill the sets with appropriate terminals using grammar rules"));

    var d = c.d().followSet;
    c.g().forEachRule(function (r) {
        d.rules.push({ l: r.getLeft(), r: r.getRight() });
    })

    c.task(FirstFollowCompute.nextRule4Follow);
}

FirstFollowCompute.nextRule4Follow = function (c) {
    /// <summary>process yet another rule (this vizualisation skips rules that have no effect)</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("process yet another rule (this vizualisation skips rules that have no effect)"));

    var d = c.d().followSet,  // { rules: [{l:, r:}], current: 0, noChange: 0, eps: {n:true} }
        table = c.s().getTableStructure("FFset");
        
    (function step() {
        if (d.noChange >= d.rules.length) {
            // we've tried all rules with no effect
            c.myNameIs(_("no other rule would have effect, the sets are complete"));
        } else {
            // we can try if another rule would have effect
            var effect = false;
            var _r = d.rules[d.current], rule = c.g().tryGetRule(_r.l, _r.r);
            // this might add some terminals to the FOLLOW set of any nonterminal in rule.getRight()
            rule.getRight().forEachSymbol(function (s, i) {
                if (!s.isNonterminal()) return true;
                var wasEps = {}, sfollow = table.get(s, "follow");
                if (FirstFollowCompute.addFirsts4Word(c, rule.getRight().slice(i + 1), sfollow, wasEps))
                    effect = true;
                if (wasEps.o)
                table.get(rule.getLeft(), "follow").forEachItem(function (item) {
                        if(sfollow.add(item))
                            effect = true;
                    });
            });

            d.current = (d.current + 1) % d.rules.length;
            if (effect) {
                d.noChange = 0;
                c.willRepeat();
                rule.highlight(Highlight.ATT_TEMP);
            } else {
                d.noChange++;
                step();
            }
        }
    })();
}

FirstFollowCompute.addFirsts4Word = function (c, word, output, noEps) {
    /// <summary>(procedure, not a step) output U= FIRST(word), return whether output was changed by this operation</summary>
    /// <param name="c" type="FirstFollowCompute">some controller with FIRST sets</param>
    /// <param name="word" type="Word">the word to compute FIRST for</param>
    /// <param name="output" type="SymbolSet">set where to add FIRST symbols</param>
    /// <param name="eps" type="Object">if set, output U= FIRST(word) - { eps } and eps.o is set to true in case eps was in FIRST</param>
    /// <returns type="Boolean" />

    var change = 0, eps = new Word([], c.g()), epsPresent = true;
    word.forEachSymbol(function (s, i) {
        var sset = c.s().getTableStructure("FFset").get(s, "first");
        if (s.isNonterminal()) { // then add all FIRSTs
            sset.forEachItem(function (terminalOrEps) {
                if (terminalOrEps instanceof Symbol)
                    change += output.add(terminalOrEps) && 1;
            });
            // if s is eps producing, we want to go on
            if (sset.contains(eps))
                return true;
        } else // FIRST of a terminal only contains itself
            change += output.add(s) && 1;
        // if this is a non-eps producing symbol, there is no eps and we are done
        epsPresent = false;
        return false;
    });
    if (epsPresent)
        if (!noEps)
            change += output.add(new Word([], c.g())) && 1;
        else
            noEps.o = true;
    return change > 0;
}

FirstFollowCompute.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="FirstFollowCompute"></param>
    c.myNameIs(_("done"));

    c.g().cleanHighlights();
}
