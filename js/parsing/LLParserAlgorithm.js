function LLParserAlgorithm() { }

setupAlgorithmImplementation(
    LLParserAlgorithm,
    {
        id: "LLParserAlgorithm",
        name: _("simulate LL parser"),
        type: "ParsingAlgorithm",
        userParserInput: true
    }
);

/* 
algorithm:

    init

    parse
        (repeat) parseStep
            actionConsumeTerminal
            /
            actionProducePopStack
            actionProducePushRight

    result

*/

LLParserAlgorithm.main = function (c) {
    /// <summary>parse the input word using the active LL parsing table</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>
    c.myNameIs(_("parse the input word using LL"));

    // get the input
    var input = c.s().adoptParserInput('LLParserInput');

    // retrieve the parser table
    c.s().adoptCurrentLLParserTable('LLTable').priority(-1);

    c.task(LLParserAlgorithm.init)
     .task(LLParserAlgorithm.parse)
     .task(LLParserAlgorithm.result);
}

LLParserAlgorithm.init = function (c) {
    /// <summary>prepare the initial stack state</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>
    c.myNameIs(_("prepare the initial stack state"));

    // create a stack
    var stack = c.s().newParserStack('LLParserStack');
    stack.push(c.g().getStarting());

    // prepare the output
    c.s().newParserOutput('LLParserOutput');

    c.d().LLParser = {
        result: "notFinished"
    };
}

LLParserAlgorithm.parse = function (c) {
    /// <summary>iterate the parsing algorithm until either the word is accepted, or an error occurs</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>
    c.myNameIs(_("iterate the parsing algorithm until either the word is accepted, or an error occurs"));

    c.task(LLParserAlgorithm.parseStep);
}

LLParserAlgorithm.parseStep = function (c) {
    /// <summary>a parser step, decide what to do</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>

    if (c.d().LLParser.result != "notFinished") {
        c.myNameIs("(" + _("step cancelled due to parsing error") + ")");
        return;
    }

    var stack = c.s().getParserStack('LLParserStack'),
        table = c.s().getTableStructure('LLTable'),
        input = c.s().getParserInput('LLParserInput');
    
    var currentTop = stack.peekTop(), lookahead = input.getLookahead();

    if (!currentTop && lookahead.equals(c.g().getEndMarker())) {
        c.myNameIs(_("the stack is empty and all input was consumed, the word is accepted"));
        c.d().LLParser.result = "accepted";

    } else if (!currentTop) {
        c.myNameIs(_("Parsing error") + ": " + _("the stack is empty and there is still some input left!"));
        c.d().LLParser.result = "unparsable";

    } else if (currentTop instanceof Terminal && lookahead.equals(currentTop)) {
        c.myNameIs(_("stack top %s = lookahead %s",
            makeMath(currentTop), makeMath(lookahead)
            ));
        c.task(LLParserAlgorithm.actionConsumeTerminal);
        c.willRepeat();

    } else if (currentTop instanceof Terminal && !lookahead.equals(currentTop)) {
        c.myNameIs(_("Parsing error") + ": " + _("expected %s (stack top terminal), found %s on input!",
            makeMath(currentTop), makeMath(lookahead)
            ));
        c.d().LLParser.result = "unparsable";

    } else {
        var actions = table.get(currentTop, lookahead),
            action = actions.getAnyItem();
        actions.highlight(Highlight.ATT_TEMP);

        if (actions.length() < 1) {
            c.myNameIs(_("Parsing error") + ": " + _("no parser action defined"));
            c.d().LLParser.result = "unparsable";

        } else if (actions.length() > 1) {
            c.myNameIs(_("Parsing error") + ": " + _("multiple parsing actions defined"));
            c.d().LLParser.result = "ambiguous";

        } else if (action instanceof ParserActionError) {
            c.myNameIs(_("Parsing error") + ": " + _("ERROR") + "(" + action.message + ")");
            c.d().LLParser.result = "unparsable";
            
        } else if (action instanceof LLActionProduce) {
            c.myNameIs(_("parser action PT[%s, %s] = %s",
                makeMath(currentTop), makeMath(lookahead),
                action.rule.toUserString()
                ));
            c.d().LLParser.actions = actions;
            c.d().LLParser.produceAction = action;
            c.task(LLParserAlgorithm.actionProducePopStack)
             .task(LLParserAlgorithm.actionProducePushRight);
            c.willRepeat();

        } else MyError("what action? " + JSON.stringify(actions));
    }
}

LLParserAlgorithm.actionConsumeTerminal = function (c) {
    /// <summary>consume the terminal from the top of the stack and from the input</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>
    c.myNameIs(_("consume the terminal from the top of the stack and from the input"));

    var stack = c.s().getParserStack('LLParserStack'),
        input = c.s().getParserInput('LLParserInput');

    stack.popN(1);
    input.next();
}

LLParserAlgorithm.actionProducePopStack = function (c) {
    /// <summary>emit the rule; pop the rule left side from the stack</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>

    var stack = c.s().getParserStack('LLParserStack'),
        output = c.s().getParserOutput('LLParserOutput'),
        rule = c.d().LLParser.produceAction.rule;
    c.myNameIs(_("pop the rule left side %s from the stack",
        makeMath(rule.getLeft())
        ));

    c.d().LLParser.actions.highlight(Highlight.ATT_TEMP);

    output.emitRule(rule);
    stack.popN(1);
}

LLParserAlgorithm.actionProducePushRight = function (c) {
    /// <summary>push the rule right side to the stack (so that the first symbol is on top)</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>

    var stack = c.s().getParserStack('LLParserStack'),
        rule = c.d().LLParser.produceAction.rule;
    c.myNameIs(_("push each symbol of the rule right side %s to the stack (so that the first symbol is on top)",
        makeMath(rule.getRight())
        ));

    c.d().LLParser.actions.highlight(Highlight.ATT_TEMP);

    $.each(rule.getRight().get().reverse(), function (i, symbol) {
        stack.push(symbol);
    });
}


LLParserAlgorithm.result = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="LLParserAlgorithm"></param>

    c.s().remove('LLParserStack');
    if (c.d().LLParser.result == "accepted") {
        c.myNameIs(_("parsing successful"));

        c.s().getParserOutput('LLParserOutput').finish(false);
    } else {
        c.myNameIs(_("parsing unsuccessful"));
    }

    c.g().cleanHighlights();
}
