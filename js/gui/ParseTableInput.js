// static class

var ParseTableInput = {

    getOriginalGrammarRule: function () {
        return "optional";
    },

    getId: function () {
        return "ParseTableInput";
    },

    getTabId: function () {
        return "ParseTableInput";
    },

    open: function () {

        if (Current.lrTable)
            $('#tab_' + this.getId()).find("#PTI_container").html('').append(Current.lrTable.toElement(true));
        else if(Current.llTable)
            $('#tab_' + this.getId()).find("#PTI_container").html('').append(Current.llTable.toElement(true));
    }

}



ParserActions.prototype.toStructureInnerElement = function (brief, interactive) {
    /// <param name="brief" type="Boolean">if true, only the list of items will be output</param>
    /// <param name="interactive" type="Boolean">if true, the set will allow disabling actions and defining errors</param>
    /// <returns type="$Element" />
    var that = this, $list = $('<div></div>').addClass('parser-actions'),
        reset = function () { $list.replaceWith(that.toStructureInnerElement(true, true)); }
    $.each(this._setFinalized, function () {
        // prepare action
        var itemObject = this, $itemElement =
            $('<div></div>').addClass(that.contains(this) ? null : 'disabled')
            .append(this.toElement());
        // if interactive and not an error, allow disabling
        if (interactive && !(itemObject instanceof ParserActionError))
            $itemElement.addClass('interactive').click(function () {
                if (!$(this).hasClass('disabled'))
                    that.disableAction(itemObject);
                else
                    that.enableAction(itemObject);
                // unfortunatelly, reset won't update a table structure's td class, we have to do it
                $list.parent().attr('class', '').addClass(that.extraClass());
                reset();
            });
        // if interactive and is an error, allow removing
        if (interactive && (itemObject instanceof ParserActionError))
            $itemElement.addClass('interactive').click(function () {
                that.remove(itemObject, true);
                reset();
            });
        // add it to the container
        $list.append($itemElement);
    });

    // if interactive and no action defined, allow parser error definition
    if (interactive && $list.children().length == 0)
        $('<div class="interactive syntax">...</div>')
        .click(function () {
            $('<div class="add edited"><input type="text" value="" /></div>')
            .find('input').autoGrowInput({ comfortZone: 20, minWidth: 27, maxWidth: 200 })
                .keypress(function (event) { if (event.which == 13) $(this).focusout(); })
                .focusout(function () {
                    if ($(this).val().trim())
                        that.add(new ParserActionError($(this).val().trim()), true);
                    reset();
                }).parent()
            .replaceAll(this).find('input').keyup().focus();
        }).appendTo($list);

    return $list;
}