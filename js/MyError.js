// function & static class MyError

var MyError = function (message) {
    /// <summary>report critical error, open the error log</summary>
    /// <param name="message" type="String">error message</param>
    /// <returns type="null" />

    return MyError.error(message);
};


// methods

MyError.openOnWarns = false;
MyError.openOnErrors = true;
MyError.init = function () {
    /// <summary>init</summary>

    var that = this;
    $('#error_log > div').click(function () {
        that.close();
    });
    $('#error_log > textarea').html('### CFGE ERROR LOG ### - click the border to close');

};
MyError.error = function (message) {
    /// <summary>report critical error, open the error log</summary>
    /// <param name="message" type="String">error message</param>
    /// <returns type="null" />
    
    var textarea = $('#error_log > textarea'), e;
    try {
        throw new Error(message);
    } catch (_e) { e = _e; }
    textarea.html(textarea.html() + '\n' + '#ERR ' + (new Date()).toLocaleTimeString() + ' ' + e.stack);
    if (this.openOnErrors) this.open();
    throw e;
};
MyError.warn = function (message) {
    /// <summary>log non-critical problem</summary>
    /// <param name="message" type="String">warning message</param>
    /// <returns type="null" />

    var textarea = $('#error_log > textarea');
    textarea.html(textarea.html() + '\n' + '#WARN ' + (new Date()).toLocaleTimeString() + ' ' + message);
    if (this.openOnWarns) this.open();
    return null;

};
MyError.user = function (message) {
    /// <summary>display user-generated warning report</summary>
    /// <param name="message" type="String">warning message</param>
    /// <returns type="null" />

    var textarea = $('#error_log > textarea');
    textarea.html(textarea.html() + '\n' + '#USER ' + (new Date()).toLocaleTimeString() + ' ' + message);
    NotificationBar.pop(message);
    return null;

};
MyError.open = function () {

    $('#error_log').show();

}
MyError.close = function () {

    $('#error_log').hide();

}

var UserError = function (message) {
    /// <summary>display user-generated warning report</summary>
    /// <param name="message" type="String">warning message</param>
    /// <returns type="null" />

    MyError.user(message);
}