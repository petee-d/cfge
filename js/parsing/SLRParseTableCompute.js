function SLRParseTableCompute() { }

setupAlgorithmImplementation(
    SLRParseTableCompute,
    {
        id: "SLRParseTableCompute",
        name: _("SLR parse table"),
        type: "ParsingAlgorithm"
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

SLRParseTableCompute.main = function (c) {
    /// <summary>create the LR parsing table and automaton graph</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("create the SLR parsing table and automaton graph"));

    c.task(FirstFollowCompute.main)
     .task(SLRParseTableCompute.initItems)
     .task(SLRParseTableCompute.processStates)
     .task(SLRParseTableCompute.cleanUp);
}

SLRParseTableCompute.prototype.initialLookeahead = function (c) {
    /// <summary>create a lookahead array of the initial item - in SLR there is no item lookahead</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    /// <returns type="Array" />
    return [];
}

SLRParseTableCompute.prototype.getTableName = function (c) {
    /// <summary>get the name for the LR parsing table created by this algorithm</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    /// <returns type="String" />
    return _("SLR");
}

SLRParseTableCompute.initItems = function (c) {
    /// <summary>make sure there is a single starting chain-rule and enqueue the initial state</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("make sure there is a single starting chain-rule and enqueue the initial state"));

    // create the parsing table
    var symbols = {};
    c.g().forEachTerminal(function (t) { symbols[t] = t.toString(); });
    symbols[c.g().getEndMarker()] = c.g().getEndMarker().toString();
    c.g().forEachNonterminal(function (n) { symbols[n] = n.toString(); });
    c.s().newTableStructure('LRTable', c.getTableName(), ParserActions, {}, symbols);

    // add a single starting rule like S -> S'
    var oldStarting = c.g().getStarting(),
        newS = c.g().taskNewNonterminal("S");
    c.g().tryChangeStartingNonterminal(newS.toString());
    var startingRule = c.g().taskAddRule(newS, new Word([oldStarting], c.g()));
    
    // create a first LR state with the initial item
    var lrauto = c.s().newLRAutomaton("LRStates"), state = new LRState();
    state.coreSet.add(new LRItem(startingRule, 0, c.initialLookeahead(c)));
    lrauto.addState(state);
    c.d().LRStateQueue = [state];
}

SLRParseTableCompute.processStates = function (c) {
    /// <summary>iteratively create the states of the LR automaton, while filling the parse table</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("iteratively create the states of the LR automaton, while filling the parse table"));

    c.task(SLRParseTableCompute.processState);
}

SLRParseTableCompute.processState = function (c) {
    /// <summary>process another state (set of items) /// all states have been processed</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    var state = c.d().LRStateQueue.shift();
    if (state) {
        var stateId = c.s().getLRAutomaton('LRStates').getStateID(state);
        c.myNameIs(_("process state (set of items) number %s", stateId));
        
        c.s().getTableStructure('LRTable').addRow(stateId, stateId);

        c.d().LRClosure = { state: state };
        c.d().LRCreateGoto = { state: state, stateId: stateId };

        c.task(SLRParseTableCompute.closure)
         .task(SLRParseTableCompute.addReductions)
         .task(SLRParseTableCompute.createGotoSets)

        c.willRepeat();
    } else {
        c.myNameIs(_("all states have been processed"));
    }
}

SLRParseTableCompute.closure = function (c) {
    /// <summary>compute the closure of a state represented by core items</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("compute the closure of a state represented by core items"));

    var closure = c.d().LRClosure;
    closure.queue = [];
    closure.state.coreSet.forEachItem(function (item) {
        //item.highlight(Highlight.ATT_TEMP);
        closure.queue.push(item);
    });

    c.s().newSymbolSet("ClosureAdded", "Added");

    c.task(SLRParseTableCompute.closureStep);
}

SLRParseTableCompute.prototype.createItemsByClosureExpansion = function (c, oldItem, rule) {
    /// <summary>create an array of items produced by expanding `oldItem`'s current nonterminal to `rule`</summary>
    /// <param name="c" type="CLRParseTableCompute"></param>
    /// <param name="oldItem" type="LRItem">item the current's nonterminal is being expanded</param>
    /// <param name="rule" type="Rule">rule to expand</param>
    /// <returns type="Array" />
    return [new LRItem(rule, 0, [])];
}

SLRParseTableCompute.closureStep = function (c) {
    /// <summary>compute the closure of a state represented by core items</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("compute the closure of a state represented by core items"));

    var closure = c.d().LRClosure, state = closure.state,
        nonTermSet = c.s().getSymbolSet("ClosureAdded"), newQueue = [];
    while (closure.queue.length) {
        var item = closure.queue.shift(),
            next = item.getSymbolAfterDot();
        if (next && next.isNonterminal() && !nonTermSet.contains(next)) {
            nonTermSet.add(next);
            c.g().forEachRuleWithLeft(next, function (rule) {
                var newItems = c.createItemsByClosureExpansion(c, item, rule);
                $.each(newItems, function (_i, newItem) {
                    if (state.nonCoreSet.add(newItem))
                        newQueue.push(newItem);
                });
            });
        }
    }

    closure.queue = newQueue;
    if (newQueue.length)
        c.willRepeat();
    else
        c.hook(function () {
            c.s().remove('ClosureAdded');
            delete c.d().LRClosure;
        });
}

SLRParseTableCompute.addReductions = function (c) {
    /// <summary>add LR actions REDUCE/ACCEPT to the parse table for any final items in this state</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("add LR actions REDUCE/ACCEPT to the parse table for any final items in this state"));

    var state = c.d().LRCreateGoto.state, stateId = c.d().LRCreateGoto.stateId,
        parseTable = c.s().getTableStructure('LRTable'),
        FFset = c.s().getTableStructure('FFset');

    state.forEachItem(function (item) {
        if (item.isFinal())
            if (!item.getLeft().equals(c.g().getStarting())) {
                function addReduce(followSymbol) {
                    parseTable.get(stateId, followSymbol).add(
                        new LRActionReduce(item.getRule())
                    );
                }
                if (item.getLookahead().length)
                    // PT[thisState, a] = reduce rule  for each a in this item's lookaheads
                    $.each(item.getLookahead(), function (i, t) { addReduce(t); });
                else // PT[thisState, a] = reduce rule  for each a in FOLLOW(rule left side)
                    FFset.get(item.getLeft(), 'follow').forEachItem(addReduce);
            } else
                parseTable.get(stateId, c.g().getEndMarker()).add(
                    new LRActionAccept()
                );
    });
}

SLRParseTableCompute.createGotoSets = function (c) {
    /// <summary>create the non-empty goto sets for each symbol</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("create the non-empty goto sets for each symbol"));

    var create = c.d().LRCreateGoto, state = create.state;
    create.symbols = {};

    state.forEachItem(function (item) {
        var s = item.getSymbolAfterDot();
        if(s)
            (create.symbols[s] = create.symbols[s] || []).push(item);
    });

    if(!$.isEmptyObject(create.symbols))
        c.task(SLRParseTableCompute.createGotoSetsForSymbol);
}

SLRParseTableCompute.createGotoSetsForSymbol = function (c) {
    /// <summary>create the goto set for some symbol</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>

    var create = c.d().LRCreateGoto, oldState = create.state,
        parseTable = c.s().getTableStructure('LRTable'),
        symbolStr = getAnyPropertyKey(create.symbols), symbol = c.g().tryGetSymbol(symbolStr),
        goodItems = create.symbols[symbolStr], item,
        newState = new LRState();
    c.myNameIs(_("create the goto set for symbol: " + makeMath(symbolStr)));

    // prepare how the new state would look like
    while (item = goodItems.pop())
        if (item.createFollowingItem())
            newState.coreSet.add(item.createFollowingItem());

    // is it new? yes - add to the queue
    var o = c.s().getLRAutomaton("LRStates").addStateTransition(oldState, symbol, newState);
    if (o.isNew)
        c.d().LRStateQueue.push(newState);
    // add parse table record
    parseTable.get(o.fromStateId, symbol.toString()).add(
        symbol.isNonterminal()
        ? new LRGotoEntry(o.toStateId)
        : new LRActionShift(o.toStateId)
    );

    delete create.symbols[symbolStr];
    if (!$.isEmptyObject(create.symbols))
        c.willRepeat();
    else
        c.hook(function () {
            delete c.d().LRCreateGoto;
        });
}


SLRParseTableCompute.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="SLRParseTableCompute"></param>
    c.myNameIs(_("done"));

    c.g().cleanHighlights();
}
