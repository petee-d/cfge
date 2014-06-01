// static class

var TextInput = {

    getOriginalGrammarRule: function () {
        return "optional";
    },

    getId: function () {
        return "TextInput";
    },

    getTabId: function () {
        return "TextInput";
    },

    open: function () {
        var ta = $('#TI_textarea').val((function () {
            switch (Current.TextInput.method) {
                case 0: return Current.grammar.toUserFriendlyString();
                case 1: return Current.grammar.toCFGCString();
                case 2: return Current.grammar.toString();
                case 3: return location.href.split('#')[0] + '#g~' + LZString.compressToBase64(Current.grammar.toString()) + '~g';
            }
        })());

        $('#TI_save').off('click').click(function () {
            var o;
            switch(Current.TextInput.method){
                case 0: o = Grammar.convertUserFriendly(ta.val()); break;
                case 1: o = Grammar.convertCFGC(ta.val()); break;
                case 2: try {
                            o = JSON.parse(ta.val());
                        } catch (e) { o = UserError(_("This is not valid JSON!") + " (" + e + ")"); } break;
            }
            if (o) {
                (Current.grammar = Grammar.tryCreate(o) || Current.grammar).changed();
                OriginalGrammar.update();
                Evaluator.update(Current.grammar);
            }
        });
        $('#TI_friendly, #TI_CFGC, #TI_JSON, #TI_link')
        .off('click').click(function () {
            Current.TextInput.method = $(this).index();
            TextInput.open();
        })
        .removeClass('active').eq(Current.TextInput.method).addClass('active');
        Evaluator.update(Current.grammar);
    },

    addExample: function (name, desc, data) {
        var li = $('#TI_examples li.template').clone().removeClass('template');
        li.find('a').text(name).click(function () {
            Current.grammar = new Grammar(data);
            TextInput.open();
            return false;
        });
        li.find('span').text(desc);
        $('#TI_examples').append(li);
        return TextInput;
    }

}

Grammar.prototype.toUserFriendlyString = function () {
    /// <summary>return the user friendly string representation of this grammar</summary>
    /// <returns type="String" />

    return ''
      + 'N = ' + $.map(this._N, function (n) { return n.toString(); }).join(', ') + '.\n'
      + 'T = ' + $.map(this._T, function (t) { return t.toString(); }).join(', ') + '.\n'
      + 'P = ' + $.map(this._P, function (rights) {
          return getAnyProperty(rights).getLeft().toString() + ' -> ' +
              $.map(rights, function (r) { return r.getRight().toString(); }).join(' | ');
      }).join(',\n    ') + '.\n'
      + 'S = ' + this._S.toString() + ".";
}

Grammar.convertUserFriendly = function (str) {
    /// <summary>convert a user friendly string representation of a grammar to a data object, or return null on failure</summary>
    /// <param name="str" type="String">user friendly string representation of a grammar</param>
    /// <returns type="Object" />

    str = str.replace(/[ \n\t]+/g, " ");

    var o = { N: [], T: [], P: {}, S: null }, n, t, p, s, rx, l;
    if (!(n = str.match(/N ?= ?((?:[^,\.]+ ?, ?)*(?:[^,\.]+ ?))\./i))
        || !(n = n[1].match(/[^, ]+/g)))
        return UserError(_("Nonterminal list is missing or has incorrect syntax"));
    if (!(t = str.match(/T ?= ?((?:[^,\.]+ ?, ?)*(?:[^,\.]+ ?))\./i))
        || !(t = t[1].match(/[^, ]+/g)))
        return UserError(_("Terminal list is missing or has incorrect syntax"));
    if (!(p = str.match(/P ?= ?((?:[^,\.]+ ?, ?)*(?:[^,\.]+ ?))\./i))
        || !(p = p[1].match(/[^,]+/g)))
        return UserError(_("Rule list is missing or has incorrect syntax"));
    if (!(s = str.match(/S ?= ?([^,\.]+) ?\./i)))
        return UserError(_("Starting nonterminal declaration is missing or has incorrect syntax"));

    for (var i = 0; i < n.length; i++)
        o.N.push(n[i]);
    for (var i = 0; i < t.length; i++)
        o.T.push(t[i]);
    for (var i = 0; i < p.length; i++) {
        if (!(rx = p[i].match(/([^>,\. ]+) ?-> ?((?:[^\|]+ ?\| ?)*(?:[^\|]+ ?))/i))
            || !(l = o.P[rx[1]] = [])
            || !(rx = rx[2].match(/[^|]+/g)))
            return UserError(_("One of the rules has incorrect syntax") + ': "' + p[i] + '"');
        for (var j = 0; j < rx.length; j++)
            l.push(rx[j]);
    }
    o.S = s[1];

    return o;
}

Grammar.prototype.toCFGCString = function () {
    /// <summary>return the user friendly string representation of this grammar</summary>
    /// <returns type="String" />

    return $.map(this._P, function (rights) {
          return getAnyProperty(rights).getLeft().toString() + ' -> ' +
              $.map(rights, function (r) { return r.getRight().length() == 0 ? '' : r.getRight().toString(); }).join(' | ');
      }).join('.\n') + '.';
}

Grammar.convertCFGC = function (str) {
    /// <summary>convert a context free grammar checker tool (ucalgary.ca) representation of a grammar to a data object, or return null on failure</summary>
    /// <param name="str" type="String">user friendly string representation of a grammar</param>
    /// <returns type="Object" />

    str = str.replace(/[ \n\t]+/g, " ");

    var o = { N: [], T: [], P: {}, S: null }, N = {}, T = {}, P = {};

    if(!str.match(/^(?:[^\.>→]+(?:->|→)[^\.>→]+\.)+ *$/))
        return UserError(_("Rule list is missing or has incorrect syntax"));
    var rulegroups = str.match(/[^\.>→]+(?:->|→)[^\.>→]+\./g);
    for (var i = 0; i < rulegroups.length; i++) {
        var rulegroup = rulegroups[i], m = rulegroup.match(/^([^\.>→]+)(?:->|→)([^\.>→]+)\.$/), left, rights;
        if (!(left = m[1].match(new RegExp("^ ?(" + Symbol.strRE + ") ?$"))) ||
            !(Symbol.isNonterminal(left[1])))
            return UserError(_("Rule left side must be a nonterminal symbol") + ": " + m[1]);
        left = new Nonterminal(left[1]);
        if (i == 0) o.S = left + "";
        N[left] = true;
        rights = m[2].split("|");
        var group = (P[left] = P[left] || {});
        for (var j = 0; j < rights.length; j++) {
            var right = Word.tryCreate(rights[j].match(/^ *$/) ? Word.epsStr : rights[j]);
            if (!right) return UserError(_("This is not a valid word") + ": " + rights[j]);
            right.forEachSymbol(function (s) {
                if (s.isNonterminal()) N[s] = true;
                else T[s] = true;
            });
            group[right] = true;
        }
    }

    for(var n in N) o.N.push(n);
    for(var t in T) o.T.push(t);
    for (var l in P) {
        var rg = o.P[l] = [];
        for (var r in P[l]) rg.push(r);
    }

    return o;
}