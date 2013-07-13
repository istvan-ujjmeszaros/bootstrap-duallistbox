/*jshint undef: true, unused:true */
/*global jQuery: true */

/*!=========================================================================
 *  Bootstrap Dual Listbox
 *  v1.0.4
 *
 *  Responsive dual multiple select with filtering. Designed to work on
 *  small touch devices.
 *
 *  https://github.com/istvan-meszaros/bootstrap-duallistbox
 *  http://www.virtuosoft.eu/code/bootstrap-duallistbox/
 *
 *  Copyright 2013 István Ujj-Mészáros
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * ====================================================================== */

(function($) {
    "use strict";

    $.fn.bootstrapDualListbox = function(options) {

        return this.each(function() {
            var $this = $(this);

            if (!$this.is("select"))
            {
                return $this.find("select").each(function(index, item) {
                    $(item).bootstrapDualListbox();
                });
            }

            if ($this.data('duallistbox_generated')) {
                return this;
            }

            var settings = $.extend( {
                preserveselectiononmove : false,            // 'all' / 'moved' / false
                moveonselect            : true,             // true/false (forced true on androids, see the comment later)
                initialfilterfrom       : '',               // string, filter selectables list on init
                initialfilterto         : '',               // string, filter selected list on init
                helperselectnamepostfix     : '_helper',        // 'string_of_postfix' / false
                infotext                : 'Showing all {0}',// text when all options are visible / false for no info text
                infotextfiltered        : '<span class="label label-warning">Filtered</span> {0} from {1}',// when not all of the options are visible due to the filter
                infotextempty           : 'Empty list',      // when there are no options present in the list
                selectorminimalheight   : 100,
                showfilterinputs        : true,
                filtertextclear         : 'show all'
            }, options);

            var container = $('<div class="row-fluid bootstrap-duallistbox-container"><div class="span6 box1"><span class="info-container"><span class="info"></span><button type="button" class="btn btn-mini clear1 pull-right">' + settings.filtertextclear + '</button></span><input placeholder="Filter" class="filter" type="text"><div class="btn-group buttons"><button type="button" class="btn moveall" title="Move all"><i class="icon-arrow-right"></i><i class="icon-arrow-right"></i></button><button type="button" class="btn move" title="Move selected"><i class="icon-arrow-right"></i></button></div><select multiple="multiple" data-duallistbox_generated="true"></select></div><div class="span6 box2"><span class="info-container"><span class="info"></span><button type="button" class="btn btn-mini clear2 pull-right">' + settings.filtertextclear + '</button></span><input placeholder="Filter" class="filter" type="text"><div class="btn-group buttons"><button type="button" class="btn remove" title="Remove selected"><i class="icon-arrow-left"></i></button><button type="button" class="btn removeall" title="Remove all"><i class="icon-arrow-left"></i><i class="icon-arrow-left"></i></button></div><select multiple="multiple" data-duallistbox_generated="true"></select></div></div>').insertBefore($this),
                elements = {
                    originalselect: $this,
                    box1: $('.box1', container),
                    box2: $('.box2', container),
                    filterinput1: $('.box1 .filter', container),
                    filterinput2: $('.box2 .filter', container),
                    filter1clear: $('.box1 .clear1', container),
                    filter2clear: $('.box2 .clear2', container),
                    info1: $('.box1 .info', container),
                    info2: $('.box2 .info', container),
                    select1: $('.box1 select', container),
                    select2: $('.box2 select', container),
                    movebutton: $('.box1 .move', container),
                    removebutton: $('.box2 .remove', container),
                    moveallbutton: $('.box1 .moveall', container),
                    removeallbutton: $('.box2 .removeall', container),
                    form: $($('.box1 .filter', container)[0].form)
                },
                i = 0,
                selectedelements = 0,
                // Selections are invisible on android if the containing select is styled with CSS
                // http://code.google.com/p/android/issues/detail?id=16922
                isbuggyandroid = /android/i.test(navigator.userAgent.toLowerCase());

            init();

            function init()
            {
                // We are forcing to move on select and disabling preserveselection on Android
                if (isbuggyandroid) {
                    settings.moveonselect = true;
                    settings.preserveselectiononmove = false;
                }

                if (settings.moveonselect) {
                    container.addClass('moveonselect');
                }

                var originalselectname = elements.originalselect.attr('name') || '';

                if (!!settings.helperselectnamepostfix)
                {
                    elements.select1.attr('name', originalselectname + settings.helperselectnamepostfix + '1');
                    elements.select2.attr('name', originalselectname + settings.helperselectnamepostfix + '2');
                }

                var c = elements.originalselect.attr('class');

                if (typeof c !== 'undefined' && c !== false)
                    c = c.match(/\bspan[1-9][0-2]?/);

                if (!!c) {
                    container.addClass(c.toString());
                }

                var height = (elements.originalselect.height() < settings.selectorminimalheight) ? settings.selectorminimalheight : elements.originalselect.height();

                elements.select1.height(height);
                elements.select2.height(height);

                elements.originalselect.css('display', 'none');

                updateselectionstates();

                if (settings.showfilterinputs === false) {
                    elements.filterinput1.hide();
                    elements.filterinput2.hide();
                } else {
                    elements.filterinput1.val(settings.initialfilterfrom);
                    elements.filterinput2.val(settings.initialfilterto);
                }

                bindevents();
                refreshselects();
            }

            function updateselectionstates()
            {
                elements.originalselect.find('option').each(function(index, item) {
                    var $item = $(item);

                    if (typeof($item.data('original-index')) === 'undefined')
                        $item.data('original-index', i++);

                    if (typeof($item.data('_selected')) === 'undefined') {
                        $item.data('_selected', false);
                    }
                });
            }

            function refreshselects()
            {
                selectedelements = 0;

                elements.select1.empty();
                elements.select2.empty();

                elements.originalselect.find('option').each(function(index, item) {
                    var $item = $(item);

                    if ($item.prop('selected')) {
                        selectedelements++;
                        elements.select2.append($item.clone(true).prop('selected', $item.data('_selected')));
                    }
                    else {
                        elements.select1.append($item.clone(true).prop('selected', $item.data('_selected')));
                    }
                });

                filter1();
                filter2();

                refreshinfo();
            }

            function formatstring(s, args)
            {
                return s.replace(/\{(\d+)\}/g, function(match, number) {
                    return typeof args[number] !== 'undefined' ? args[number] : match;
                });
            }

            function refreshinfo()
            {
                if (settings.infotext === false) {
                    return;
                }

                var visible1 = elements.select1.find('option').length,
                    visible2 = elements.select2.find('option').length,
                    all1 = elements.originalselect.find('option').length - selectedelements,
                    all2 = selectedelements;

                if (all1 === 0) {
                    elements.info1.html(settings.infotextempty);
                    elements.box1.removeClass("filtered");
                }
                else if (visible1 === all1) {
                    elements.info1.html(formatstring(settings.infotext, [visible1, all1]));
                    elements.box1.removeClass("filtered");
                }
                else {
                    elements.info1.html(formatstring(settings.infotextfiltered, [visible1, all1]));
                    elements.box1.addClass("filtered");
                }

                if (all2 === 0) {
                    elements.info2.html(settings.infotextempty);
                    elements.box2.removeClass("filtered");
                }
                else if (visible2 === all2) {
                    elements.info2.html(formatstring(settings.infotext, [visible2, all2]));
                    elements.box2.removeClass("filtered");
                }
                else {
                    elements.info2.html(formatstring(settings.infotextfiltered, [visible2, all2]));
                    elements.box2.addClass("filtered");
                }
            }

            function bindevents()
            {
                elements.form.submit(function(e) {
                    if (elements.filterinput1.is(":focus"))
                    {
                        e.preventDefault();
                        elements.filterinput1.focusout();
                    }
                    else if (elements.filterinput2.is(":focus"))
                    {
                        e.preventDefault();
                        elements.filterinput2.focusout();
                    }
                });

                elements.originalselect.on('bootstrapduallistbox.refresh', function(e, clearselections){
                    updateselectionstates();

                    if (!clearselections) {
                        saveselections1();
                        saveselections2();
                    }
                    else {
                        clearselections12();
                    }

                    refreshselects();
                });

                elements.filter1clear.on('click', function() {
                    elements.filterinput1.val('');
                    refreshselects();
                });

                elements.filter2clear.on('click', function() {
                    elements.filterinput2.val('');
                    refreshselects();
                });

                elements.movebutton.on('click', function() {
                    move();
                });

                elements.moveallbutton.on('click', function() {
                    moveall();
                });

                elements.removebutton.on('click', function() {
                    remove();
                });

                elements.removeallbutton.on('click', function() {
                    removeall();
                });

                elements.filterinput1.on('change keyup', function() {
                    filter1();
                });

                elements.filterinput2.on('change keyup', function() {
                    filter2();
                });

                if (settings.moveonselect) {
                    settings.preserveselectiononmove = false;

                    elements.select1.on('change', function() {
                        move();
                    });
                    elements.select2.on('change', function() {
                        remove();
                    });
                }

            }

            function saveselections1()
            {
                elements.select1.find('option').each(function(index, item) {
                    var $item = $(item);

                    elements.originalselect.find('option').eq($item.data('original-index')).data('_selected', $item.prop('selected'));
                });
            }

            function saveselections2()
            {
                elements.select2.find('option').each(function(index, item) {
                    var $item = $(item);

                    elements.originalselect.find('option').eq($item.data('original-index')).data('_selected', $item.prop('selected'));
                });
            }

            function clearselections12()
            {
                elements.select1.find('option').each(function() {
                    elements.originalselect.find('option').data('_selected', false);
                });
            }

            function filter1() {
                saveselections1();

                elements.select1.empty().scrollTop(0);

                var regex = new RegExp($.trim(elements.filterinput1.val()), "gi");

                elements.originalselect.find('option').not(':selected').each(function(index, item) {
                    var $item = $(item);

                    if (item.text.match(regex) !== null) {
                        elements.originalselect.find('option').eq($item.data('original-index')).data('filtered1', false);
                        elements.select1.append($item.clone(true).prop('selected', $item.data('_selected')));
                    }
                    else {
                        elements.originalselect.find('option').eq($item.data('original-index')).data('filtered1', true);
                    }
                });

                refreshinfo();
            }

            function filter2() {
                saveselections2();

                elements.select2.empty().scrollTop(0);

                var regex = new RegExp($.trim(elements.filterinput2.val()), "gi");

                elements.originalselect.find('option:selected').each(function(index, item) {
                    var $item = $(item);

                    if (item.text.match(regex) !== null) {
                        elements.originalselect.find('option').eq($item.data('original-index')).data('filtered2', false);
                        elements.select2.append($item.clone(true).prop('selected', $item.data('_selected')));
                    }
                    else {
                        elements.originalselect.find('option').eq($item.data('original-index')).data('filtered2', true);
                    }
                });

                refreshinfo();
            }

            function sortoptions(select)
            {
                select.find('option').sort(function(a, b) {
                    return ($(a).data('original-index') > $(b).data('original-index')) ? 1 : -1;
                }).appendTo(select);
            }

            function changeselectionstate(original_index, selected)
            {
                elements.originalselect.find('option').each(function(index, item) {
                    var $item = $(item);

                    if ($item.data('original-index') === original_index) {
                        $item.prop('selected', selected);
                    }
                });
            }

            function move()
            {
                if (settings.preserveselectiononmove === 'all') {
                    saveselections1();
                    saveselections2();
                }
                else if (settings.preserveselectiononmove === 'moved') {
                    saveselections1();
                }

                elements.select1.find('option:selected').each(function(index, item) {
                    var $item = $(item);

                    if (!$item.data('filtered1')) {
                        changeselectionstate($item.data('original-index'), true);
                    }
                });

                refreshselects();

                sortoptions(elements.select2);
            }

            function remove()
            {
                if (settings.preserveselectiononmove === 'all') {
                    saveselections1();
                    saveselections2();
                }
                else if (settings.preserveselectiononmove === 'moved') {
                    saveselections2();
                }

                elements.select2.find('option:selected').each(function(index, item) {
                    var $item = $(item);

                    if (!$item.data('filtered2')) {
                        changeselectionstate($item.data('original-index'), false);
                    }
                });

                refreshselects();

                sortoptions(elements.select1);
            }

            function moveall()
            {
                if (settings.preserveselectiononmove === 'all') {
                    saveselections1();
                    saveselections2();
                }
                else if (settings.preserveselectiononmove === 'moved') {
                    saveselections1();
                }

                elements.originalselect.find('option').each(function(index, item) {
                    var $item = $(item);

                    if (!$item.data('filtered1')) {
                        $item.prop('selected', true);
                    }
                });

                refreshselects();
            }

            function removeall()
            {
                if (settings.preserveselectiononmove === 'all') {
                    saveselections1();
                    saveselections2();
                }
                else if (settings.preserveselectiononmove === 'moved') {
                    saveselections2();
                }

                elements.originalselect.find('option').each(function(index, item) {
                    var $item = $(item);

                    if (!$item.data('filtered2')) {
                        $item.prop('selected', false);
                    }
                });

                refreshselects();
            }
        });

    };

})(jQuery);
