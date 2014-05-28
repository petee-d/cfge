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
AlgorithmExplorer.prototype.start = function () {
    /// <summary>execute the prepared algorithm</summary>
    $('#algorithm_container').html('').add('#algorithm_right').hide();
    $('#algorithm_arrows li, #algorithm_save').off('click');
    $('#algorithm_setup').show().find("#algorithm_progress").html('').text('...');

    this.c().execute();
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

        Menu.lock(ParseTableInput);
        Menu.lock(LRParserAlgorithm);
        Menu.lock(LLParserAlgorithm);

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

    $('#algorithm_container').add('#algorithm_right').fadeIn(200);
    $('#algorithm_setup').fadeOut(150);
    this.openActiveStep();
}


AlgorithmExplorer.prototype.openActiveStep = function () {
    /// <summary>display the active step's contents</summary>
    var a = Current.step = this.c().active();

    $('#algorithm_container').replaceWith(
        $('<div id="algorithm_container"></div>')
            .append(a.grammar().toElement())
            .append(a.structures().toElement())
        );
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


function openAlgorithmExplorer(Algorithm) {
    /// <summary>user opened the algorithm tab for the Algorithm - open and recalc if necessary</summary>
    /// <param name="Algorithm" type="Function">an AlgorithmController subclass to open</param>
    if (Current.explorer && Current.explorer.c().getName() == Algorithm.getName()
            && Current.grammar.lastChange() == Current.explorer.c()._timestamp) {
        // nothing important changed since last time, so no recalc is needed
        Current.explorer.openActiveStep();
    } else
        (Current.explorer = new AlgorithmExplorer(Algorithm)).start();
}