// class Highlight

function Highlight(description, addClass, decayType){
    /// <summary>declare a new highlight</summary>

    this.value = Highlight._list.length;
    Highlight._list.push(this);

    this.desc = description;
    this.addClass = addClass;
    this.decayType = decayType;
}
Highlight.prototype.decay = function () {
    /// <summary>what highlight should follow a step after this one</summary>
    switch (this.decayType) {
        case Highlight.DECAY_TEMPORARY: return Highlight.NONE;
        case Highlight.DECAY_PERSISTENT: return this;
        case Highlight.DECAY_TO_NEXT: return Highlight.get(this.value + 1);
        default: return Highlight.NONE;
    }
}

Highlight.DECAY_TEMPORARY = 1;
Highlight.DECAY_PERSISTENT = 2;
Highlight.DECAY_TO_NEXT = 3;

Highlight._list = [];
Highlight.NONE
    = new Highlight(null, "", Highlight.DECAY_PERSISTENT);
Highlight.NEW
    = new Highlight("entity was created in this step", "hl-new", Highlight.DECAY_TEMPORARY);
Highlight.DUPLICATE
    = new Highlight("entity would be added in this step, but was already present", "hl-duplicate", Highlight.DECAY_TEMPORARY);
Highlight.REMOVED
    = new Highlight("entity was removed in this step", "hl-removed", Highlight.DECAY_TEMPORARY);
Highlight.REPLACED
    = new Highlight("entity was changed in this step", "hl-replaced", Highlight.DECAY_TEMPORARY);
Highlight.ATT_TEMP
    = new Highlight("entity was marked important in this step", "hl-attention", Highlight.DECAY_TEMPORARY);
Highlight.ATT_PERS
    = new Highlight("entity was marked important", "hl-attention", Highlight.DECAY_PERSISTENT);
Highlight.ATT_NEW
    = new Highlight("entity was marked important in this step", "hl-attention", Highlight.DECAY_TO_NEXT);
Highlight.ATT_OLD
    = new Highlight("entity was marked important in some previous step", "hl-attention-old", Highlight.DECAY_PERSISTENT);
Highlight.SPECIAL_PERS
    = new Highlight("there is something special about the entity", "hl-special", Highlight.DECAY_PERSISTENT);
Highlight.SPECIAL_TEMP
    = new Highlight("there is something special about the entity", "hl-special", Highlight.DECAY_TEMPORARY);


Highlight.get = function (highlightNumber) {
    /// <summary>get a highlight</summary>
    return Highlight._list[highlightNumber];
};

Highlight.whichShouldStay = function (original, intended) {
    /// <summary>find out if I can replace Highlight original with Highlight intended</summary>
    /// <param name="original" type="Highlight">the highlight this entity has right now</param>
    /// <param name="intended" type="Highlight">the highlight I would like to make</param>

    if (!(intended instanceof Highlight)) return original;
    if (original == Highlight.REMOVED) return original;
    if (intended == Highlight.NONE) return intended;
    if (original == Highlight.NEW
        && intended != Highlight.REPLACED && intended != Highlight.ATT_NEW) return original;

    return intended;
}
