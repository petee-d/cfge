function LRParserAlgorithm() { }

setupAlgorithmImplementation(
    LRParserAlgorithm,
    {
        id: "LRParserAlgorithm",
        name: _("simulate LR parser"),
        type: "ParsingAlgorithm"
    }
);

/* 
algorithm:

    initItems

*/

LRParserAlgorithm.main = function (c) {
    /// <summary>parse the input word</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>

    var inputStr = prompt("[TODO: less ugly and validated]\ninput word:", 'a a a b b b'),
        input = new Word(inputStr, c.g());

    c.myNameIs(_("parse the input word %s", makeMath(input.toString())));

    c.s().newParserInput('LRParserInput', _("Input"), input, c.g());

    c.task(LRParserAlgorithm.init)
     .task(LRParserAlgorithm.parse)
     .task(LRParserAlgorithm.result);
}

LRParserAlgorithm.init = function (c) {
    /// <summary>prepare the initial stack state</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>
    c.myNameIs(_("prepare the initial stack state"));
    
    // create a supplementary (and useless) stack for symbols
    var symbolStack = c.s().newParserStack('LRParserSymbolStack', _("Stack"));
    symbolStack.push(new LRState('', '', true));

    // create a stack for states
    var stack = c.s().newParserStack('LRParserStack');
    stack.push(new LRState('0', '0', true));

    // retrieve the LR parser table, type doesn't matter
    c.s().adoptCurrentLRParserTable('LRTable');

    // prepare the output
    c.s().newParserOutput('LRParserOutput');

    c.d().LRParser = {
        result: "notFinished"
    };
}

LRParserAlgorithm.parse = function (c) {
    /// <summary>iterate the parsing algorithm until either the word is accepted, or an error occurs</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>
    c.myNameIs(_("iterate the parsing algorithm until either the word is accepted, or an error occurs"));

    c.task(LRParserAlgorithm.parseStep);
}

LRParserAlgorithm.parseStep = function (c) {
    /// <summary>a parser step, decide what to do</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>

    if (c.d().LRParser.result != "notFinished") {
        c.myNameIs("(" + _("step cancelled due to parsing error") + ")");
        return;
    }

    var stack = c.s().getParserStack('LRParserStack'),
        table = c.s().getTableStructure('LRTable'),
        input = c.s().getParserInput('LRParserInput');
    
    var currentState = stack.peekTop(), lookahead = input.getLookahead(),
        actions = table.get(currentState.id(), lookahead.toString()),
        action = actions.getAnyItem(),
        desc = _("ACTION[%s, %s]", currentState.id(), makeMath(lookahead.toString())) + " - ";

    if (actions.length() < 1) {
        c.myNameIs(desc + _("Parsing error") + ": " + _("no parser action defined"));
        c.d().LRParser.result = "unparsable";

    } else if (actions.length() > 1) {
        c.myNameIs(desc + _("Parsing error") + ": " + _("multiple parsing actions defined"));
        c.d().LRParser.result = "ambiguous";

    } else if (action instanceof ParserActionError) {
        c.myNameIs(desc + _("Action") + ": " + _("ERROR") + "(" + action.message + ")");
        c.d().LRParser.result = "unparsable";

    } else if (action instanceof LRActionAccept) {
        c.myNameIs(desc + _("Action") + ": " + _("ACCEPT"));
        c.d().LRParser.result = "accepted";

    } else if (action instanceof LRActionShift) {
        c.myNameIs(desc + _("Action") + ": " + _("SHIFT") + "(" + action.state.toString() + ")");
        c.d().LRParser.shiftAction = action;
        c.task(LRParserAlgorithm.actionShiftPushSymbol)
         .task(LRParserAlgorithm.actionShiftGoto);
        c.willRepeat();

    } else if (action instanceof LRActionReduce) {
        c.myNameIs(desc + _("Action") + ": " + _("REDUCE") + "(" + action.rule.toUserString() + ")");
        c.d().LRParser.reduceAction = action;
        c.task(LRParserAlgorithm.actionReducePopStack)
         .task(LRParserAlgorithm.actionReducePushSymbol)
         .task(LRParserAlgorithm.actionReduceGoto);
        c.willRepeat();

    } else MyError("what action? " + JSON.stringify(actions));
}

LRParserAlgorithm.actionShiftPushSymbol = function (c) {
    /// <summary>consume a terminal from the input and push it on the stack</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>
    c.myNameIs(_("consume a terminal from the input and push it on the stack"));

    var symbolStack = c.s().getParserStack('LRParserSymbolStack'),
        input = c.s().getParserInput('LRParserInput');

    var terminal = input.next();
    symbolStack.push(terminal);
}

LRParserAlgorithm.actionShiftGoto = function (c) {
    /// <summary>go to state ? (push it on the stack)</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>

    var stack = c.s().getParserStack('LRParserStack'),
        table = c.s().getTableStructure('LRTable'),
        gotoID = c.d().LRParser.shiftAction.state,
        goto = new LRState(gotoID, gotoID, true);
    c.myNameIs(_("go to state %s (push it on the stack)", gotoID));

    stack.push(goto);
}

LRParserAlgorithm.actionReducePopStack = function (c) {
    /// <summary>pop last ? items from the stack (two times the length of the rule right side)</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>

    var stack = c.s().getParserStack('LRParserStack'),
        symbolStack = c.s().getParserStack('LRParserSymbolStack'),
        rule = c.d().LRParser.reduceAction.rule,
        itemsToPop = rule.getRight().length();
    c.myNameIs(_("pop last %s items from the stack (two times the length of the rule right side)", 2 * itemsToPop));

    stack.popN(itemsToPop);
    symbolStack.popN(itemsToPop);
}

LRParserAlgorithm.actionReducePushSymbol = function (c) {
    /// <summary>push the rule left side nonterminal on the stack</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>

    var stack = c.s().getParserStack('LRParserStack'),
        symbolStack = c.s().getParserStack('LRParserSymbolStack'),
        rule = c.d().LRParser.reduceAction.rule,
        currentStateID = c.d().LRParser.currentStateID = stack.peekTop().id();
    c.myNameIs(_("note current state %s and push the rule left side nonterminal (%s) on the stack",
        currentStateID, makeMath(rule.getLeft().toString())));

    symbolStack.push(rule.getLeft());
}

LRParserAlgorithm.actionReduceGoto = function (c) {
    /// <summary>go to state ? (push it on the stack); emit the rule to output</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>

    var stack = c.s().getParserStack('LRParserStack'),
        table = c.s().getTableStructure('LRTable'),
        output = c.s().getParserOutput('LRParserOutput'),
        rule = c.d().LRParser.reduceAction.rule,
        oldStateID = c.d().LRParser.currentStateID,
        desc = _("find GOTO[%s, %s] (using the noted most recent state and rule left side nonterminal)",
            oldStateID, rule.getLeft().toString());

    var gotoEntries = table.get(oldStateID, rule.getLeft().toString()),
        gotoEntry = gotoEntries.getAnyItem();
    if (gotoEntries.length() < 1) {
        c.myNameIs(desc + " - " + _("Parsing error") + ": " + _("no parser goto entry defined"));
        c.d().LRParser.result = "unparsable";

    } else if (gotoEntries.length() > 1) {
        c.myNameIs(desc + " - " + _("Parsing error") + ": " + _("multiple parsing actions defined"));
        c.d().LRParser.result = "ambiguous";

    } else if (gotoEntry instanceof LRGotoEntry) {
        var gotoID = gotoEntry.state, goto = new LRState(gotoID, gotoID, true);
        c.myNameIs(desc + _(" and push it (state %s) on the stack; emit the rule to output", gotoID));
        stack.push(goto);
        output.emitRule(rule);

    } else MyError("what goto? " + JSON.stringify(gotoEntries));
}


LRParserAlgorithm.result = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="LRParserAlgorithm"></param>

    if (c.d().LRParser.result == "accepted") {
        c.myNameIs(_("parsing successful"));

        c.s().getParserOutput('LRParserOutput').finish(true);
    } else {
        c.myNameIs(_("parsing unsuccessful"));
    }

    c.g().cleanHighlights();
}