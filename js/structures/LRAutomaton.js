// class LRAutomaton : Structure

function LRAutomaton(id, name) {
    /// <summary>constructor of an LR state, will be created with empty set of core and noncore items</summary>
    /// <param name="id" type="String">id for manipulation</param>
    /// <param name="name" type="String">name of this state, displayed to the user</param>
    this.initStructure(id, name);
    this._statesByID = {};
    this._stateIDsByHash = {};
    this._transitions = {}; // {from: {to: {symbol1_str: symbol1, ..}, ..}, ..}
}
LRAutomaton.prototype = new Structure();
LRAutomaton.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    var states = {}, transitions = {};
    for (var id in this._statesByID)
        states[id] = this._statesByID[id].toData();
    for (var from in this._transitions) {
        var F = transitions[from] = {};
        for (var to in this._transitions[from]) {
            var T = F[to] = [];
            for (var symbol in this._transitions[from][to])
                T.push(symbol);
        }
    }

    return { states: states, transitions: transitions };
}
LRAutomaton.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    for (var id in data.states) {
        var state = Structure.fromData(data.states[id], grammar);
        this._statesByID[id] = state;
        this._stateIDsByHash[state.getCoreHash()] = id;
    }
    for (var from in data.transitions) {
        var F = this._transitions[from] = {};
        for (var to in data.transitions[from]) {
            var T = F[to] = {}, symbols = data.transitions[from][to];
            for (var i = 0; i < symbols.length; i++)
                T[symbols[i]] = grammar.tryGetSymbol(symbols[i]);
        }
    }
}
LRAutomaton.prototype.addState = function (state) {
    /// <summary>try to add a state to the automaton, signal if it already exists and return its id</summary>
    /// <param name="state" type="LRState">state to add</param>
    /// <returns type="{isNew: Boolean, id: String}">.isNew is true if the state was new, .id always contains the id</returns>
    var stateHash = state.getCoreHash(), id = this._stateIDsByHash[stateHash];
    if (id)
        return { isNew: false, id: id };
    else {
        id = getPropertyCount(this._statesByID) + "";
        this._statesByID[id] = state;
        this._stateIDsByHash[stateHash] = id;
        state.name(id);
        return { isNew: true, id: id };
    }
}
LRAutomaton.prototype.addStateTransition = function (fromState, symbol, toState) {
    /// <summary>make sure toState exists in this automaton and add a transition  fromState -> toState  them on the given symbol</summary>
    /// <param name="fromState" type="LRState">state this transition begins from, should exist</param>
    /// <param name="symbol" type="Symbol">the symbol this transition is done upon</param>
    /// <param name="toState" type="LRState">state the automaton is after the transition, can also be new</param>
    /// <returns type="{fromStateId: String, toStateId: String, isNew: Boolean}">isNew - was toState new?</returns>

    // prepare/create the states
    var fromObj = this.addState(fromState), toObj = this.addState(toState);
    if (fromObj.isNew) return MyError("fromState did not exist!");
    // add the edge (map of depth 3)
    var t = this._transitions[fromObj.id] = this._transitions[fromObj.id] || {};
    (t[toObj.id] = t[toObj.id] || {})[symbol] = symbol;
    // was toState new?
    return { fromStateId: fromObj.id, toStateId: toObj.id, isNew: toObj.isNew };
}
LRAutomaton.prototype.containsState = function (state) {
    /// <summary>find out if state is present in automaton, if yes, return it</summary>
    /// <param name="state" type="LRState">state to look up</param>
    /// <returns type="LRState" />
    var id = this._stateIDsByHash[state.getCoreHash()];
    return id ? this._statesByID[id] : null;
}
LRAutomaton.prototype.getStateID = function (state) {
    /// <summary>find out if state is present in automaton, if yes, return its id</summary>
    /// <param name="state" type="LRState">state to look up</param>
    /// <returns type="String" />
    var id = this._stateIDsByHash[state.getCoreHash()];
    return id || null;
}
LRAutomaton.prototype.getState = function (id) {
    /// <summary>get a state from this automaton by its ID, null if it doesn't exist</summary>
    /// <param name="id" type="String">id of the state</param>
    /// <returns type="LRState" />
    return this._statesByID[id] || null;
}
LRAutomaton.prototype.mergeStates = function (mainState, otherState) {
    /// <summary>merge state `otherState` into `mainState`</summary>
    /// <param name="mainState" type="LRState">the main state (will be preserved)</param>
    /// <param name="otherState" type="LRState">the state to merge into the other one (will be destroyed)</param>

    var oldMainStateHash = mainState.getCoreHash(), mainStateID = this._stateIDsByHash[oldMainStateHash],
        otherStateHash = otherState.getCoreHash(), otherStateID = this._stateIDsByHash[otherStateHash];
    if (mainStateID == otherStateID) return;

    // add core and noncore items form otherState to mainState
    otherState.coreSet.forEachItem(function(item){
        mainState.coreSet.add(item); 
    });
    otherState.nonCoreSet.forEachItem(function (item) {
        mainState.nonCoreSet.add(item);
    });

    // redirect edges
    var edges = this._transitions;
    for (var from in edges)
        for (var to in edges[from]) {
            if (to == otherStateID) {
                edges[from][mainStateID] = edges[from][otherStateID];
                delete edges[from][otherStateID];
                to = mainStateID;
            }
            if (from == otherStateID) {
                edges[mainStateID][to] = edges[otherStateID][to];
                delete edges[otherStateID][to];
            }
        }

    // remove otherState
    delete this._statesByID[otherStateID];
    delete this._stateIDsByHash[otherStateHash];

    // rehash mainState (was modified)
    delete this._stateIDsByHash[oldMainStateHash];
    this._stateIDsByHash[mainState.getCoreHash()] = mainStateID;
}
LRAutomaton.prototype.forEachState = function (callback) {
    /// <summary>evaluate callback for each state of this automaton</summary>
    /// <param name="callback" type="Function">function(LRState state)</param>
    /// <returns type="LRAutomaton" />

    $.each(this._statesByID, function (_id, state) {
        return callback.call(state, state);
    });

    return this;
}
LRAutomaton.prototype.toDagreGraph = function (id) {
    /// <summary>return a dagre-d3 graph object of this automaton</summary>
    /// <returns type="jQuery.fn" />
    var g = new dagreD3.Digraph();
    for(var id in this._statesByID)
        g.addNode(id, { label: this._statesByID[id].toElement().outerHTML() });
    for(var from in this._transitions)
        for (var to in this._transitions[from]) {
            var symbols = this._transitions[from][to];
            g.addEdge(null, from, to, {
                label: $.map(symbols, function (e) {
                    return e.toElement().outerHTML();
                }).join(', ') || '?'
            });
        }

    var svg = $('<svg class="lr-automaton-graph"><g transform="translate(10,10)"></g></svg>').appendTo('#scratchpad'),
        render = new dagreD3.Renderer();
    layout = dagreD3.layout().nodeSep(20).rankDir(Current.Automaton.direction),
    res = render.edgeTension(1.05).layout(layout)
        .run(g, d3.select('#scratchpad svg g'));
    svg.css({ height: res.graph().height + 20, width: res.graph().width + 20 }).detach();
    return svg;

    return $('<div class="LRAutomaton">' + this.toGraph().toString() + '</div>');
    return $('<div class="LRAutomaton">' + $.map(this._statesByID, function (state, id) {
        return id + ': ' + state.toUserString();
    }).join('<br />') + '</div>');
}
LRAutomaton.prototype.toGraphvizGraph = function (id) {
    /// <summary>return a graphviz representation of this automaton</summary>
    /// <returns type="$Element" />

    /** BEWARE: some really dark stuff going on in here **/

    var nodeElements = {}, edgeElements = {},
        nodeDots = [], edgeDots = [],
        that = this,
        distRatio = 1 / 96 / 0.7555 /* I don't know what this is, but it works, sue me */,
        sepC = '<span class="syntax comma"> , </span>';
    var $scratchpad = $('<div class="lr-automaton-graph"></div>').appendTo('#scratchpad');

    for (var id in this._statesByID) {
        var $content = $('<div class="graphviz-node"></div>')
                .append(this._statesByID[id].toElement()).appendTo($scratchpad),
            o = { $content: $content, width: $content.width() * 1.025, height: $content.height() * 1.025 };

        nodeDots.push(
            '  "' + id + '" [shape=box, style=rounded, '
                     + 'width=' +  o.width  * distRatio + ', '
                     + 'height=' + o.height * distRatio + '];'
        );
        nodeElements[id] = o;
        $content.detach();
    }

    for (var from in this._transitions)
        for (var to in this._transitions[from]) {
            var symbols = this._transitions[from][to],
                $content = $('<div class="edgeLabel graphviz-edge"></div>').append(
                    $('<div></div>').append(
                        $.map(symbols, function (e) { return e.toElement(); })
                    )
                ).appendTo($scratchpad);
            $content.find('lr-edge > *:gt(0)').before(sepC);
            var o = { $content: $content, width: $content.width(), height: $content.height() };

            edgeDots.push(
                '  "' + from + '" -> "' + to + '" '
                    + '[label="' + new Array(Math.ceil(o.width / 7) + 1).join('.') + '",'
                        + ' fontsize=' + o.height * 0.86 + ', penwidth=2];'
            );
            edgeElements[from + '->' + to] = o;
            $content.detach();
        }

    $scratchpad.detach();

    var dot = DOT = ''
        + 'digraph { \n'
        + '  rankdir = "' + Current.Automaton.direction + '" \n'
        + '  dpi = 64 \n'
        //+ '  width = ' + $('#viewport').width() * this.distRatio + ' \n'
        + nodeDots.join('\n') + '\n'
        + '  \n'
        + edgeDots.join('\n') + '\n'
        + '}';
    var $svg = $(Viz(dot, 'svg'));

    function makeSVG(tag, attrs, child) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs)
            el.setAttribute(k, attrs[k]);
        if (child)
            el.appendChild(child);
        return el;
    }

    $svg.find('> g > title, > g > polygon').remove();

    $svg.find('.node').each(function () {
        var o = nodeElements[$(this).find('title').text()],
            attr = {
                x: $(this).find('polyline:eq(1)').attr('points').match(/^([-.e\d]+),/)[1],
                y: $(this).find('polyline:eq(0)').attr('points').match(/,([-.e\d]+) /)[1],
                width: o.width, height: o.height
            };
        $(this).empty();
        this.appendChild(makeSVG('rect', $.extend(attr, { rx: 10, ry: 10 })));
        this.appendChild(makeSVG('foreignObject', attr, o.$content.get(0)));
    });

    $svg.find('.edge').each(function () {
        var o = edgeElements[$(this).find('title').text()],
            attr = {
                x: $(this).find('text').attr('x') - o.width * 0.6,
                y: $(this).find('text').attr('y') - o.height * 0.8,
                width: o.width + 1, height: o.height
            }; XXX = o;
        $(this).find('text').remove();
        this.appendChild(makeSVG('rect', $.extend(attr, { rx: 6, ry: 6 })));
        this.appendChild(makeSVG('foreignObject', attr, o.$content.get(0)));
    });

    return $('<div></div>').addClass('lr-automaton-graph').append($svg);
}
LRAutomaton.prototype.toStructureInnerElement = function () {
    /// <returns type="$Element" />

    switch (Current.Automaton.method) {
        case 'graphviz':    return this.toGraphvizGraph();
        case 'dagre':       return this.toDagreGraph();
        default:            return $();
    }
}
LRAutomaton.prototype.finalize = function () {
    for (var id in this._statesByID)
        this._statesByID[id].finalize();
}
LRAutomaton.prototype.getType = function () {
    return "LRAutomaton";
}