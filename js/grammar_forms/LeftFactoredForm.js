function LeftFactoredForm() { }

setupAlgorithmImplementation(
    LeftFactoredForm,
    {
        id: "LeftFactoredForm",
        name: _("left factored"),
        type: "FormConversion"
    }
);

/* 
algorithm:

    processNonterminal
        factorAlternativesOfLength
            factorPrefix

    cleanUp

*/

LeftFactoredForm.main = function (c) {
    /// <summary>convert to LeftFactored normal form</summary>
    /// <param name="c" type="LeftFactoredForm"></param>
    c.myNameIs(_("convert to left factored normal form"));

    c.d().LFac = {queue: []};
    c.g().forEachNonterminal(function (n) { c.d().LFac.queue.push(n.toString()); });

    c.task(LeftFactoredForm.processNonterminal)
     .task(LeftFactoredForm.cleanUp);
}

LeftFactoredForm.processNonterminal = function (c) {
    /// <summary>left factor the rules of one of the nonterminals</summary>
    /// <param name="c" type="LeftFactoredForm"></param>
    var left = c.d().LFac.left = c.d().LFac.queue.shift();
    c.myNameIs(_("left factorize the productions of nonterminal %s", left.toString()));

    var longest = -1;
    c.g().forEachRuleWithLeft(left, function (_r, _l, right) {
        right.highlight(Highlight.ATT_TEMP);
        longest = Math.max(longest, right.length());
    });
    c.d().LFac.currentLength = longest;

    if (longest > 1)
        c.task(LeftFactoredForm.factorAlternativesOfLength);

    if (c.d().LFac.queue.length > 0)
        c.willRepeat();
}

LeftFactoredForm.factorAlternativesOfLength = function (c) {
    /// <summary>check for common prefixes of some length</summary>
    /// <param name="c" type="LeftFactoredForm"></param>
    var left = c.d().LFac.left, len = --c.d().LFac.currentLength, prefixes = {};

    c.myNameIs(_("check for common prefixes of length ") + len);    
    
    c.g().forEachRuleWithLeft(left, function (_r, _l, right) {
        if (right.length() >= len) {
            var pre = right.slice(0, len).toString();
            (prefixes[pre] = prefixes[pre] || []).push(right.toString());
        }
    });
    var prefQueue = c.d().LFac.prefQueue = [];
    c.d().LFac.prefCounter = 0;
    for (var pre in prefixes)
        if (prefixes[pre].length > 1)
            prefQueue.push(prefixes[pre]);
    if (prefQueue.length > 0)
        c.task(LeftFactoredForm.factorPrefix);

    if (len - 1 > 0)
        c.willRepeat();
}

LeftFactoredForm.factorPrefix = function (c) {
    /// <summary>factor a prefix - create an auxiliary nonterminal that produces the leftovers</summary>
    /// <param name="c" type="LeftFactoredForm"></param>

    var left = c.d().LFac.left, len = c.d().LFac.currentLength,
        prefQueue = c.d().LFac.prefQueue, prefRuleRights = prefQueue.shift(),
    // add an auxiliary nonterminal ..
        auxN = c.g().taskNewNonterminal(left + '/' + len + '-' + (++c.d().LFac.prefCounter));
    // .. and a rule ..
    var prefix = c.g().tryGetRule(left, prefRuleRights[0]).getRight().get().slice(0, len);
    c.myNameIs(_("factorize the prefix %s - create an auxiliary nonterminal that produces the leftovers",
        new Word(prefix, c.g()).toString()));
    c.g().taskAddRule(c.g().tryGetSymbol(left), // .. with the original left side ..
        // .. and a concatenation of the prefix and the auxiliary nonterminal ..
        new Word($.merge(prefix, [auxN]), c.g()));

    // now add a rule for each leftover and remove the old ones
    $.each(prefRuleRights, function (_i, right) {
        var oldRule = c.g().tryGetRule(left, right);
        c.g().taskAddRule(auxN, oldRule.getRight().slice(len));
        c.g().taskRemoveRule(oldRule);
    });
    
    if (prefQueue.length > 0)
        c.willRepeat();
}

LeftFactoredForm.cleanUp = function (c) {
    /// <summary>done, clean up</summary>
    /// <param name="c" type="GreibachForm"></param>
    c.myNameIs(_("done"));

    delete c.d().LFac;
    c.g().cleanHighlights();
}


LeftFactoredForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    // worst case O(|P|)
    var good = true;
    grammar.forEachNonterminal(function (left) {
        var firsts = {};
        grammar.forEachRuleWithLeft(left, function (_r, left, right) {
            if (right.length() > 0)
                if (firsts[right.get(0)])
                    return good = false;
                else firsts[right.get(0)] = true;
        });
        return good;
    });
    return good;
}
