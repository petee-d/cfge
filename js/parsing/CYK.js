/* class CYKField - used as a data structure in CYK */

function CYKField (table, i, j) {
    /// <param name="table" type="Array">CYK parse table</param>
    /// <param name="i" type="Number">row number of this field</param>
    /// <param name="j" type="Number">cell number of this field</param>

    this.table = table;
    this.i = i; this.j = j;
    this.data = {};
}

CYKField.prototype.add = function (rule, firstSource, secondSource) {
    /// <param name="rule" type="Rule">the rule used to track its left side nonterminal to this field</param>
    /// <param name="firstSource" type="CYKField">if applicable, the first source of this rule</param>
    /// <param name="secondSource" type="CYKField">if applicable, the second source of this rule</param>

    var n = rule.getLeft(), group = this.data[n] = this.data[n] || { n: n, src: [] };
    group.src.push({ rule: rule, first: firstSource || null, second: secondSource || null });
}

CYKField.prototype.getSources = function () {
    /// <summary>get an array of field pairs this one uses as sources</summary>

    var a = [];
    for (var k = 1; k < this.i; k++)
        a.push({
            first: this.table[k][this.j],
            second: this.table[this.i - k][this.j + k]
        });
    return a;
}

CYKField.prototype.contains = function (n) {
    /// <summary>does this field contain a nonterminal?</summary>
    /// <param name="n" type="Nonterminal">nonterminal to look for</param>

    return !!this.data[n];
}

CYKField.prototype.getNonterminals = function () {
    /// <summary>get an array of nonterminals in this field</summary>

    var a = [];
    for (var n in this.data)
        a.push(this.data[n].n);
    return a;
}

CYKField.prototype.getRandomTreeFor = function (n) {
    /// <summary>get a random parse tree from table data</summary>
    /// <param name="n" type="Nonterminal">nonterminal to search for</param>
    /// <returns type="PTNode" />

    var sources = this.data[n].src,
        source = sources[Math.floor(Math.random() * sources.length)];
    if (source.first)
        return new BinaryPTNode(source.rule,
                source.first.getRandomTreeFor(source.rule.getRight().get(0)),
                source.second.getRandomTreeFor(source.rule.getRight().get(1))
            );
    else
        return new TerminalPTNode(source.rule);
}


/* class CYK - represents parsing a single word */

function CYK(grammar, word) {
    /// <summary>prepare a CYK parsing session</summary>
    /// <param name="grammar" type="Grammar">a grammar in strict Chomsky to be parsed under</param>
    /// <param name="word" type="Word">word to parse</param>

    if (!StrictChomskyForm.check(grammar))
        return MyError("CYK given grammar not in strict Chomsky" + arg);
    this.grammar = grammar;
    this.word = word;

    this.overrideCYKParseTree = false;
    this.parsable = null;
}

CYK.timeout = 0;
CYK.timeoutOnEach = 25;

CYK.prototype.shift = function () {
    /// <returns type="CYKField" />
    return this.nodeQueue.shift();
}

CYK.prototype.execute = function (callback) {
    /// <summary>parse the word the algorithm was initialized to; has an O(|w|^2) part without timeouts and an O(|w|^3) part with timeouts</summary>
    /// <param name="callback" type="Function">is called with each step like (currentStep, totalSteps), on completion currentStep = totalSteps</param>

    this.length = this.word.length();
    this.callback = callback;
    if (this.length == 0)
        this.parseEpsilon();
    else {
        this.nodeQueue = [];
        /* prepare the parse table - O(|w|^2) */
        var table = this.table = [null]; /* I want to enforce indexing from 1 */
        for (var i = 1; i <= this.length; i++) {
            var row = [null];
            table.push(row);
            for (var j = 1; j <= this.length - i + 1; j++) {
                var node = new CYKField(table, i, j);
                row.push(node);
                this.nodeQueue.push(node);
            }
        }
        /* prepare rule inverse hashtable (for quick looking up) */
        var invRules = this.invRules = {}, that = this;
        this.grammar.forEachRule(function (rule, left, right) {
            (invRules[right] = invRules[right] || []).push(rule);
        });
        /* prepare counters */
        this.currentStep = 0;
        this.totalSteps = this.nodeQueue.length;
        /* do the first step, number of steps is O(|w|^2), timeouted */
        setTimeout(function () {
            that.step();
        }, CYK.timeout);
    }
}

CYK.prototype.parseEpsilon = function () {
    /// <summary>word is epsilon</summary>

    this.callback(0, 1);
    var epsRule = this.grammar.tryGetRule(this.grammar.getStarting().toString(), "0");
    if (epsRule) {
        /* can be parsed */
        this.parsable = true;
        this.overrideCYKParseTree = new EpsilonPTNode(epsRule);
    } else {
        this.parsable = false;
    }
    this.callback(1, 1);
}

CYK.prototype.step = function () {
    /// <summary>process another parse table field; O(|w|)</summary>

    var field = this.shift(), invRules = this.invRules, that = this;
    if (!field)
        return this.stepsFinished();
    this.callback(this.currentStep, this.totalSteps);
    this.currentStep++;
 
    if (field.i == 1) {

        /* is the bottom-most field - we should look at the input word */
        var rules = invRules[this.word.get(field.j - 1)];
        if (!rules) {
            /* no N -> t rule, word cannot be parsed */
            this.parsable = false;
            return this.callback(this);
        }
        $.each(rules, function (i, rule) {
            field.add(rule);
        });

    } else {

        /* is not a bottom most field, let us get the list of its sources */
        /* the first loop is O(|w|), rest should be O(grammar) */
        $.each(field.getSources(), function (i, pair) {
            /* we have a pair of fields, each could have multiple nonterminals */
            $.each(pair.first.getNonterminals(), function (i, n1) {
                $.each(pair.second.getNonterminals(), function (i, n2) {
                    /* I now have one of nonterminal pairs, let's find its rules */
                    var rules = invRules[new Word([n1, n2], that.grammar)] || [];
                    $.each(rules, function (i, rule) {
                        field.add(rule, pair.first, pair.second);
                    });
                });
            });
        });

    }

    if (this.currentStep % CYK.timeoutOnEach)
        that.step();
    else setTimeout(function () {
            that.step();
        }, CYK.timeout);
}

CYK.prototype.stepsFinished = function () {
    /// <summary>the table is now filled with data, we can decide "parsable"</summary>

    this.parsable = this.table[this.length][1].contains(this.grammar.getStarting());
    this.callback(this.currentStep, this.totalSteps);
}

CYK.prototype.isParsable = function () {
    /// <summary>was parsing successful or not?</summary>

    return this.parsable;
}

CYK.prototype.getRandomCYKParseTree = function () {
    /// <summary>load a random one of possible parse trees, or return false if the word is not parsable</summary>
    /// <returns type="PTNode" />

    if (!this.parsable) return false;
    else if (this.overrideCYKParseTree) return this.overrideCYKParseTree;
    else return this.table[this.length][1].getRandomTreeFor(this.grammar.getStarting());
}