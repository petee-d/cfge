function NoLeftRecursionForm() { }

setupAlgorithmImplementation(
    NoLeftRecursionForm,
    {
        id: "NoLeftRecursionForm",
        name: _("no left recursion"),
        type: "FormConversion"
    }
);

/* 
algorithm:

    EpsilonFreeForm.main

    ChainRuleFreeForm.main

    GreibachForm.removeEpsilonRule

    GreibachForm.enumerateNonterminals

    GreibachForm.makeRulesAscending

    GreibachForm.unenumerateNonterminals

    GreibachForm.restoreEpsilonRule

*/

NoLeftRecursionForm.main = function (c) {
    /// <summary>convert to NoLeftRecursion normal form</summary>
    /// <param name="c" type="NoLeftRecursionForm"></param>
    c.myNameIs(_("convert to no left recursion normal form"));

    c.task(EpsilonFreeForm.main)
     .task(ChainRuleFreeForm.main)
     .task(GreibachForm.removeEpsilonRule)
     .task(GreibachForm.enumerateNonterminals)
     .task(GreibachForm.makeRulesAscending)
     .task(GreibachForm.unenumerateNonterminals)
     .task(GreibachForm.restoreEpsilonRule)
     .task(GreibachForm.cleanUp);
}


NoLeftRecursionForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    // worst case O(|P| + |N|^3)
    /* var good1 = !(function () {
        // map each nonterminal to a set of nonterminals that can be first in a 1-step production
        var derivable =  DD = {}, queue = QQ = {};
        grammar.forEachNonterminal(function (n) {
            derivable[n] = {}; queue[n] = [];
            grammar.forEachRuleWithLeft(n, function (_r, _l, r) {
                if (r.length() > 0 && r.get(0).isNonterminal())
                    derivable[n][r.get(0)] = 0;
            });
            for (var m in derivable[n])
                queue[n].push(m);
        });

        // compute that mapping for any amount of steps
        for (var n in derivable) {
            while (queue[n].length)
                for (var l in derivable[queue[n].shift()])
                    if (!derivable[n][l]) {
                        derivable[n][l] = true;
                        queue[n].push(l);
                    }
            // if there is a cyclic production, the grammar has left recursion for this nonterminal
            if (derivable[n][n])
                return true;
        }
    })(); */
    
    // worst case O(|P| + |N|)  - better, huh? :)
    var good2 = !(function () {
        // create a directed graph from the grammar (edge from N to M if  N -> M ...  is a production)
        var incommingN = {}, outgoing = {}, queue = [];
        grammar.forEachNonterminal(function (n) {
            incommingN[n] = 0;
            outgoing[n] = {};
        });
        grammar.forEachRule(function (rule, from, right) {
            if (right.length() < 1 || !right.get(0).isNonterminal())
                return;
            var to = right.get(0).toString();
            if (!outgoing[from][to]) {
                outgoing[from][to] = true;
                incommingN[to]++;
            }
        });
        for (var n in incommingN)
            if (incommingN[n] == 0)
                queue.push(n);

        // find out if a topological ordering exists
        while (queue.length > 0) {
            var n = queue.shift();
            for (var m in outgoing[n])
                if (--incommingN[m] == 0)
                    queue.push(m);
        }
        for (var n in incommingN)
            if (incommingN[n] > 0)
                return true;
    })();

    return good2;
}