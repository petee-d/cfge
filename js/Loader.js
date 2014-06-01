// function Loader

window["Current"] = {};

var Loader = function () {
    /// <summary>initialize the application's JavaScript components</summary>
    
    MyError.init();
    drawSetBoxes();
    NotificationBar.init();
    OriginalGrammar.init();
    Menu.init();
    Menu.register([MainTab, RichInput, TextInput, ParseTableInput, CYKParseTree]);

    TextInput
        .addExample("reduced form", "removing non-terminable symbols will add non-reachable symbols, thus the order of removal matters",
            { "N": ["S", "A", "Q", "R", "T", "U"], "T": ["a", "b"], "P": { "S": ["S", "A A", "T"], "A": [Word.epsStr, "A a", "a", "A"], "Q": ["R b", "b"], "R": ["S", "Q a", "R"], "T": ["U U", "T R", "a T a"], "U": ["Q U", "T b A"] }, "S": "S" })
        .addExample("epsilon-free form", "since the starting nonterminal must remain epsilon producing, we need to create a new one",
            { "N": ["S", "A", "B", "C"], "T": ["a", "b", "c", "d"], "P": { "S": ["a A b B c A d", "B B", "a b c d"], "A": [Word.epsStr, "a", "S"], "B": [Word.epsStr, "b C", "A A A"], "C": ["a C", "b"] }, "S": "S" })
        .addExample("chain-rule-free form", "also has chain-rule cycles",
            { "N": ["S", "A", "B", "C", "D", "E"], "T": ["a", "b", "c", "d", "e"], "P": { "S": ["A", "D E"], "A": ["a", "B"], "B": ["b", "C"], "C": ["c", "A"], "D": ["d", "E"], "E": ["e", "D"] }, "S": "S" })
        .addExample("(strict) Chomsky form", "starting nonterminal is epsilon-generating, note how Chomsky and strict Chomsky differ in handling epsilon generating nonterminals and chain rules",
            { "N": ["S", "A", "B", "C", "E"], "T": ["a", "b", "c"], "P": { "S": ["A B", "E E"], "A": ["a", "a a", "A C"], "B": ["A b A", "a b c B E"], "C": ["c"], "E": [Word.epsStr, "a S"] }, "S": "S" })
        .addExample("Greibach form", "starting nonterminal is epsilon-generating, situations like i < k, i = k and i > k all have to be dealt with",
            { "N": ["S", "A", "E"], "T": ["a", "b", "c"], "P": { "S": [Word.epsStr, "A A"], "A": ["A", "S", "a b E"], "E": ["E c"] }, "S": "S" })
        .addExample("parsing - arithmetics", "unambiguous, generates infix notation terms of basic arithmetics",
            { "N": ["T", "OP"], "T": ["n", "(", ")", "+", "*", "/", "-"], "P": { "T": ["n", "( T OP T )"], "OP": ["+", "*", "/", "-"] }, "S": "T" })
        .addExample("parsing - Dangling else", "ambiguous, demonstrates the Dangling else problem",
            { "N": ["S"], "T": ["st", "if", "cond", "then", "else"], "P": { "S": ["st", "if cond then S", "if cond then S else S"] }, "S": "S" })
        .addExample("parsing - assignment chain", "unambiguous, demonstrates chains of variable assignments, is LL and LALR, but not SLR",
            { "N": ["S", "R", "E", "V"], "T": ["id", "num", "assign"], "P": { "S": ["id R"], "E": ["num", "id V R"], "R": ["V assign E", "eps"], "V": ["eps"] }, "S": "S" })


    var currentGrammar = false, hashGrammar;
    if (location.hash && (hashGrammar = location.hash.match(/#g~(.+)~g/)))
        try {
            var decompressed = LZString.decompressFromBase64(hashGrammar[1]);
            if (!decompressed) throw 0;
            currentGrammar = new Grammar(JSON.parse(decompressed))
        } catch (e) {
            setTimeout(function () { UserError(_("Grammar link representation is malformed!")); }, 100);
            currentGrammar = false;
        }
    
    if (!currentGrammar)
        currentGrammar = new Grammar({ "N": ["S"], "T": ["a"], "P": { "S": ["a", "eps"] }, "S": "S" });

    window["Current"] = {

        grammar: currentGrammar,
        TextInput: { method: 1 },
        Automaton: { method: 'graphviz', direction: 'TB' }

    }


    // handle algorithm implementations

    $.each(Loader.algorithmList, function () {
        switch (this.getType()) {
            case "FormConversion":
                Evaluator.teach(this);
                Menu.addSectionButton(this, 'normal_forms');

                break;
            case "ParsingAlgorithm":
                Menu.addSectionButton(this, 'parsing');
                break;
        }
    });
    Evaluator.init();



    // lock menu items not accessible by default
    Menu.lock(ParseTableInput);
    Menu.lock(LRParserAlgorithm);
    Menu.lock(LLParserAlgorithm);



    // default tab
    Menu.open(hashGrammar ? RichInput : MainTab);
}

Loader.algorithmList = [];