function drawSetBoxes() {
    /// <summary>Find all div.set_box-es and add bracket html code if necessary</summary>

    $('div.set_box').each(function () {
        if ($(this).children('set_box_container').length) return true;
        var bracket = '<div class="set_box_bracket' + ($(this).hasClass('tuple_box') ? ' tuple_bracket' : '') + '"><div><div>'
          + $.map([0, 1, 2, 3, 4], function (i) {
            return '<div class="sbb' + i + '"><span></span></div>';
          }).join('') + '</div></div></div>';
        // insert content container, make it the new parent
        $(this).append('<div class="set_box_container"><div class="set_box_content">')
            .children(':not(.set_box_container)').appendTo($('.set_box_content:first', this));
        // add brackets
        $('.set_box_container:first', this).prepend($(bracket).addClass('left')).append($(bracket).addClass('right'));
    });
}


var NotificationBar = {

    pop: function (message) {
        $('#notification_bar > div').text(message).parent().css('opacity', '0.5');
        this.open();
        $('#notification_bar').animate({ 'opacity': '1' }, 350);
    },

    open: function () {
        var e = $('#notification_bar');
        if (e.css('display') != 'none') return;
        var h = e.css({ 'position': 'absolute', 'top': '-4700px', 'visibility': 'hidden', 'display': 'block' }).height();
        e.css({ 'position': 'static', 'top': '', 'visibility': 'visible', 'display': 'none', 'height': h + 'px' })
            .slideDown(250, null, function () { $(this).css('height', ''); });
    },

    close: function () { 
        $('#notification_bar').slideUp(250);
    },

    init: function () {
        var that = this;
        $('#notification_bar').click(function () { that.close(); })
    }

}

var OriginalGrammar = {

    _isOpened: false,

    manage: function () {
        if ((Menu.getOriginalGrammarRule() == "never" && this._isOpened) ||
            (Menu.getOriginalGrammarRule() == "always" && !this._isOpened))
            this.toggle();
    },

    rewrite: function () {
        $('#original_grammar > div').html('').append(Current.grammar.toElement(false));
    },

    open: function () {
        if (Menu.getOriginalGrammarRule() == "never")
            return;
        this.rewrite();
        var change = !this._isOpened;
        this._isOpened = true;
        var e = $('#original_grammar');
        var h = e.css({ 'position': 'absolute', 'top': '-4700px', 'visibility': 'hidden', 'display': 'block', 'height': 'auto' }).height();
        e.css({ 'position': 'static', 'top': '', 'visibility': 'visible', 'display': change ? 'none' : 'block', 'height': h + 'px' })
         .slideDown(250, null, function () { $(this).css('height', ''); });
    },

    close: function () {
        if (Menu.getOriginalGrammarRule() == "always")
            return;
        this._isOpened = false;
        $('#original_grammar').slideUp(250);
    },

    update: function () {
        if (this._isOpened)
            this.open();
    },

    toggle: function () {
        if (this._isOpened)
            this.close();
        else
            this.open();
    },

    init: function () {
        var that = this;
        $('#button_original_grammar').click(function () {
            that.toggle();
        });
    }

}



var Evaluator = {
    
    _list: [],

    update: function(grammar) {
        $.each(this._list, function (i, e) {
            var c; switch (e.form.check(grammar)) {
                case true:  c = 'conforming-yes'; break;
                case false: c = 'conforming-no'; break;
                default:    c = 'conforming-unknown';
            }
            e.element.removeClass('conforming-yes conforming-no conforming-unknown').addClass(c);
        });
    },

    teach: function(form) {
        this._list.push({ form: form, element: null });
    },

    init: function () {
        $.each(this._list, function (i, e) {
            e.element = $('#menu_' + e.form.getId());
        });
        this.update(Current.grammar);
    }

}


var makeMath = function (mathText) {

    return mathText;
    // return "<div class='math'>" + mathText + "</div>";
}