var Menu = {

    _activeTab: null,

    open: function (tab) {
        /// <summary>open the tab object specified in the argument, closing other tabs</summary>

        NotificationBar.close();
        tab.open();
        var newTabElement = $('#tab_' + tab.getTabId()), tabSet = newTabElement;

        if (this._activeTab) {
            $('#menu_' + this._activeTab.getId()).removeClass('active');
            var oldTabElement = $('#tab_' + this._activeTab.getTabId()).clearQueue();
            tabSet.add(oldTabElement);
            if (this._activeTab.getTabId() == tab.getTabId()) oldTabElement.fadeTo(200, 0.6);
            else {
                $('#tabs').height(oldTabElement.height());
                tabSet.addClass('switching');
                oldTabElement.fadeOut(200);
                var pageWidth = tab.getTabId() == "Algorithm" ? "75%" : "100%";
                $('#page').css({ width: pageWidth });
                $('#toolbox').animate({ left: pageWidth }, 250);
            }
        }
        this._activeTab = tab;
        OriginalGrammar.manage();
        $('#menu_' + tab.getId()).addClass('active');
        $('#tabs').finish().animate(
            { height: (newTabElement.css({display: 'block', 'opacity': 0}).height()) + 'px' },
            200, null, function () {
                tabSet.removeClass('switching');
                $('#tabs').css('height', '');
            }
        );
        newTabElement.fadeTo(250, 1);

        this.minimizeMenu();
    },

    getOriginalGrammarRule: function () {
        /// <summary>what is the policy of opening the Original Grammar display on this tab?</summary>
        return this._activeTab && this._activeTab.getOriginalGrammarRule();
    },

    init: function (list) {
        var that = this;
        $('#nav_minimize').unbind('click').click(function () {
            that.minimizeMenu();
        });
        $('#nav_minimize_overlay').unbind('click').click(function () {
            that.unminimizeMenu();
        });
    },

    register: function (list) {
        /// <summary>register a list of menu tabs and initialize the menu</summary>
        var that = this;
        $.each(list, function (i, tab) {
            $("#menu_" + tab.getId()).click(function () {
                if (!$(this).hasClass('locked'))
                    that.open(tab);
            });
        });
    },

    addSectionButton: function (alg, sectionID) {
        /// <summary>add a button and register a normal form</summary>
        /// <param name="sectionID" type="String">'normal_forms' or 'parsing'</param>
        $('#menu_' + sectionID).append('<li id="menu_' + alg.getId() + '">' + alg.getName() + '</li>');
        this.register([alg]);
    },

    lock: function (tab) {
        $('#menu_' + tab.getId()).addClass('locked');
    },

    unlock: function (tab) {
        $('#menu_' + tab.getId()).removeClass('locked');
    },

    minimizeMenu: function () {
        $('header').addClass('minimized');
    },

    unminimizeMenu: function () {
        $('header').removeClass('minimized');
    }

}