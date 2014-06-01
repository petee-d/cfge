/* parse tree node class and it's subclasses */
function PTNode() {
    /// <summary>node in the parse tree</summary>

    this.rule = null; /* ABSTRACT */
}
PTNode.prototype.r = function(){
    /// <returns type="Rule" />
    return this.rule;
}
PTNode.prototype.toElement = function () {
    /// <summary>create a jQuery-wrapped element representation of this node</summary>
    /// <returns type="$Element" />
    return $(); /* ABSTRACT */
}
PTNode.colorize = function (e, i) {
    var c = 150 + Math.round(85 / Math.pow(Math.abs(i) || 1, 0.3));
    return $(e).attr('style', "border-color: rgb(" + (c - 10) + "," + (c - 10) + "," + (c - 10) + "); " + (
        "background: rgb(47,47,47); /* Old browsers */ " +
        "background: -moz-linear-gradient(top, rgb(47,47,47) 0%, rgb(220,230,242) 100%); /* FF3.6+ */ " +
        "background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgb(47,47,47)), color-stop(100%,rgb(220,230,242))); /* Chrome,Safari4+ */ " +
        "background: -webkit-linear-gradient(top, rgb(47,47,47) 0%,rgb(220,230,242) 100%); /* Chrome10+,Safari5.1+ */ " +
        "background: -o-linear-gradient(top, rgb(47,47,47) 0%,rgb(220,230,242) 100%); /* Opera 11.10+ */ " +
        "background: -ms-linear-gradient(top, rgb(47,47,47) 0%,rgb(220,230,242) 100%); /* IE10+ */ " +
        "background: linear-gradient(to bottom, rgb(47,47,47) 0%,rgb(220,230,242) 100%); /* W3C */ "
    ).replace(/\(47,47,47\)/g, "(" + c + "," + c + "," + c + ")"));
}
PTNode.prototype.toDerivationElement = function (dir) {
    /// <summary>create a jQuery-wrapped element representation of x-most derivation created from this parse tree</summary>
    /// <param name="dir" type="String">"left" or "right" -most derivation?</param>
    /// <returns type="$Element" />
    var e = $('<span class="derivation">')
        .append(new Word([this.r().getLeft()], this.r().getRight().getGrammar()).toElement());
    this.recursiveDerivation(e, dir, [], []);
    return e;
}
PTNode.prototype.recursiveDerivation = function (e, dir, prefix, suffix) {
    /// <summary>handles recursive composition of the derivation</summary>
    /// <param name="e" type="$Element">where to append added stuff</param>
    /// <param name="dir" type="String">"left" or "right" -most derivation?</param>
    /// <param name="prefix" type="Array">current sentence form prefix</param>
    /// <param name="suffix" type="Array">current sentence form suffix</param>

    var form = prefix
        .concat(this.r().getRight().get())
        .concat(suffix);
    e.append($('<span class="syntax"> &rArr;</span>'))
     .append(new Word(form, this.r().getRight().getGrammar()).toElement());
    this.doTheRest(e, dir, prefix, suffix);
}


function EpsilonPTNode(rule) {
    /// <summary>node representing the usage of a type [S -> 0] rule (whole parse tree)</summary>
    /// <param name="rule" type="Rule">the [S -> 0] rule</param>

    this.rule = rule;
}
EpsilonPTNode.prototype = new PTNode();
EpsilonPTNode.prototype.toElement = function (i) {
    /// <summary>create a jQuery-wrapped element representation of this node</summary>
    /// <returns type="$Element" />
    i = i || 1;
    return PTNode.colorize($('<table class="ptnode epsilon_ptnode">'), i)
        .append($('<tbody>').append(
            $('<tr>').append(
                $('<th>').append(this.rule.getLeft().toElement())),
            $('<tr>').append(
                $('<td>').append(this.rule.getRight().toElement())
        )));
}
EpsilonPTNode.prototype.doTheRest = function () {
    /// <summary>derivate children and modify prefix/suffix if necessary</summary>
    /* no children, prefix/suffix change ignored */
}


function TerminalPTNode(rule) {
    /// <summary>node representing the usage of a type [N -> T] rule</summary>
    /// <param name="rule" type="Rule">a type [N -> T] rule</param>

    this.rule = rule;
}
TerminalPTNode.prototype = new PTNode();
TerminalPTNode.prototype.toElement = function (i) {
    /// <summary>create a jQuery-wrapped element representation of this node</summary>
    /// <returns type="$Element" />
    i = i || 1;
    return PTNode.colorize($('<table class="ptnode terminal_ptnode">'), i)
        .append($('<tbody>').append(
            $('<tr>').append(
                $('<th>').append(this.rule.getLeft().toElement())),
            $('<tr>').append(
                $('<td>').append(this.rule.getRight().toElement())
        )));
}
TerminalPTNode.prototype.doTheRest = function (e, dir, prefix, suffix) {
    /// <summary>derivate children and modify prefix/suffix if necessary</summary>
    /// <param name="e" type="$Element">where to append added stuff</param>
    /// <param name="dir" type="String">"left" or "right" -most derivation?</param>
    /// <param name="prefix" type="Array">current sentence form prefix</param>
    /// <param name="suffix" type="Array">current sentence form suffix</param>

    /* terminal produced - change prefix/suffix */
    if (dir == "left")
        prefix.push(this.r().getRight().get(0));
    else
        suffix.unshift(this.r().getRight().get(0));
}


function BinaryPTNode(rule, first, second) {
    /// <summary>node representing the usage of a type [N -> NN] rule</summary>
    /// <param name="rule" type="Rule">a type [N -> NN] rule</param>
    /// <param name="first" type="PTNode">what do I do with the first nonterminal</param>
    /// <param name="second" type="PTNode">what do I do with the second nonterminal</param>

    this.rule = rule;
    this.first = first;
    this.second = second;
}
BinaryPTNode.prototype = new PTNode();
BinaryPTNode.prototype.toElement = function (i) {
    /// <summary>create a jQuery-wrapped element representation of this and child nodes</summary>
    /// <returns type="$Element" />
    i = i || 1;
    return PTNode.colorize($('<table class="ptnode binary_ptnode">'), i)
        .append($('<tbody>').append(
            $('<tr>').append(
                $('<th colspan="2">').append(this.rule.getLeft().toElement())),
            $('<tr>').append(
                $('<td>').append(this.first.toElement(i + 1)),
                $('<td>').append(this.second.toElement(i + 1))
        )));
}
BinaryPTNode.prototype.doTheRest = function (e, dir, prefix, suffix) {
    /// <summary>derivate children and modify prefix/suffix if necessary</summary>
    /// <param name="e" type="$Element">where to append added stuff</param>
    /// <param name="dir" type="String">"left" or "right" -most derivation?</param>
    /// <param name="prefix" type="Array">current sentence form prefix</param>
    /// <param name="suffix" type="Array">current sentence form suffix</param>

    if (dir == "left") {
        this.first.recursiveDerivation(e, dir, prefix, [this.r().getRight().get(1)].concat(suffix));
        this.second.recursiveDerivation(e, dir, prefix, suffix);
    } else {
        this.second.recursiveDerivation(e, dir, prefix.concat([this.r().getRight().get(0)]), suffix);
        this.first.recursiveDerivation(e, dir, prefix, suffix);
    }
}



// static class

var CYKParseTree = {

    getOriginalGrammarRule: function () {
        return "optional";
    },

    getId: function () {
        return "CYKParseTree";
    },

    getTabId: function () {
        return "CYKParseTree";
    },

    open: function () {
        Evaluator.update(Current.grammar);
        $('#tab_' + this.getTabId()).children().hide();

        if (StrictChomskyForm.check(Current.grammar) == true) {

            $('#PT_first').show();
            $('#PT_input').val('');

            function validateCYKInput(reportErrors) {
                var input = Word.tryParseString($('#PT_input').val(), Current.grammar);
                if (!input && !(function () {
                    /* a little hack requested by Zemco - if all terminals are represented by 1 character, I'll add spaces myself */
                    var shortTerminals = true;
                    Current.grammar.forEachTerminal(function (t) {
                        if (t.toString().length > 1)
                            return shortTerminals = false;
                    });
                    if (shortTerminals)
                        input = Word.tryParseString($('#PT_input').val().replace(/(?:)/g, ' '), Current.grammar);
                    return input;
                })())
                    return (reportErrors && NotificationBar.pop(_("The input is not a valid word! Separate some terminal symbols of the current grammar by spaces, or 0 for empty word.")), false);

                input = new Word(input, Current.grammar);
                if (!input.isTerminal())
                    return (reportErrors && NotificationBar.pop(_("The input word is not terminal! Use only terminal symbols of the current grammar, or 0 for empty word.")), false);

                return input;
            }

            $('#PT_input').off('keydown').keydown(function () {
                setTimeout(function () {
                    var input = validateCYKInput(false);
                    if (input && input.length() > 47)
                        NotificationBar.pop(_("The input word is getting quite long, drawing the parse tree might freeze your browser..."));
                }, 1);
            });
            $('#PT_execute').off('click').click(function () {
                var input = validateCYKInput(true);
                if (!input)
                    return;

                $('#PT_result, #PT_tree, #PT_leftmostDerivation, #PT_rightmostDerivation').hide();

                Current.CYK = new CYK(Current.grammar, input);
                Current.CYK.execute(function (currentStep, totalSteps) {
                    if (currentStep < totalSteps) {
                        $('#PT_progress').show();
                        $('#PT_progessbar').css('width',
                                Math.round(currentStep / totalSteps * 100) + '%'
                            ).next().text(currentStep + ' / ' + totalSteps);
                    } else {
                        $('#PT_progress, #PT_success, #PT_failure, #PT_anotherCYKParseTree').hide();
                        $('#PT_inputRich').html('').append(input.toElement());
                        if (!Current.CYK.isParsable())
                            $('#PT_failure').show();
                        else {
                            $('#PT_success').show();
                            $('#PT_anotherCYKParseTree').show().click(function () {
                                CYKParseTree.drawCYKParseTree();
                            });
                            CYKParseTree.drawCYKParseTree();
                        }
                        $('#PT_result').show();
                    }
                });
            });

        } else
            $('#PT_notInChomsky').show();
    },

    drawCYKParseTree: function () {
        $('#PT_tree, #PT_leftmostDerivation, #PT_rightmostDerivation').hide();
        var tree = Current.CYK.getRandomCYKParseTree();
        $('#PT_tree').html('').append(tree.toElement());
        $('#PT_leftmostDerivation').find('> div').html('').append(
                tree.toDerivationElement('left')
            );
        $('#PT_rightmostDerivation').find('> div').html('').append(
                tree.toDerivationElement('right')
            );
        $('#PT_tree, #PT_leftmostDerivation, #PT_rightmostDerivation').show();
    }

}