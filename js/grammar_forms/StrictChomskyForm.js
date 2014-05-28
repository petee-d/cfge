function StrictChomskyForm() { }

setupAlgorithmImplementation(
    StrictChomskyForm,
    {
        id: "StrictChomskyForm",
        name: _("strict Chomsky"),
        type: "FormConversion"
    }
);


/* 
algorithm:

    ChomskyForm.useFakeTerminals

    EpsilonFreeForm.main

    ChainRuleFreeForm.main

    ChomskyForm.subdivideLongRules

*/

StrictChomskyForm.main = function (c) {
    /// <summary>convert to strict Chomsky normal form</summary>
    /// <param name="c" type="StrictChomskyForm"></param>
    c.myNameIs(_("convert to strict Chomsky normal form"));

    c.task(ChomskyForm.useFakeTerminals)
     .task(EpsilonFreeForm.main)
     .task(ChainRuleFreeForm.main)
     .task(ChomskyForm.subdivideLongRules)
     .task(ChomskyForm.cleanUp);
}



StrictChomskyForm.check = function (grammar) {
    /// <summary>check whether the grammar is in this form, return true, false, or something else if not applicable</summary>
    /// <param name="grammar" type="Grammar">the grammar to check</param>
    /// <returns type="String" />

    var good = true, epsilon = !!grammar.tryGetRule(grammar.getStarting() + "", Word.epsStr);
    grammar.forEachRule(function (rule, left, right) {
        if (!(right.match(epsilon ? "RR|T" : "NN|T", grammar)
                || (left == grammar.getStarting() && right.length() == 0)))
            return good = false;
    });

    return good;
}