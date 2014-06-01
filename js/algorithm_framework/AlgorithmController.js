// class ACTNode

function ACTNode(program) {
    /// <summary>a node of the Algorithm Controller Tree</summary>
    /// <param name="program" type="Function">the subprocedure this node represents</param>

    this._name = "# name is missing...? #";
    this._numbering = "";
    this._parent = null;
    this._firstChild = null;
    this._lastChild = null;
    this._prev = null;
    this._next = null;
    this._data = {
        // state
        grammar: null,
        structures: null,

        // controller data
        program: program,
        hook: null,
        willRepeat: false
    };
}
ACTNode.prototype.name = function (setName) {
    /// <summary>name of this node (step) displayed to the user</summary>
    /// <param name="setName" type="String">optional - set this node's name</param>
    /// <returns type="String" />
    return setName ? (this._name = setName) : this._name;
}
ACTNode.prototype.numbering = function () {
    /// <summary>numbering of this node displayed to the user</summary>
    /// <returns type="String" />
    return this._numbering;
}
ACTNode.prototype.parent = function () {
    /// <summary>parent of this node</summary>
    /// <returns type="ACTNode" />
    return this._parent;
}
ACTNode.prototype.firstChild = function () {
    /// <summary>first child of this node</summary>
    /// <returns type="ACTNode" />
    return this._firstChild;
}
ACTNode.prototype.lastChild = function () {
    /// <summary>last child of this node</summary>
    /// <returns type="ACTNode" />
    return this._lastChild;
}
ACTNode.prototype.next = function () {
    /// <summary>next sibling of this node</summary>
    /// <returns type="ACTNode" />
    return this._next;
}
ACTNode.prototype.prev = function () {
    /// <summary>previous sibling of this node</summary>
    /// <returns type="ACTNode" />
    return this._prev;
}
ACTNode.prototype.before = function () {
    /// <summary>node chronologically before this node</summary>
    /// <returns type="ACTNode" />
    var point;
    if (point = this.prev()) {
        while (point.lastChild())
            point = point.lastChild();
        return point;
    } else return this.parent();
}
ACTNode.prototype.after = function () {
    /// <summary>node chronologically after this node</summary>
    /// <returns type="ACTNode" />
    if (this.firstChild())
        return this.firstChild();
    var point = this;
    while (!point.next() && point.parent())
        point = point.parent();
    return point.next() || null;
    
}
ACTNode.prototype.program = function () {
    /// <summary>program represented by this node</summary>
    /// <returns type="Function" />
    return typeof(this._data) == 'object' ? this._data.program : null;
}
ACTNode.prototype.hook = function (setHook) {
    /// <summary>program represented by this node</summary>
    /// <param name="setHook" type="Function">optional - set this node's hook - the code silently executed after finalizing the state</param>
    /// <returns type="Function" />
    return typeof (this._data) == 'object'
        ? (setHook ? this._data.hook = setHook : this._data.hook)
        : null;
}
ACTNode.prototype.grammar = function () {
    /// <summary>STATE - grammar held by this node</summary>
    /// <returns type="ConversionGrammar" />
    var d = this._data;
    if (typeof (d) == 'object')
        if (d.grammar)
            return d.grammar;
        else return d.grammar = new ConversionGrammar(d.grammarData);
    else return null;
}
ACTNode.prototype.structures = function () {
    /// <summary>STATE - structures held by this node</summary>
    /// <returns type="Structures" />
    var d = this._data;
    if (typeof (d) == 'object')
        if (d.structures)
            return d.structures;
        else return d.structures = new Structures(d.structuresData, this.grammar());
    else return null;
}
ACTNode.prototype.adopt = function (node) {
    /// <summary>add node as the last child of this node, initialize node with data</summary>
    /// <param name="node" type="ACTNode">the new child to adopt</param>

    if (this.firstChild()) {
        this.lastChild()._next = node;
        node._prev = this.lastChild();
        this._lastChild = node;
    } else {
        this._firstChild = this._lastChild = node;
    }
    node._parent = this;
}
ACTNode.prototype.duplicate = function () {
    /// <summary>insert a clone of this node right after it</summary>

    var copy = new ACTNode(this.program());
    if (this.next()) {
        // there already is a node queued after this one, insert
        copy._parent = this.parent();
        copy._prev = this;
        copy._next = this.next();
        this._next = copy;
        copy._next._prev = copy;
    } else if (this.parent())
        // this node is the last one - let it's parent do the job
        this.parent().adopt(copy);
    // else this is root - I ain't cloning that 
}
ACTNode.prototype.getFinalizedConversionGrammar = function () {
    /// <summary>return a finalized version of current step's conversion grammar</summary>
    /// <returns type="ConversionGrammar" />
    var gd = this._data.grammarData || this.grammar().toConversionData();
    return new ConversionGrammar(gd).finalize();
}
ACTNode.prototype.getFinalizedGrammar = function () {
    /// <summary>finalize the ConversionGrammar in the current step and return a normal grammar</summary>
    /// <returns type="Grammar" />
    return new Grammar(this.getFinalizedConversionGrammar().toData());
}
ACTNode.prototype.createNumbering = function () {
    /// <summary>calculate the numbering for this node, using the numbering of the node before this one, hardcoded for root</summary>

    if (this.prev()) {
        var m = this.prev().numbering().match(/^((?:[0-9]+\.)*)([0-9]+)$/);
        this._numbering = m[1] + (m[2] * 1 + 1);
    } else if (this.parent())
        this._numbering = this.parent().numbering() ? this.parent().numbering() + '.1' : '1';
}
ACTNode.prototype.setInitialState = function (state) {
    /// <param name="state" type="Object">{ grammar: (ConversionGrammar), structures: (Structures) }</param>
    /// <param name="structures" type="Structures"></param>
    this._data.grammar = state.grammar;
    this._data.structures = state.structures;
}
ACTNode.prototype.getFinalizedState = function () {
    /// <summary>once the subprogram has been executed, this method will do any finalizing operations (i.e. memory optimization) and return the state</summary>

    var state = { grammar: this.grammar(), structures: this.structures() },
        grammarData = state.grammar.toConversionData(), structuresData = state.structures.toData();

    // idea: the data could be serialized if holding objects eats up too much memory
    this._data.grammarData = grammarData;
    this._data.structuresData = structuresData;
    this._data.grammar = null;
    this._data.structures = null;

    state.grammar.finalize();
    state.structures.finalize();
    return state;
}



// abstract class AlgorithmController

function AlgorithmController() {
    // abstract - do nothing
}
AlgorithmController.timeout = 0;
AlgorithmController.batchSteps = 20;

AlgorithmController.prototype.init = function (explorer) {
    /// <summary>initialize this AlgorithmController (only prepare for the process, don't start)</summary>
    /// <param name="explorer" type="AlgorithmExplorer">GUI handler to report status to</param>
    /// <returns type="AlgorithmController" />
    if (!explorer) return; // for inheritance

    var that = this, grammar = Current.grammar;
    // Algorithm Controller Tree root
    this._root = new ACTNode(function (c) {
        c.task(function (c) { c.myNameIs(_("this is the initial state of the algorithm")) });
        that.main(c);
    });
    // active ACTNode
    this._active = this._root;
    // prepare data in the root node
    this._root.setInitialState({
        grammar: new ConversionGrammar(grammar.toData()), // the original grammar
        structures: new Structures() // empty structure object
    });
    this._auxiliaryData = {};
    this._stepIndex = 0;
    this._timestamp = grammar.lastChange();
    this._explorer = explorer;

    return this;
}

AlgorithmController.prototype.explorer = function () {
    /// <returns type="AlgorithmExplorer" />
    return this._explorer;
}
AlgorithmController.prototype.active = function () {
    /// <returns type="ACTNode" />
    return this._active;
}
AlgorithmController.prototype.root = function () {
    /// <returns type="ACTNode" />
    return this._root;
}

AlgorithmController.prototype.task = function (program) {
    /// <summary>add a new task to the current level task queue</summary>
    /// <param name="program" type="Function">a function carrying out the task; it will receive this controller as an argument</param>
    /// <returns type="AlgorithmController" />

    this.active().adopt(new ACTNode(program));
    return this;
}

AlgorithmController.prototype.hook = function (program) {
    /// <summary>append a hook to this task - code that will be silently executed after this task, changes done will appear in the next task</summary>
    /// <param name="program" type="Function">a function to be executed after this task; it will receive this controller as an argument</param>
    /// <returns type="AlgorithmController" />

    this.active().hook(program);
    return this;
}

AlgorithmController.prototype.willRepeat = function () {
    /// <summary>call to repeat current subprocedure after it ends</summary>

    this.active()._data.willRepeat = true;
}

AlgorithmController.prototype.execute = function () {
    /// <summary>configuration is done - start the conversion process</summary>

    this._active = this._root;
    this.step();
}

AlgorithmController.prototype.step = function () {
    /// <summary>do a single step of traversing the Conversion Process Tree and executing it's code</summary>

    var current = this.active(), that = this;
    this._stepIndex++;
    // calculates the appropriate numbering of a step
    current.createNumbering();

    current.program().call(this, this);

    if (current._data.willRepeat)
        current.duplicate();

    // finalize changes done in the last step and pass the state to the following node
    var state = current.getFinalizedState();
    if (current.after()) {
        this._active = current.after();
        this._active.setInitialState(state);
    } else
        Current.__debugResult__ = state;
    // execute hook if it exists
    if (current.hook())
        current.hook().call(this, this);
    // report to conversion explorer
    if (this.explorer())
        this.explorer().reportStep(current.numbering(), current.name());
    // if there is a node after this one, make it the new active one and prepare to execute it's code
    function following () {
        if (current.after())
            that.step();
        else
            that.finished();
    }
    if (this._stepIndex % AlgorithmController.batchSteps == 0)
        setTimeout(following, AlgorithmController.timeout);
    else
        following();
}

AlgorithmController.prototype.grammar = 
AlgorithmController.prototype.g = function () {
    /// <summary>get current grammar object</summary>
    /// <returns type="ConversionGrammar" />
    return this._active.grammar();
}
AlgorithmController.prototype.structures =
AlgorithmController.prototype.s = function () {
    /// <summary>get current structures object</summary>
    /// <returns type="Structures" />
    return this._active.structures();
}
AlgorithmController.prototype.data =
AlgorithmController.prototype.d = function () {
    /// <summary>object persistent through out the execution, it's the resposibility of each algorithm to use this object properly and avoid conflicts</summary>
    /// <returns type="Object" />
    return this._auxiliaryData;
}
AlgorithmController.prototype.myNameIs = function (name) {
    /// <summary>set the name for the current node</summary>
    /// <param name="name" type="String">the name displayed to user</param>
    this.active().name(name);
}

AlgorithmController.prototype.finished = function () {
    /// <summary>the conversion process is done</summary>

    // set the first node as the active one and report completed
    this._active = this.root().firstChild();
    if (this.explorer())
        this.explorer().reportFinished();
}




function setupAlgorithmImplementation(AlgorithmClass, settings) {
    /// <summary>set up a new class for a visualized algorithm</summary>
    /// <param name="AlgorithmClass" type="Function">function object of the algorithm</param>
    /// <param name="settings" type="Object">{ id: "NameOfTheClass", name: _("My new algorithm"), type: "MenuCategoryID", (optional) parent: BaseClassName, (optional) userParserInput: Boolean }</param>

    AlgorithmClass.prototype = new (settings.parent || AlgorithmController)();

    AlgorithmClass.prototype.getName =
    AlgorithmClass.getName = function () {
        /// <summary>return this grammar form's name</summary>
        /// <returns type="String" />
        return settings.name;
    }
    AlgorithmClass.getOriginalGrammarRule = function () {
        return "optional";
    };
    AlgorithmClass.getId = function () {
        return settings.id;
    };
    AlgorithmClass.getTabId = function () {
        return "Algorithm";
    };
    AlgorithmClass.getType = function () {
        return settings.type;
    };

    var invoker = null;
    if (settings.userParserInput)
        invoker = AlgorithmExplorer.userParserInput;
        
    AlgorithmClass.open = function () {
        openAlgorithmExplorer(this, invoker);
    };

    Loader.algorithmList.push(AlgorithmClass);

    setTimeout(function () {
        AlgorithmClass.prototype.main = AlgorithmClass.main;
    });
}