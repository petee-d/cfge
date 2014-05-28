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
        .addExample("CYK - unambiguous grammar", "generates infix notation terms of basic arithmetics",
            { "N": ["INIT", "T", "OP"], "T": ["n", "+", "*", "/", "-", "(", ")"], "P": { "INIT": ["n", "T OP T"], "OP": ["+", "*", "/", "-"], "T": ["n", "( T OP T )"] }, "S": "INIT" })
        .addExample("CYK - ambiguous grammar", "demonstrates the Dangling else problem",
            {"N":["S"],"T":["if","condition","then","statement","else"],"P":{"S":["statement","if condition then S","if condition then S else S"]},"S":"S"})


    var hashGrammar; A = false;
    if (location.hash && (hashGrammar = location.hash.match(/#g~(.+)~g/)))
        try {
            var decompressed = LZString.decompressFromBase64(hashGrammar[1]);
            if (!decompressed) throw 0;
            A = new Grammar(JSON.parse(decompressed))
        } catch (e) {
            setTimeout(function () { UserError(_("Grammar link representation is malformed!")); }, 100);
            A = false;
        }

    if (!A)
        A = /* (A = new Grammar({
            N: ['S', 'A/1', 'A/2', 'B', 'C', 'D'],
            T: ['a', 'b'],
            P: {
                'S': ["a A/2 A/2", "b b A/1", "C", "S", "A/2 A/2"],
                'A/1': ["C a", "a A/2", "S a A/2 b S"],
                'A/2': ["a b", "A/2", "0", "D"],
                'B': ["B", "a"],
                'C': ["D a b C", "C b a", "a D"],
                'D': ["C"]
               }, 
            S: 'S'
        })) */
        new Grammar({
            N: ['S', 'A', 'B', 'R'],
            T: ['a', 'b', 'c'],
            P: {
                'S': ["A R", "A B"],
                'A': ["a"],
                'B': ["b"],
                'R': ["S B"]
            },
            S: 'S'
        });

    window["Current"] = {

        grammar: A,
        TextInput: { method: 1 },
        Automaton: { method: 'graphviz', direction: 'TB' }

    }
    


    // 

    $.each(Loader.algorithmList || [
        ReducedForm,
        EpsilonFreeForm,
        ChainRuleFreeForm,
        ChomskyForm,
        StrictChomskyForm,
        GreibachForm,
        NoLeftRecursionForm,
        LeftFactoredForm,

        FirstFollowCompute,
        SLRParseTableCompute,
        CLRParseTableCompute,
        LALRParseTableCompute,
        LRParserAlgorithm,
        LLParseTableCompute,
        LLParserAlgorithm,
    ], function () {
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