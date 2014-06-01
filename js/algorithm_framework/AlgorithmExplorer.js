// class AlgorithmExplorer

function AlgorithmExplorer(Algorithm) {
    /// <summary>prepare a new use of the Algorithm to the Current.grammar</summary>
    /// <param name="Algorithm" type="Function">an AlgorithmController subclass to run</param>

    this._c = new Algorithm().init(this);
}

AlgorithmExplorer.prototype.controller =
AlgorithmExplorer.prototype.c = function () {
    /// <returns type="AlgorithmController" />
    return this._c;
}
AlgorithmExplorer.prototype.start = function (invoker) {
    /// <param name="invoker" type="Function">if passed, this it receives a callback to start the execution</param>
    /// <summary>execute the prepared algorithm</summary>
    $('#algorithm_arrows li, #algorithm_save').off('click');
    $('#algorithm_steps select').off();
    $('#algorithm_toolbox').fadeOut(1000);
    $('#algorithm_container').html('').hide();

    if (invoker) {
        var that = this;
        invoker(function () {
            $('#algorithm_setup').show().find("#algorithm_progress").html('').text('...');
            that.c().execute();
        });
    } else {
        $('#algorithm_setup').show().find("#algorithm_progress").html('').text('...');
        this.c().execute();
    }
}

AlgorithmExplorer.prototype.reportStep = function (numbering, name) {
    /// <summary>report a successful conversion step to GUI</summary>
    /// <param name="numbering" type="String"></param>
    /// <param name="name" type="String"></param>

    $('#algorithm_progress').html(_("Converting, please wait...") + " " +
        "(" + numbering + ")" /* + " (" + name + ")" */ );
}

AlgorithmExplorer.prototype.reportFinished = function () {
    /// <summary>report to GUI that the conversion has been completed - display it to the user</summary>
    var that = this;

    $('#algorithm_arrows li').each(function () {
        $(this).click(function () {
            that[$(this).attr('id').substr("algorithm_".length)]();
        })
    });

    function saveCrossState(node) {
        /// <param name="node" type="ACTNode">node of the step to save</param>
        var grammar = node.getFinalizedGrammar(),
            lrTable = node.structures().getTableStructure('LRTable'),
            llTable = node.structures().getTableStructure('LLTable');
        
        purgeStoredParseTables();

        if (lrTable || llTable) {
            Current.lrTable = lrTable;
            Current.llTable = llTable;
            Evaluator.update(Current.grammar);
            Menu.unlock(ParseTableInput);
            Menu.unlock(lrTable ? LRParserAlgorithm : LLParserAlgorithm);
            Menu.open(ParseTableInput);
        } else {
            Current.grammar = grammar;
            Menu.open(RichInput);
        }
    }
    $('#algorithm_save_result').unbind('click').click(function () {
        saveCrossState(that.c().root().lastChild());
    });
    $('#algorithm_save_current').unbind('click').click(function () {
        saveCrossState(that.c().active());
    });
    var events = {};
    $('#algorithm_steps select').empty().off().each(function () {
        var node = that.c().root();
        while (node = node.after())
            $(this).append($('<option></option>').val(node.numbering())
                .html(node.numbering() + ': ' + (events[node.numbering()] = node).name()));
    }).change(function () {
        that.c()._active = events[$('option:selected', this).val()];
        that.openActiveStep();
    });

    $('#algorithm_toolbox').stop(true).fadeIn(100);
    $('#algorithm_container').add('#algorithm_right').fadeIn(200);
    $('#algorithm_setup').fadeOut(150);
    this.openActiveStep();
}


AlgorithmExplorer.prototype.openActiveStep = function () {
    /// <summary>display the active step's contents</summary>
    var a = Current.step = this.c().active();

    $('#algorithm_container').replaceWith(
        $('<div id="algorithm_container"></div>')
            .append(a.structures().plot(a.grammar()))
        );
    $('#algorithm_setup, #algorithm_ParserInput').hide();
    $('#algorithm_name').html('');
    $('#algorithm_table').html('');
    $('#algorithm_steps select').val(a.numbering());

    do {
        var numb = a.numbering().match(/((?:[0-9]+\.)*)([0-9]+)$/);
        $('#algorithm_table').prepend($('<tr>' +
            '<td><small>' + numb[1] + '</small>' + numb[2] + '</td>' +
            '<td>' + a.name() + '</td>' +
            '</tr>'));
    } while ((a = a.parent()) && a != this.c().root());
    $('#algorithm_name').text(a.name());
    Evaluator.update(this.c().active().getFinalizedGrammar());
}

AlgorithmExplorer.prototype.goBackward = function () {
    if (this.c().active().before() && this.c().active().before() != this.c().root())
        this.c()._active = this.c().active().before();
    this.openActiveStep();
}
AlgorithmExplorer.prototype.goForward = function () {
    if (this.c().active().after())
        this.c()._active = this.c().active().after();
    this.openActiveStep();
}
AlgorithmExplorer.prototype.goPrev = function () {
    if (this.c().active().prev()) {
        this.c()._active = this.c().active().prev();
        this.openActiveStep();
    }
    else
        this.goBackward();
}
AlgorithmExplorer.prototype.goNext = function () {
    if (this.c().active().next()) {
        this.c()._active = this.c().active().next();
        this.openActiveStep();
    }
    else
        this.goForward();
}
AlgorithmExplorer.prototype.goStart = function () {
    this.c()._active = this.c().root().firstChild();
    this.openActiveStep();
}
AlgorithmExplorer.prototype.goEnd = function () {
    this.c()._active = this.c().root().lastChild();
    this.openActiveStep();
}

AlgorithmExplorer.userParserInput = function (callback) {
    /// <summary>attempt to store a valid user's input word and execute callback</summary>
    /// <param name="callback" type="Function">function to call after getting valid input word from the user</param>
    $('#algorithm_container').hide();
    var originalWord = (Current.parserInput && Current.parserInput.getWord()) || new Word([], Current.grammar);
    $('#algorithm_ParserInput input').val(originalWord.toString());
    $('#PI_grammar').empty().append(Current.grammar.toElement());
    $('#algorithm_ParserInput').show();

    $('#algorithm_ParserInput .button').unbind('click').click(function () {
        function getValidatedInputWord(reportErrors) {
            var inputStr = $('#algorithm_ParserInput input').val(),
                input = Word.tryParseString(inputStr, Current.grammar);
            if (!input && !(function () {
                /* a little hack requested by Zemco - if all terminals are represented by 1 character, I'll add spaces myself */
                var shortTerminals = true;
                Current.grammar.forEachTerminal(function (t) {
                    if (t.toString().length > 1)
                        return shortTerminals = false;
                });
                if (shortTerminals)
                    input = Word.tryParseString(inputStr.replace(/(?:)/g, ' '), Current.grammar);
                return input;
            })())
                return (reportErrors && NotificationBar.pop(_("The input is not a valid word! Separate some terminal symbols of the current grammar by spaces, or %s for empty word.", Word.epsStr)), false);

            input = new Word(input, Current.grammar);
            if (!input.isTerminal())
                return (reportErrors && NotificationBar.pop(_("The input word is not terminal! Use only terminal symbols of the current grammar, or %s for empty word.", Word.epsStr)), false);

            return input;
        }

        var input = getValidatedInputWord(true);
        if (input) {
            Current.parserInput = new ParserInput('ParserInput', _("Input"), input, Current.grammar);
            callback();
        }
    });
}


function openAlgorithmExplorer(Algorithm, invoker) {
    /// <summary>user opened the algorithm tab for the Algorithm - open and recalc if necessary</summary>
    /// <param name="Algorithm" type="Function">an AlgorithmController subclass to open</param>
    /// <param name="invoker" type="Function">if passed, this it receives a callback to start the execution</param>
    if (Current.explorer && !invoker
            && Current.explorer.c().getName() == Algorithm.getName()
            && Current.grammar.lastChange() == Current.explorer.c()._timestamp) {
        // nothing important changed since last time, so no recalc is needed
        Current.explorer.openActiveStep();
    } else
        (Current.explorer = new AlgorithmExplorer(Algorithm)).start(invoker);
}



function purgeStoredParseTables() {
    /// <summary>clear all the stored parse tables that were generated from the Current.grammar</summary>
    Current.lrTable = Current.llTable = null;
    Menu.lock(ParseTableInput);
    Menu.lock(LRParserAlgorithm);
    Menu.lock(LLParserAlgorithm);
}