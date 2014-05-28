// class ParserStack : Structure

function ParserStack(id, name) {
    /// <summary>constructor of an LR state, will be created with empty set of core and noncore items</summary>
    /// <param name="id" type="String">id for manipulation</param>
    /// <param name="name" type="String">name of this state, displayed to the user</param>
    this.initStructure(id, name);
    this._stack = [];
}
ParserStack.prototype = new Structure();
ParserStack.prototype.toStructureInnerElement = function () {
    /// <returns type="$Element" />
    return $('<div class="parser-stack"></div>').append(
        $.map(this._stack, function (e) {
            return $('<div></div>').append(e.toElement());
        })
    );
}
ParserStack.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    return { stack: $.map(this._stack, function (e) { return e.toData(); }) };
}
ParserStack.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    this._stack = $.map(data.stack, function (d) {
        return Structure.fromData(d, grammar)
    });
}
ParserStack.prototype.finalize = function () {
    $.each(this._stack, function (i, e) { e.finalize() });
    return this;
}
ParserStack.prototype.push = function (item) {
    /// <summary>push a new item on the top of the stack</summary>
    if (item instanceof Symbol)
        item = new SymbolWrapperStructure(false, false, item);
    this._stack.push(item);
}
ParserStack.prototype.peekTop = function () {
    /// <summary>non-destructively look at the symbol at the top of the stack</summary>
    if (!this._stack.length) return null;
    var item = this._stack[this._stack.length - 1];
    if (item instanceof SymbolWrapperStructure)
        item = item.unwrap();
    return item;
}
ParserStack.prototype.popN = function (n) {
    /// <summary>pop `n` items from the top of the stack, don't even return them</summary>
    /// <param name="n" type="Number">number of items to remove</param>
    for (var i = 0; i < n; i++)
        this._stack.pop();
}
ParserStack.prototype.getType = function () {
    return "ParserStack";
}


// class SymbolWrapperStructure : Structure
//  is as dumb as it looks

function SymbolWrapperStructure(id, name, symbol) {
    /// <summary>constructor of an LRItemSet, will be created with empty set of items</summary>
    this._symbol = symbol;
}
SymbolWrapperStructure.prototype = new SetStructure();
SymbolWrapperStructure.prototype.toElement = function () {
    /// <returns type="$Element" />
    return this._symbol.toElement();
}
SymbolWrapperStructure.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    return { s: this._symbol.toString() };
}
SymbolWrapperStructure.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    this._symbol = grammar.tryGetSymbol(data.s);
}
SymbolWrapperStructure.prototype.unwrap = function () {
    /// <returns type="Symbol" />
    return this._symbol;
}
SymbolWrapperStructure.prototype.getType = function () {
    return "SymbolWrapperStructure";
}


// class ParserInput : Structure

function ParserInput(id, name, word, grammar) {
    /// <summary>construct a wrapper object for the input word currently being processed</summary>
    /// <param name="word" type="Word">word over `grammar`'s symbols to parse</param>
    /// <param name="grammar" type="Grammar">grammar the input word could be created with</param>
    this.initStructure(id, name);
    if (word && grammar) {
        this._w = word.get();
        this._w.push(grammar.getEndMarker());
    } else this._w = [];
    this._pos = 0;
}
ParserInput.prototype = new Structure();
ParserInput.prototype.toStructureInnerElement = function () {
    /// <returns type="$Element" />
    var pos = this._pos;
    return $('<div class="parser-input"></div>').append(
            $.map(this._w, function (e, i) {
                var cls = (i < pos ? "input-processed" : (i == pos ? "input-current" : "input-left"))
                return $('<div></div>').addClass(cls).append(e.toElement());
            })
        );
}
ParserInput.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    return { pos: this._pos, w: $.map(this._w, function (e) { return e.toString(); }) };
}
ParserInput.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    this._pos = data.pos;
    this._w = $.map(data.w, function (e) { return grammar.tryGetSymbol(e); });
}
ParserInput.prototype.getLookahead = function () {
    /// <returns type="Terminal" />
    return this._w[this._pos];
}
ParserInput.prototype.next = function () {
    /// <summary>return the current symbol and move to the next one, it is an error to do so if the current symbol is the end-marker</summary>
    if (this._pos == this._w.length - 1) return MyError('parser input cannot go beyond the endmarker!');
    return this._w[this._pos++];
}
ParserInput.prototype.getType = function () {
    return "ParserInput";
}



// class ParserOutput : Structure

function ParserOutput(id, name) {
    /// <summary>construct a wrapper object for the output parse tree of this</summary>
    /// <param name="word" type="Word">word over `grammar`'s symbols to parse</param>
    /// <param name="grammar" type="Grammar">grammar the input word could be created with</param>
    this.initStructure(id, name);
    this._rules = [];
    this._finished = false;
    this._traversalMethod = 'FINISH_FIRST!';
}
ParserOutput.prototype = new Structure();
ParserOutput.prototype.emitRule = function (rule) {
    /// <summary>emit a rule to the output, in the appropriate order</summary>
    /// <param name="rule" type="Rule"></param>
    this._rules.push(rule);
}
ParserOutput.prototype.finish = function (isLR) {
    /// <summary>finish the output and allow drawing this structure</summary>
    if (this._finished) return;

    if (isLR)
        this._rules = this._rules.reverse();
    this._traversalMethod = isLR ? 'nextLR' : 'nextLL';
    this._finished = true;
}
ParserOutput.prototype.toStructureInnerElement = function () {
    /// <returns type="$Element" />
    if (!this._finished) return $();

    var that = this, root = new ParseTreeNode(), current = root;
    $.each(this._rules, function (i, rule) {
        while (!current.formRule(rule))
            current = current[that._traversalMethod]();
        current = current[that._traversalMethod]();
    });

    return $('<div class="parser-input"></div>').append(root.toElement());
}
ParserOutput.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    return {
        rules: $.map(this._rules, function (rule) { return { l: rule.getLeft().toString(), r: rule.getRight().toString() }; }),
        finished: this._finished,
        traversalMethod: this._traversalMethod
    };
}
ParserOutput.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    this._rules = $.map(data.rules, function (o) { return grammar.tryGetRule(o.l, o.r); });
    this._finished = data.finished;
    this._traversalMethod = data.traversalMethod;
}
ParserOutput.prototype.getType = function () {
    return "ParserOutput";
}






function ParseTreeNode() {
    /// <summary>node representing the usage of any type of rule</summary>

    this.rule = null;

    this.parent = null;
    this.firstChild = null;
    this.lastChild = null;
    this.prev = null;
    this.next = null;
}
ParseTreeNode.prototype.formRule = function (rule) {
    /// <summary>try to make this node form a rule, return whether it was successful</summary>
    /// <param name="rule" type="Rule">the rule to be represented by this node</param>
    /// <returns type="Boolean"/>

    var that = this;
    this.rule = rule;
    rule.getRight().forEachSymbol(function (symbol) {
        if (symbol.isTerminal())
            that.adopt(new TerminalParseTreeNode(symbol));
        else
            that.adopt(new ParseTreeNode());
    });
    return true;
}
ParseTreeNode.prototype.adopt = function (node) {
    /// <summary>add node as the last child of this node</summary>
    /// <param name="node" type="ParseTreeNode">the new child to adopt</param>

    if (this.firstChild) {
        this.lastChild.next = node;
        node.prev = this.lastChild;
        this.lastChild = node;
    } else {
        this.firstChild = this.lastChild = node;
    }
    node.parent = this;
}
ParseTreeNode.prototype.nextLL = function () {
    /// <summary>get node positioned right after this node in a prefix traversal</summary>
    /// <returns type="ParseTreeNode" />
    if (this.firstChild)
        return this.firstChild;
    var point = this;
    while (!point.next && point.parent)
        point = point.parent;
    return point.next || null;
}
ParseTreeNode.prototype.nextLR = function () {
    /// <summary>get node positioned right before this node in a postfix traversal</summary>
    /// <returns type="ParseTreeNode" />
    if (this.lastChild)
        return this.lastChild;
    var point = this;
    while (!point.prev && point.parent)
        point = point.parent;
    return point.prev || null;
}
ParseTreeNode.prototype.toElement = function (i) {
    /// <summary>create a jQuery-wrapped element representation of this and child nodes</summary>
    /// <param name="i" type="Number">0 - 1 shade of gray</param>
    /// <returns type="$Element" />
    i = i || 1;
    var $node = $('<table class="ptnode"></table>'), $productions = $('<tr></tr>'),
        child = this.firstChild, count = 0;

    if (child)
        /* add each produced symbol */
        do {
            $productions.append($('<td>').append(child.toElement(i + 1)));
            count++;
        } while (child = child.next);
    else {
        /* epsilon rule, add epsilon symbol, mark node as epsilon node */
        $productions.append($('<td>').append(this.rule.getRight().toElement()));
        $node.addClass('epsilon_ptnode');
    }

    return PTNode.colorize($node, i).append(
        $('<tbody></tbody>').append(
            $('<tr></tr>').append(
                $('<th></th>').attr('colspan', this.rule.getRight().length())
                    .append(this.rule.getLeft().toElement())),
            $productions
        ));
}


function TerminalParseTreeNode(terminal) {
    /// <summary>node representing the occurence of a terminal</summary>

    this.terminal = terminal;

    this.parent = null;
    this.firstChild = null;
    this.lastChild = null;
    this.prev = null;
    this.next = null;
}
TerminalParseTreeNode.prototype = new ParseTreeNode();
TerminalParseTreeNode.prototype.formRule = function () {
    return false;
}
TerminalParseTreeNode.prototype.adopt = null;
TerminalParseTreeNode.prototype.toElement = function (i) {
    /// <summary>create a jQuery-wrapped element representation of this and child nodes</summary>
    /// <param name="i" type="Number">0 - 1 shade of gray</param>
    /// <returns type="$Element" />
    i = i || 1;
    return PTNode.colorize($('<table class="ptnode terminal_ptnode">'), i)
        .append($('<tbody>').append(
            $('<tr>').append(
                $('<th>').append(this.terminal.toElement())),
            $('<tr>').append(
                $('<td>').append(this.terminal.toElement())
        )));
}


