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