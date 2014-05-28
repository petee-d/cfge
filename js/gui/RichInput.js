// static class

var RichInput = {

    getOriginalGrammarRule: function () {
        return "never";
    },

    getId: function () {
        return "RichInput";
    },

    getTabId: function () {
        return "RichInput";
    },

    open: function () {
        $('#tab_' + this.getId()).find("#RI_container").html('').append(Current.grammar.toElement(true));
        Evaluator.update(Current.grammar);
    }

}


Grammar.prototype.renameSymbol = function (oldtext, newtext, type) {
    /// <summary>if exists and wouldn't be in conflict, rename the old symbol to new; return the new symbol on success, null on failure</summary>
    /// <param name="oldtext" type="String">text representation of the old symbol</param>
    /// <param name="newtext" type="String">text representation of the symbol with a new name</param>
    /// <param name="type" type="String">type to enforce /Terminal|Nonterminal/</param>
    /// <returns type="Symbol" />

    // no changes necessary?
    if (oldtext == newtext)
        return this._N[oldtext] || this._T[oldtext] || MyError(_("The old symbol doesn't exist in this grammar"));

    var old;
    // edit or remove?
    if (newtext != "" && // otherwise this is the expected way of deleting a symbol
      (this.isGoodNew(newtext, type) || UserError(_("The new symbol must be valid, of the same type and must not be already used"))) &&
      ((old = this['_' + type.charAt(0)][oldtext] || MyError(_("The old symbol doesn't exist in this grammar"))))) {

        old.rename(newtext);
        this.rehash();
        this.changed();
        return old;
    } else return null;
}

Grammar.prototype.removeSymbol = function (symbol) {
    /// <summary>remove the symbol from this grammar, if it exists, report success</summary>
    /// <param name="symbol" type="Symbol">the symbol to remove</param>
    /// <returns type="Boolean" />

    if ((this._N[symbol] && (this.getNonterminalCount() > 1 || UserError(_("The nonterminal alphabet must remain non-empty")))
                       && (!this._S.equals(this._N[symbol]) || UserError(_("You can't remove the starting nonterminal (rename it?)")))) ||
           (this._T[symbol] && (this.getTerminalCount() > 1 || UserError(_("The terminal alphabet must remain non-empty"))))) {

        delete this._N[symbol]; delete this._T[symbol]; // methods below will always do a rehash/announce a change
        this.removeRulesLeft(symbol);
        this.removeRulesContainingRight(symbol);
        return true;
    } else return false;
}

Grammar.prototype.isGoodNew = function (text, type) {
    /// <summary>find out if this symbol would be a valid addition to the grammar, enforcing the given type</summary>
    /// <param name="text" type="String">text representation of the symbol</param>
    /// <param name="type" type="String">type to enforce /Terminal|Nonterminal/</param>
    /// <returns type="Boolean" />

    return (typeof (type) == "string" && type.match(/Terminal|Nonterminal/) &&
        Symbol.check(text) && Symbol['is' + type](text) &&
        !this['_' + type.charAt(0)][text]);
}

Grammar.prototype.tryAddSymbol = function (text, type, noUpdate) {
    /// <summary>try to add a new symbol of given type to the grammar, return it or null on failure</summary>
    /// <param name="text" type="String">text representation of the symbol</param>
    /// <param name="type" type="String">type to enforce /Terminal|Nonterminal/</param>
    /// <param name="noUpdate" type="$Element">(optional) GUI container to exclude from html update</param>
    /// <returns type="Symbol" />

    var ret = text != "" &&
      (this.isGoodNew(text, type) || UserError(_("The new symbol must be valid, of the supposed type and must not be already used"))) ?
        this['_' + type.charAt(0)][text] = Symbol.create(text) : null;

    this.changed(noUpdate);
    return ret;
}

Grammar.prototype.tryEditSymbol = function (old, newtext, type) {
    /// <summary>try to modify the old symbol of given type to become newtext, return it or null on deletion</summary>
    /// <param name="old" type="Symbol">Symbol to be edited</param>
    /// <param name="newtext" type="String">text representation of the symbol after editing</param>
    /// <param name="type" type="String">type to enforce /Terminal|Nonterminal/</param>
    /// <returns type="Symbol" />

    return this.renameSymbol(old.toString(), newtext, type) || (newtext != "" ? old : false) ||
          (this.removeSymbol(old) ? null : old);
}

Grammar.prototype.tryAddRule = function (left, right, noUpdate) {
    /// <summary>try to add a rule with the given left/right sides to this grammar, return the rule or null on failure</summary>
    /// <param name="left" type="String">left side nonterminal text representation</param>
    /// <param name="right" type="String">right side word text representation</param>
    /// <param name="noUpdate" type="$Element">(optional) GUI container to exclude from html update</param>
    /// <returns type="Rule" />

    var ret, rights, leftWasNew;
    if (left != "" && right != "" && // expected way of cancelling
      ((left = this._N[left]) || UserError(_("The left side must be an existing nonterminal"))) &&
      ((right = Word.tryCreate(right, this)) || UserError(_("The right side must be a valid word over the alphabets"))) &&
      (!(rights = this._P[left] = this._P[left] || (leftWasNew = {}))[right] || UserError(_("The right side must not be already present"))))

        ret = rights[right] = new Rule(left, right);
    else
        ret = null;

    if (leftWasNew)
        this.rehash();
    this.changed(noUpdate);
    return ret;
}

Grammar.prototype.tryEditRuleRight = function (oldRule, newtext, noUpdate) {
    /// <summary>try to modify the old rule right side to become newtext, return the new rule or null on deletion</summary>
    /// <param name="oldRule" type="Rule">Rule with the right side to be edited</param>
    /// <param name="newtext" type="String">text representation of the right side after editing</param>
    /// <param name="noUpdate" type="$Element">(optional) GUI container to exclude from html update</param>
    /// <returns type="Rule" />

    var ret, rights = this._P[oldRule.getLeft()], right, del = false; T = oldRule;
    if (
      ((oldRule = (rights || {})[oldRule.getRight()]) || MyError(_("Old rule doesn't exist in this grammar"))) &&
      (newtext != "" || ((del = delete rights[oldRule.getRight()]), false)) && // the expected way of deleting a rule
      ((right = Word.tryCreate(newtext, this)) || UserError(_("The right side must be a valid word over the alphabets"))) &&
      (!rights[right] || (right.toString() == oldRule.getRight().toString() ? false : UserError(_("The right side must not be already present"))))) {

        delete rights[oldRule.getRight()];
        ret = rights[right] = new Rule(oldRule.getLeft(), right);
        this.rehash();
    } else ret = (del ? null : oldRule);

    if (!getPropertyCount(rights)) {
        this.rehash();
        this.changed();
    } else
        this.changed(noUpdate);
    return ret;
}

Grammar.prototype.removeRule = function (rule) {
    /// <summary>try to delete rule from this grammar</summary>
    /// <param name="rule" type="Rule">rule to delete</param>

    this.tryEditRuleRight(rule, "");
}

Grammar.prototype.tryEditAllRuleLeft = function (oldLeft, newtext) {
    /// <summary>try to find all rules with oldLeft as their left side and modify them to become newtext, return the left side or null on failure</summary>
    /// <param name="oldLeft" type="Nonterminal">old left sides</param>
    /// <param name="newtext" type="String">text representation of the left side (nonterminal) after editing</param>
    /// <returns type="Nonterminal" />

    var ret, rights, newLeft, that = this, del = false;
    if (
      ((oldLeft = this._N[oldLeft]) || MyError(_("Supplied left side is not an existing nonterminal"))) &&
      ((rights = this._P[oldLeft]) || MyError(_("There are no rules with the supplied left side"))) &&
      (newtext != "" || ((del = delete this._P[oldLeft]), false)) &&
      ((newLeft = this._N[newtext]) || UserError(_("The left side must be an existing valid nonterminal"))) &&
      (!this._P[newLeft] || (newtext == oldLeft.toString() ? false : (_("There already are rules with this left side (merging is not supported)"))))) {

        // recreate all rules with oldLeft
        delete this._P[oldLeft];
        that._P[newLeft] = rights;
        $.each(rights, function (_r, rule) {
            rights[rule.getRight()] = new Rule(newLeft, rule.getRight());
        });
        ret = newLeft;
        this.rehash();
    } else
        // remove all rules with oldLeft - already done
        ret = (del ? null : oldLeft);

    this.changed();
    return ret;
}

Grammar.prototype.tryAddRuleLeft = function (leftText, rightText) {
    /// <summary>try to add a rule with the left side new to rules in this grammar, return the rule or null on failure</summary>
    /// <param name="leftText" type="String">text representation of the left side nonterminal</param>
    /// <param name="rightText" type="String">text representation of the right side word</param>
    /// <returns type="Rule" />

    return !this._P[leftText] || UserError(_("The left side is already present in another group")) ?
        this.tryAddRule(leftText, rightText) : null;
}

Grammar.prototype.tryChangeStartingNonterminal = function (newText, noUpdate) {
    /// <summary>try to change the current starting nonterminal to become newtext, return it or the old symbol on failure</summary>
    /// <param name="newText" type="String">text representation of the new starting nonterminal</param>
    /// <param name="noUpdate" type="$Element">(optional) GUI container to exclude from html update</param>
    /// <returns type="Nonterminal" />

    var changed = false;
    var ret = this._S = (Symbol.check(newText) && (changed = this._N[newText]))
        || UserError(_("The symbol must be a valid existing nonterminal")) || this._S;
    if (changed) {
        this.rehash();
        this.changed();
    } else
        this.changed(noUpdate);
    return ret;
}

Grammar.prototype.drawInto = function (container, interactive) {
    /// <summary>fill the .grammar container with fresh grammar (GUI) html; return the container</summary>
    /// <param name="container" type="$Element">container element the contents of which will be replaced</param>
    /// <param name="interactive" type="Boolean">if true, the element will allow the user to make dynamic changes to this grammar (not the other way)</param>
    /// <returns type="$Element" />

    // main element
    var g = $('#grammar_template > .grammar').clone(), that = this,
        sepC = '<span class="syntax comma"> , </span>', sepP = '<span class="syntax pipe"> | </span>'
    addButton = '<div class="add"><span class="syntax"> + </span><input type="text" value="" /></div>';
    function inputStuff() {
        $(this).autoGrowInput({ comfortZone: 20, minWidth: 27, maxWidth: 200 }).keypress(
            function (event) { if (event.which == 13) $(this).focusout(); });
    }

    // nonterminals, terminals
    $.each({ 'Terminal': '_T', 'Nonterminal': '_N' }, function (type, property) {

        function makeSymbol(symbol) {
            return symbol.toElement().click(interactive ? function () {
                $(addButton).addClass('edited')
                    .find('input').val(symbol.toString()).each(inputStuff)
                    .focusout(function () {
                        var s, parent = $(this).parent();
                        if (s = that.tryEditSymbol(symbol, $(this).val(), type)) {
                            parent.replaceWith(makeSymbol(s));
                        } else
                            parent.add($(parent.prev('.comma:first')).add(parent.next('.comma:first')).get(0)).remove();
                    }).parent().replaceAll(this).find('input').keyup().focus();
            } : $.noop);
        }

        var list = g.find('.' + type.toLowerCase() + 's').append(
            $.map(that[property], makeSymbol)
        );
        list.children(':gt(0)').before(sepC);
        if (interactive)
            list.after($(addButton)
             .find('input').focus(function () {
                 $(this).parent().prev('.set_list').append(
                        $(addButton).addClass('edited')
                         .find('input').each(inputStuff)
                         .focusout(function () {
                             var symbol;
                             if (symbol = that.tryAddSymbol($(this).val(), type, container))
                                 $(this).parent().before(sepC).replaceWith(makeSymbol(symbol));
                             else
                                 $(this).parent().remove();
                         }).parent()
                    ).find('div.add.edited:first input').focus();
             }).parent());
    });

    // rules
    g.find('.rules').append(
        $.map(that._P, function (rights) {
            var r = $('#rule_template > .rule').clone(), left = getAnyProperty(rights).getLeft(), list = r.find('.set_list');

            function makeLeft(left) {
                return left.toElement().click(interactive ? function () {
                    $(addButton).addClass('edited')
                        .find('input').val(left.toString()).each(inputStuff)
                        .focusout(function () {
                            var l, parent = $(this).parent();
                            if (l = that.tryEditAllRuleLeft(left, $(this).val()))
                                parent.replaceWith(makeLeft(l));
                            else
                                parent.parents('.rule:first').remove();
                        }).parent().replaceAll(this).find('input').keyup().focus();
                } : $.noop);
            }
            r.find('> .set_mapping > .nonterminal').replaceWith(makeLeft(left));

            function makeRight(rule) {
                return rule.getRight().toElement().click(interactive ? function () {
                    $(addButton).addClass('edited')
                        .find('input').val(rule.getRight().toString()).each(inputStuff)
                        .focusout(function () {
                            var r, parent = $(this).parent();
                            if (r = that.tryEditRuleRight(rule, $(this).val(), container))
                                parent.replaceWith(makeRight(r));
                            else
                                parent.add($(parent.prev('.pipe:first')).add(parent.next('.pipe:first')).get(0)).remove();
                        }).parent().replaceAll(this).find('input').keyup().focus();
                } : $.noop);
            }

            list.append(
                $.map(rights, function (rule) {
                    return makeRight(rule);
                })
             ).children(':gt(0)').before(sepP);

            // add + to each left side group
            if (interactive)
                list.after($(addButton)
                 .find('input').focus(function () {
                     $(this).parent().prev('.set_list').append(
                            $(addButton).addClass('edited')
                             .find('input').each(inputStuff)
                             .focusout(function () {
                                 var rule;
                                 if (rule = that.tryAddRule(left, $(this).val(), container))
                                     $(this).parent().before(sepP).replaceWith(makeRight(rule));
                                 else
                                     $(this).parent().remove();
                             }).parent()
                        ).find('div.add.edited:first input').focus();
                 }).parent());
            return r;
        })
    );
    if (interactive)
        g.find('.rules').append($('<div class="rule_add">' + addButton + '</div>').find('.add input').focus(function () {
            var e = $('#rule_template > .rule').clone();
            e.find('> .set_mapping > .nonterminal').replaceWith(
                $(addButton).addClass('edited')
                    .find('input').each(inputStuff)
                    .focusout(function () {
                        var rule;
                        if (rule = that.tryAddRuleLeft($(this).val(), Word.epsStr))
                            $(this).parent().replaceWith(rule.getLeft().toElement());
                        else
                            $(this).parents('.rule:first').remove();
                    }).parent());
            e.find('.set_list').append((new Word([], that)).toElement());
            e.insertBefore($(this).parents('.rule_add:first')).find('.add.edited input').focus();
        }).parents('.rule_add:first'));

    // starting nonterminal
    function makeStarting() {
        return that._S.toElement().click(interactive ? function () {
            $(addButton).addClass('edited')
                .find('input').val(that._S.toString()).each(inputStuff)
                .focusout(function () {
                    var s, parent = $(this).parent();
                    that.tryChangeStartingNonterminal($(this).val(), container);
                    parent.replaceWith(makeStarting());
                }).parent().replaceAll(this).find('input').keyup().focus();
        } : $.noop);
    }

    g.find('.starting_nonterminal > .nonterminal').replaceWith(makeStarting());

    // visual components
    g.add(g.find('.set_box')).resize(function () {
        $('> div > .set_box_bracket', this).height($('> div > .set_box_content', this).height());
    });

    $(container).children().remove();
    return $(container).append(g.children());
}

Grammar.prototype.toElement = function (interactive) {
    /// <summary>create an optionally interactive HTML element representing the grammar</summary>
    /// <param name="interactive" type="Boolean">if true, the element will allow the user to make dynamic changes to this grammar and changes in the grammar will rewrite the element's contents</param>
    /// <returns type="$Element" />

    var g = this.drawInto($('<div class="grammar' + (interactive ? ' interactive' : '') + '"></div>'), interactive);

    if (interactive) // add this element to the output list if necessary
        this._GUIs.push(g);

    return g;
}