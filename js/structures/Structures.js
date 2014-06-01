// abstract class Structure

function Structure() {
    // abstract
}
Structure.prototype.initStructure = function (id, name) {
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    this._id = id;
    this._name = name;
    this._highlight = Highlight.NONE;
    this._priority = 1;
}
Structure.prototype.id = function () {
    /// <returns type="String" />
    return this._id;
}
Structure.prototype.name = function (newName) {
    /// <signature>
    /// <summary>get the name of this structure</summary>
    /// <returns type="String" />
    /// </signature>
    /// <signature>
    /// <summary>set the name for this structure</summary>
    /// <param name="newName" type="String">this structure's new name</param>
    /// <returns type="Structure" />
    /// </signature>
    if (newName) {
        this._name = newName;
        return this;
    } else return this._name;
}
Structure.prototype.priority = function (newPriority) {
    /// <signature>
    /// <summary>get the priority of this structure</summary>
    /// <returns type="Number" />
    /// </signature>
    /// <signature>
    /// <summary>set the priority for this structure</summary>
    /// <param name="newPriority" type="Number">the lower, the higher is the structure displayed, grammar is 0</param>
    /// <returns type="Structure" />
    /// </signature>
    if (newPriority) {
        this._priority = newPriority || 0;
        return this;
    } else return this._priority;
}
Structure.prototype.toData = function () {
    /// <summary>get a stringifyable representation of this object</summary>
    return $.extend({
        id: this._id,
        name: this._name,
        type: this.getType(),
        highlight: this._highlight.value,
        priority: this._priority
    }, this.toConcreteData());
}
Structure.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>

    throw new Error('Not implemented');
}
Structure.prototype.toElement = function (interactive) {
    /// <summary>get HTML element displaying this structure</summary>
    /// <returns type="$Element" />

    var $structure;
    if (this.name() && !(this instanceof TableStructure)) {
        var $structure = $('#set_structure_template > .structure').clone();
        $structure.find('.set_box').remove();
        if (this.name()) $structure.find('.set_mapping').prepend(Structure.makeHeader(this.name()));
        else $structure.find('.set_mapping').remove();
        $structure.find('> div > div').append(this.toStructureInnerElement(interactive));
    } else {
        $structure = $('<div class="structure"></div>').append(this.toStructureInnerElement(interactive));
    }
    $structure.addClass(this.getType());
    return $structure;
}
Structure.prototype.finalize = function () {
    this.highlight(this.highlight().decay());
}
Structure.prototype.highlight = function (arg) {
    /// <summary>get (no arguments) or set the highlight</summary>
    /// <param name="arg" type="Highlight">the highlight to set</param>
    if (arg instanceof Highlight)
        this._highlight = Highlight.whichShouldStay(this._highlight, arg);
    return this._highlight;
}
Structure.fromData = function (data, grammar) {
    /// <summary>create an instance of the correct Structure subclass from data, using the given grammar</summary>
    /// <returns type="Structure" />
    var structure;
    if (window[data.type])
        structure = new window[data.type](data.id, data.name);
    else return MyError("bad Structure type");
    structure._highlight = Highlight.get(data.highlight);
    structure.priority(data.priority);
    structure.fillStructureData(data, grammar);
    return structure;
}
Structure.makeHeader = function (name) {
    if (!name) return $();
    return Symbol.check(name) ?
        Symbol.create(name).toElement().removeClass('terminal nonterminal').addClass('syntax') :
        '<span class="syntax">' + name + '</span>';
}



// abstract class SetStructure : Structure

function SetStructure() {
    // abstract
}
SetStructure.prototype = new Structure();
SetStructure.prototype.initSetStructure = function (id, name) {
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    this.initStructure(id, name);
    this._set = {};
    this._setFinalized = {};
}
SetStructure.prototype.getHashOfItem = function (object) {
    /// <returns type="String" />
    return object.toString();
}
SetStructure.prototype.add = function (object, immediately) {
    /// <summary>add object to this set, return boolean whether a change was made</summary>
    /// <param name="object" type="Object">object to add</param>
    /// <param name="immediately" type="Boolean">if set, this change will have immediate effect</param>
    /// <returns type="Boolean" />
    var hash = this.getHashOfItem(object), present = this._set[hash];
    this._setFinalized[hash] = object;
    if (immediately)
        this._set[hash] = object;
    return present ? false : true;
}
SetStructure.prototype.remove = function (object, immediately) {
    /// <summary>remove object from this set</summary>
    /// <param name="object" type="Object">object to remove</param>
    /// <param name="immediately" type="Boolean">if set, this change will have immediate effect</param>
    var hash = this.getHashOfItem(object), present = this._set[hash];
    delete this._setFinalized[hash];
    if (immediately)
        delete this._set[hash];
    return present ? true : false;
}
SetStructure.prototype.contains = function (object) {
    /// <summary>find out if object is contained in this set</summary>
    /// <param name="object" type="Object">object to find</param>
    return this._set[this.getHashOfItem(object)] || null;
}
SetStructure.prototype.length = function () {
    /// <summary>how many items are in this set?</summary>
    /// <returns type="Number" />
    return getPropertyCount(this._set);
}
SetStructure.prototype.toStructureInnerElement = function (brief) {
    /// <param name="brief" type="Boolean">if true, only the list of items will be output</param>
    /// <returns type="$Element" />
    var that = this, box = $('#set_structure_template .set_box').clone(), list = box.find('.set_list');
    $.each(this._setFinalized, function () { list.append(this.toElement()); })
    list.children(':gt(0)').before('<span class="syntax comma"> , </span>');
    return brief ? list : box;
}
SetStructure.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    var set = [], items = this._setFinalized;
    for (var _str in items)
        set.push(items[_str].toString());
    return { set: set };
}
SetStructure.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    var that = this;
    $.each(data.set, function (i,str) {
        that.add(that.createSetItemFromText(str, grammar), true);
    });
}
SetStructure.prototype.forEachItem = function (callback) {
    /// <summary>evaluate callback for each item in this set</summary>
    /// <param name="callback" type="Function">function(Object item)</param>
    /// <returns type="SetStructure" />

    $.each(this._set, function (_i, i) {
        return callback.call(i, i);
    });

    return this;
}
SetStructure.prototype.getAnyItem = function () {
    /// <summary>return any of the items in this set, or null</summary>
    /// <returns type="Object" />
    var anyItem = null;
    this.forEachItem(function (item) { anyItem = item; return false; });
    return anyItem;
}
SetStructure.prototype.finalize = function () {
    this._set = $.extend({}, this._setFinalized);
    this.highlight(this.highlight().decay());
    return this;
}



// class SymbolSet : SetStructure : Structure

function SymbolSet(id, name) {
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    this.initSetStructure(id, name);
}
SymbolSet.prototype = new SetStructure();
SymbolSet.prototype.getType = function () {
    return "SymbolSet";
}
SymbolSet.prototype.createSetItemFromText = function (text, grammar) {
    /// <param name="grammar" type="Grammar">the grammar used to parse symbols</param>
    return grammar.tryGetSymbol(text) || (text.match(Word.epsRE) && new Word(Word.epsStr, grammar)) ||
        MyError("createSetItemFromText - no such symbol");
}



// class TableStructure : Structure

function TableStructure(id, name, ElementType, rows, columns) {
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    /// <param name="ElementType" type="Object">the structure created at each cell</param>
    /// <param name="rows" type="Object">mapping of row ids to names</param>
    /// <param name="columns" type="Object">mapping of column ids to names</param>
    this.initStructure(id, name);
    if (ElementType && rows && columns) {
        this._rows = rows;
        this._columns = columns;
        this._cellType = ElementType.prototype.getType();
        this._table = {};
        for (var rowId in rows) {
            this._table[rowId] = {};
            for (var colId in columns)
                this._table[rowId][colId] = new ElementType(rowId + " " + colId);
        }
    }
}
TableStructure.prototype = new Structure();
TableStructure.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    var data = {};
    for(var rowId in this._table) {
        var row = this._table[rowId], rCopy = data[rowId] = {};
        for(var colId in row)
            rCopy[colId] = row[colId].toData();
    }
    return {
        rows: $.extend({}, this._rows), columns: $.extend({}, this._columns), table: data
    };
}
TableStructure.prototype.toStructureInnerElement = function (interactive) {
    /// <param name="itemParameter" type="Object">will be passed to the toStructureInnerElement method of each displayed item as the second parameter</param>
    /// <returns type="$Element" />
    var that = this;
    return $('<table class="table_structure">').append( // header row
            $('<tr>').append([$('<th>').html(that._name ? Structure.makeHeader(that.name()) : '')].concat(
                $.map(that._columns, function (colname) {
                    return $('<th>').append(Structure.makeHeader(colname));
                })
            ))
        ).append( // data rows (each with a header)
            $.map(that._rows, function (rowname, rowId) {
                return $('<tr>').append(
                    [$('<th>').append(Structure.makeHeader(rowname))].concat(
                        $.map(that._columns, function (colname, colId) {
                            var cell = that._table[rowId][colId];
                            return $('<td>').append(cell.toStructureInnerElement(true, interactive))
                                   .addClass((cell.extraClass && cell.extraClass()) || null);
                        }))   
                );
            })
        );
}
TableStructure.prototype.fillStructureData = function (data, grammar) {
    /// <param name="data" type="Object">data for this object</param>
    /// <param name="grammar" type="Grammar">grammar associated with the data</param>
    var that = this;
    this._rows = $.extend({}, data.rows);
    this._columns = $.extend({}, data.columns);
    this._table = {};
    $.each(data.table, function (rowId, row) {
        that._table[rowId] = {};
        $.each(row, function (colId, cellData) {
            that._table[rowId][colId] = Structure.fromData(cellData, grammar);
        });
    });
}
TableStructure.prototype.addRow = function (rowId, rowName) {
    /// <param name="rowId" type="String">id of the new row</param>
    /// <param name="rowName" type="String">name of the new row</param>
    if (this._rows[rowId]) return this;
    var type = this._cellType;
    this._rows[rowId] = rowName;
    var row = this._table[rowId] = {};
    $.each(this._columns, function (colId) {
        row[colId] = Structure.fromData(
            { id: rowId + ' ' + colId, name: false, type: type, set: [] }
            );
    });
    return this;
}
TableStructure.prototype.removeRow = function (rowId) {
    /// <param name="rowId" type="String">id of the row to remove</param>
    delete this._rows[rowId];
    delete this._table[rowId];
    return this;
}
TableStructure.prototype.addColumn = function (colId, colName) {
    /// <param name="colId" type="String">id of the new column</param>
    /// <param name="colName" type="String">name of the new column</param>
    if (this._columns[colId]) return this;
    var type = this._cellType, table = this._table;
    this._columns[colId] = colName;
    $.each(this._rows, function (rowId) {
        table[rowId][colId] = Structure.fromData(
            { id: rowId + ' ' + colId, name: false, type: type, set: [] }
            );
    });
    return this;
}
TableStructure.prototype.get = function (rowId, columnId) {
    /// <returns type="Structure" />
    return (this._table[rowId] || {})[columnId] || null;
}
TableStructure.prototype.forEachCell = function (callback) {
    /// <summary>evaluate callback for each cell in this table</summary>
    /// <param name="callback" type="Function">function(Object cell)</param>
    /// <returns type="TableStructure" />

    var cont;
    $.each(this._table, function (rowID, row) {
        $.each(row, function (colID, cell) {
            return cont = callback.call(cell, cell);
        })
        return cont;
    });

    return this;
}
TableStructure.prototype.forEachCellInRow = function (rowId, callback) {
    /// <summary>evaluate callback for each cell in the chosen row of this table</summary>
    /// <param name="callback" type="Function">function(String colId, Object cell)</param>
    /// <returns type="TableStructure" />

    $.each(this._table[rowId], function (key, val) {
        return callback.call(val, key, val);
    });

    return this;
}
TableStructure.prototype.getType = function () {
    return "TableStructure";
}
TableStructure.prototype.finalize = function () {
    this.highlight(this.highlight().decay());
    for (var r in this._table) {
        r = this._table[r];
        for (var c in r)
            r[c].finalize();
    }
    return this;
}



// class ConstantSymbolMappingStructure : Structure

function ConstantSymbolMappingStructure(id, name, list) {
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    /// <param name="list" type="Array">array of {from: aSymbol, to: aSymbol}</param>
    this.initStructure(id, name);
    this._list = list;
}
ConstantSymbolMappingStructure.prototype = new Structure();
ConstantSymbolMappingStructure.prototype.toConcreteData = function () {
    /// <summary>get a stringifyable representation of this structure's data (finalized)</summary>
    return {
        list: $.map(this._list, function (e) {
            return { from: e.from.toString(), to: e.to.toString() };
        })
    };
}
ConstantSymbolMappingStructure.prototype.toStructureInnerElement = function () {
    /// <returns type="$Element" />
    var that = this, $setMap = $('<div class="set_map"></div>');
    $.each(this._list, function(i, e) {
        $setMap.append($('<div></div>')
            .append($('<span class="set_mapping"> <span class="syntax">→</span></span>')
                .prepend(e.from.toElement()))
            .append($('<div></div>')
                .append(e.to.toElement()))
            );
    });
    return $setMap;
}
ConstantSymbolMappingStructure.prototype.fillStructureData = function (data) {
    /// <param name="data" type="Object">data for this object</param>
    var that = this;
    that._list = [];
    $.each(data.list, function (i, e) {
        that._list.push({
            from: Symbol.create(e.from),
            to: Symbol.create(e.to)
        });
    });
}
ConstantSymbolMappingStructure.prototype.getType = function () {
    return "ConstantSymbolMappingStructure";
}







// class Structures

function Structures(data, grammar) {
    /// <summary>create a new Structures object, if text representation and grammar is supplied, it is reconstructed from it</summary>
    /// <param name="grammar" type="Grammar">grammar used to parse the data (if data is specified)</param>
    var l = this._list = {}, that = this;

    if (data && data instanceof Array) {
        $.each(data, function () {
            var x = Structure.fromData(this, grammar);
            l[x.id()] = x;
        })
    }
}
Structures.prototype.remove = function (id) {
    /// <summary>remove the structure with given id</summary>
    /// <param name="id" type="String">id of the structure to remove</param>
    delete this._list[id];
}
Structures.prototype.toData = function () {
    /// <summary>get a stringifyable representation of all the structures in this object</summary>
    return $.map(this._list, function (e) {
        return e.toData();
    });
}
Structures.prototype.plot = function (grammar) {
    /// <summary>get a HTML representation of all the structures plus the grammar, ordered by priority</summary>
    /// <returns type="$Element" />
    var list = $.map(this._list, function (e) {
        return {
            priority: e.priority(),
            $element: e.toElement()
        };
    });
    list.push({
        priority: 0,
        $element: grammar.toElement()
    });
    return $('<span class="structures"></div>').append(
            list.sort(function (a, b) { return a.priority - b.priority; })
            .map(function (o) { return o.$element; })
        );
}
Structures.prototype.finalize = function () {
    $.each(this._list, function (i, structure) {
        structure.finalize();
    });
    return this;
}
/*
    the following is pretty much boiler plate code only
    it was done only to help MS Visual Studio determine the types of objects, for better Intellisense
 */
Structures.prototype.newSymbolSet = function (id, name) {
    /// <summary>add a new Set of symbols, with given id (internal) and name (user)</summary>
    /// <param name="id" type="String">internal identificator</param>
    /// <param name="name" type="String">name displayed to user, should look like a symbol</param>
    /// <returns type="SymbolSet" />
    return this._list[id] = new SymbolSet(id, name);
}
Structures.prototype.getSymbolSet = function (id) {
    /// <summary>retrieve stored symbol set with given id</summary>
    /// <param name="id" type="String">id of the symbol set</param>
    /// <returns type="SymbolSet" />
    return this._list[id] || null;
}
Structures.prototype.newParserStack = function (id, name) {
    /// <summary>add a new parser stack, with given id (internal) and name (user)</summary>
    /// <param name="id" type="String">internal identificator</param>
    /// <param name="name" type="String">name displayed to user, should look like a symbol</param>
    /// <returns type="ParserStack" />
    return this._list[id] = new ParserStack(id, name);
}
Structures.prototype.getParserStack = function (id) {
    /// <summary>retrieve stored parser stack with given id</summary>
    /// <param name="id" type="String">id of the parser stack</param>
    /// <returns type="ParserStack" />
    return this._list[id] || null;
}
Structures.prototype.adoptParserInput = function (id) {
    /// <summary>get the currently saved parser input and maintain it by this object under the given id</summary>
    /// <param name="id" type="String">internal id of this structure</param>
    /// <returns type="TableStructure" />
    var input = Current.parserInput || MyError('there is no stored parser input!');
    input._id = id;
    return this._list[id] = input;
}
Structures.prototype.getParserInput = function (id) {
    /// <summary>retrieve stored parser stack with given id</summary>
    /// <param name="id" type="String">id of the parser stack</param>
    /// <returns type="ParserInput" />
    return this._list[id] || null;
}
Structures.prototype.newTableStructure = function (id, name, ElementType, rows, columns) {
    /// <summary>add a table structure, with given id (internal) and name (user)</summary>
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    /// <param name="ElementType" type="Object">the structure created at each cell</param>
    /// <param name="rows" type="Object">mapping of row ids to names</param>
    /// <param name="columns" type="Object">mapping of column ids to names</param>
    /// <returns type="SymbolSet" />

    return this._list[id] = new TableStructure(id, name, ElementType, rows, columns);
}
Structures.prototype.getTableStructure = function (id) {
    /// <summary>retrieve stored table structure with given id</summary>
    /// <param name="id" type="String">id of the table structure</param>
    /// <returns type="TableStructure" />
    return this._list[id] || null;
}
Structures.prototype.adoptCurrentLRParserTable = function (id) {
    /// <summary>get the current saved LR parser table and maintain it by this object under the given id</summary>
    /// <param name="id" type="String">internal id of this structure</param>
    /// <returns type="TableStructure" />
    var table = Current.lrTable || MyError('there is no stored LR table!');
    table._id = id;
    return this._list[id] = table;
}
Structures.prototype.adoptCurrentLLParserTable = function (id) {
    /// <summary>get the current saved LL parser table and maintain it by this object under the given id</summary>
    /// <param name="id" type="String">internal id of this structure</param>
    /// <returns type="TableStructure" />
    var table = Current.llTable || MyError('there is no stored LL table!');
    table._id = id;
    return this._list[id] = table;
}
Structures.prototype.newConstantSymbolMappingStructure = function (id, name, list) {
    /// <summary>add a symbol mapping, with given id (internal), name (user) and a list of mapped symbols</summary>
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    /// <param name="list" type="Array">array of {from: aSymbol, to: aSymbol}</param>
    /// <returns type="ConstantSymbolMappingStructure" />

    return this._list[id] = new ConstantSymbolMappingStructure(id, name, list);
}
Structures.prototype.getConstantSymbolMappingStructure = function (id) {
    /// <summary>retrieve stored symbol mapping with given id</summary>
    /// <param name="id" type="String">id of the symbol mapping</param>
    /// <returns type="ConstantSymbolMappingStructure" />
    return this._list[id] || null;
}
Structures.prototype.newLRAutomaton = function (id, name) {
    /// <summary>add a LR automaton structure</summary>
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    /// <returns type="LRAutomaton" />

    return this._list[id] = new LRAutomaton(id, name);
}
Structures.prototype.getLRAutomaton = function (id) {
    /// <summary>retrieve stored LR automaton with given id</summary>
    /// <param name="id" type="String">id of the LR automaton</param>
    /// <returns type="LRAutomaton" />
    return this._list[id] || null;
}
Structures.prototype.newParserOutput = function (id, name) {
    /// <summary>add a parser output structure</summary>
    /// <param name="id" type="String">internal id of this structure</param>
    /// <param name="name" type="String">name of this structure displayed to user</param>
    /// <returns type="ParserOutput" />

    return this._list[id] = new ParserOutput(id, name);
}
Structures.prototype.getParserOutput = function (id) {
    /// <summary>retrieve stored LR automaton with given id</summary>
    /// <param name="id" type="String">id of the LR automaton</param>
    /// <returns type="ParserOutput" />
    return this._list[id] || null;
}

