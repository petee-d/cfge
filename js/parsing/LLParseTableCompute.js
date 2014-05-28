function LLParseTableCompute() { }

setupAlgorithmImplementation(
    LLParseTableCompute,
    {
        id: "LLParseTableCompute",
        name: _("LL parse table"),
        type: "ParsingAlgorithm"
    }
);

/* 
algorithm:

    initTable

    processRules
        process

    cleanUp

*/

LLParseTableCompute.main = function (c) {
    /// <summary>create the LL parsing table</summary>
    /// <param name="c" type="LLParseTableCompute"></param>
    c.myNameIs(_("create the LL parsing table"));

    c.task(FirstFollowCompute.main)
     .task(LLParseTableCompute.initTable)
     .task(LLParseTableCompute.processRules)
     .task(LLParseTableCompute.cleanUp);
}

LLParseTableCompute.initTable = function (c) {
    /// <summary>prepare an empty LL parsing table</summary>
    /// <param name="c" type="LLParseTableCompute"></param>
    c.myNameIs(_("prepare an empty LL parsing table"));

    // create the parsing table
    var inputSymbols = {}
    c.g().forEachTerminal(function (t) { inputSymbols[t] = t.toString(); });
    inputSymbols[c.g().getEndMarker()] = c.g().getEndMarker().toString();

    var nonterminals = {};
    c.g().forEachNonterminal(function (n) { nonterminals[n] = n.toString(); });

    c.s().newTableStructure('LLTable', _("LL"), ParserActions, nonterminals, inputSymbols);
}

LLParseTableCompute.processRules = function (c) {
    /// <summary>process each rule in the grammar to add parse table records</summary>
    /// <param name="c" type="LLParseTableCompute"></param>
    c.myNameIs(_("process each rule in the grammar to add parse table records"));

    var rules = c.d().LL_rules = [];
    c.g().forEachRule(function (rule) {
        rules.push(rule);
    });

    if(rules.length)
        c.task(LLParseTableCompute.processRule);
}

LLParseTableCompute.processRule = function (c) {
    /// <summary>process some rule </summary>
    /// <param name="c" type="LLParseTableCompute"></param>
    
    var rule = c.d().LL_currentRule = c.d().LL_rules.shift();

    c.myNameIs(_("process rule %s, start by computing FIRST(%s)",
        makeMath(rule.toString()),
        makeMath(rule.getRight().toString())
        ));

    rule.highlight(Highlight.ATT_TEMP);

    c.s().remove('firstRuleRight'); // clean up after last processRule

    var firsts = c.d().LL_firsts =
        c.s().newSymbolSet('firstRuleRight', _("FIRST(%s)", makeMath(rule.getRight().toString())));
    FirstFollowCompute.addFirsts4Word(c, rule.getRight(), firsts);
    firsts.finalize();
    
    c.task(LLParseTableCompute.addRightFirsts);
    if (firsts.contains(new Word([], c.g())))
        c.task(LLParseTableCompute.addLeftFollows);

    if (c.d().LL_rules.length)
        c.willRepeat();
}

LLParseTableCompute.addRightFirsts = function (c) {
    /// <summary>add this rule to PT[left, a] for each terminal a in FIRST(right)</summary>
    /// <param name="c" type="LLParseTableCompute"></param>

    var rule = c.d().LL_currentRule;

    c.myNameIs(_("add this rule to PT[%s, t] for each terminal t in FIRST(%s)",
        makeMath(rule.getLeft().toString()),
        makeMath(rule.getRight().toString())
        ));

    var firsts = c.d().LL_firsts,
        table = c.s().getTableStructure('LLTable');
    firsts.forEachItem(function (terminalOrEps) {
        if (terminalOrEps instanceof Terminal)
            table.get(rule.getLeft(), terminalOrEps).add(new LLActionProduce(rule));
    });
}

LLParseTableCompute.addLeftFollows = function (c) {
    /// <summary>as epsilon was in FIRST(right), add this rule to PT[left, t] for each terminal (or end marker) t in FOLLOW(left)</summary>
    /// <param name="c" type="LLParseTableCompute"></param>
    
    var rule = c.d().LL_currentRule;

    c.myNameIs(_("as %s was in FIRST(%s), add this rule to PT[%s, t] for each terminal (or end marker) t in FOLLOW(%s)",
        makeMath(new Word([], c.g()).toString()),
        makeMath(rule.getRight().toString()),
        makeMath(rule.getLeft().toString()),
        makeMath(rule.getLeft().toString())
        ));

    var follows = c.s().getTableStructure('FFset').get(rule.getLeft(), 'follow'),
        table = c.s().getTableStructure('LLTable');
    follows.forEachItem(function (terminalOrEnd) {
        table.get(rule.getLeft(), terminalOrEnd).add(new LLActionProduce(rule));
    });
}


LLParseTableCompute.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="LLParseTableCompute"></param>
    c.myNameIs(_("done"));

    c.s().remove('firstRuleRight'); // clean up after last processRule

    c.g().cleanHighlights();
}
