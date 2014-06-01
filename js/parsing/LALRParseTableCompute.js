function LALRParseTableCompute() { }

setupAlgorithmImplementation(
    LALRParseTableCompute,
    {
        id: "LALRParseTableCompute",
        name: _("LALR parse table"),
        type: "ParsingAlgorithm",
        parent: CLRParseTableCompute
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

    mergeStates
        merge

    cleanUp

*/

LALRParseTableCompute.main = function (c) {
    /// <summary>create the LALR parsing table and automaton graph</summary>
    /// <param name="c" type="LALRParseTableCompute"></param>
    c.myNameIs(_("create the LALR parsing table and automaton graph"));

    c.task(FirstFollowCompute.main)
     .task(SLRParseTableCompute.initItems)
     .task(SLRParseTableCompute.processStates)
     .task(LALRParseTableCompute.stateMerging)
     .task(SLRParseTableCompute.cleanUp);
}

LALRParseTableCompute.stateMerging = function (c) {
    /// <summary>merge states with identical sets of items, disregarding lookaheads</summary>
    /// <param name="c" type="LALRParseTableCompute"></param>
    c.myNameIs(_("merge states with identical sets of items, disregarding lookaheads"));

    var states = {};
    c.s().getLRAutomaton('LRStates').forEachState(function (state) {
        var coreHashNoLookahead = state.getCoreHash(true);
        states[coreHashNoLookahead] = states[coreHashNoLookahead] || [];
        states[coreHashNoLookahead].push(state);
    });

    var mergeQueue = c.d().LALR_mergeQueue = [];
    for (var hash in states)
        if (states[hash].length > 1) {
            mergeQueue.push(states[hash]);
            c.task(LALRParseTableCompute.mergeGroupOfState);
        }
}

LALRParseTableCompute.prototype.fixParseTableStateNames = function (c, oldID, newID) {
    /// <summary>search the LR parse table for any mentions of `oldState` and change them to `newState`</summary>
    /// <param name="c" type="LALRParseTableCompute"></param>
    if (oldID == newID) return;
    c.s().getTableStructure('LRTable').forEachCell(function(actions){
        actions.forEachItem(function (action) {
            if (action instanceof LRGotoEntry && action.state == oldID) {
                actions.remove(action);
                actions.add(new LRGotoEntry(newID))
            }
            if (action instanceof LRActionShift && action.state == oldID) {
                actions.remove(action);
                actions.add(new LRActionShift(newID))
            }
        });
    });
}

LALRParseTableCompute.mergeGroupOfState = function (c) {
    /// <summary>merge states ...</summary>
    /// <param name="c" type="LALRParseTableCompute"></param>
    var states = c.d().LALR_mergeQueue.shift();
    c.myNameIs(_("merge states %s", 
            $.map(states, function (state) { return state.name(); }).join(', ')
        ));

    var mainState = states.shift();
    $.each(states, function (i, otherState) {
        var automaton = c.s().getLRAutomaton('LRStates'),
            mainStateID = automaton.getStateID(mainState),
            otherStateID = automaton.getStateID(otherState);

        // merge the states in the automaton
        c.s().getLRAutomaton('LRStates').mergeStates(mainState, otherState);

        // merge the states in the parse table, still using the original ID of otherState
        var table = c.s().getTableStructure('LRTable');
        table.forEachCellInRow(otherStateID, function (column, actions) {
            actions.forEachItem(function (action) {
                table.get(mainStateID, column).add(action);
            });
        });
        table.removeRow(otherStateID);

        // fix old state names
        c.fixParseTableStateNames(c, otherStateID, mainStateID);
    });
}

LALRParseTableCompute.prototype.getTableName = function (c) {
    /// <summary>get the name for the LR parsing table created by this algorithm</summary>
    /// <param name="c" type="LALRParseTableCompute"></param>
    /// <returns type="String" />
    return _("LALR");
}