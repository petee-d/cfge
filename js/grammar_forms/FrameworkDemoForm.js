function NoLoopsForm() { }

if (false)
// only for testing or demonstration purposes
setupAlgorithmImplementation(
    NoLoopsForm,
    {
        id: "NoLoopsForm",
        name: _("no loops"),
        type: "FormConversion"
    }
);



NoLoopsForm.main = function (c) {
    // set the description
    c.myNameIs(_("remove loops"));
    // declare a new SymbolSet structure
    // stores symbols that had loops, but they were already removed
    c.structures().newSymbolSet('hadLoops', _("Had loops"));
    // create a queue with the loops to be removed (not visualized)
    var queue = c.data().loopQueue = [];
    // inspect all the productions to find loops (callback iterator)
    c.grammar().forEachRule(function (rule, leftNonterm, rightWord) {
        if (
            rightWord.match("N") // the rule is in the form A -> B
            && leftNonterm.equals(rightWord.get(0)) // A = B
           )
            // add the rule to queue
            queue.push(rule);
    });
    // if the queue isn't empty, we remove the loops in substeps
    // we only schedule the first substep, which will be repeated
    if (queue.length > 0)
        c.task(NoLoopsForm.removeSingle);
    // we also schedule a clean up task
    c.task(NoLoopsForm.cleanUp);
}

NoLoopsForm.removeSingle = function (c) {
    // retrieve the symbol set structure and the loop queue
    var hadLoops = c.structures().getSymbolSet('hadLoops'),
        queue = c.data().loopQueue;
    // destructively retrieve a loop production
    var loop = queue.shift();
    // generate the description
    c.myNameIs(_("remove the production %s -> %s",
        loop.getLeft(), loop.getLeft()));
    // add the nonterminal to the set
    hadLoops.add(loop.getLeft());
    // remove the production from the grammar
    c.grammar().taskRemoveRule(loop);
    // repeat this step until the queue is empty
    if (queue.length > 0)
        c.willRepeat();
}

NoLoopsForm.cleanUp = function (c) {
    c.myNameIs(_("done"));
}



NoLoopsForm.check = function (grammar) {
    var ret = true;
    // search the grammar for loops, if found, check is negative
    grammar.forEachRule(function (rule, leftNonterm, rightWord) {
        if (
            rightWord.match("N") // the rule is in the form A -> B
            && leftNonterm.equals(rightWord.get(0)) // A = B
           )
            return ret = false;
    })
    return ret;
}