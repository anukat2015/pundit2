angular.module('Pundit2.Annotators')

.constant('TEXTFRAGMENTANNOTATORDEFAULTS', {
    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TextFragmentAnnotator
     *
     * @description
     * `object`
     *
     * Configuration object for Text Fragment Annotator module.
     */

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TextFragmentAnnotator.cMenuType
     *
     * @description
     * `string`
     *
     * Type of the contextual menu to trigger on text fragments icons clicks.
     *
     * Default value:
     * <pre> cMenuType: 'annotatedTextFragment' </pre>
     */
    cMenuType: 'annotatedTextFragment',

    // Class to get the consolidated icon: normal consolidated fragment
    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TextFragmentAnnotator.annotationIconClass
     *
     * @description
     * `string`
     *
     * Icon shown for annotation
     *
     * Default value:
     * <pre> annotationIconClass: 'pnd-icon-tag' </pre>
     */
    annotationIconClass: 'pnd-icon-tag',

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TextFragmentAnnotator.myItemsIconClass
     *
     * @description
     * `string`
     *
     * Icon shown for my items
     *
     * Default value:
     * <pre> myItemsIconClass: 'pnd-icon-bookmark' </pre>
     */
    myItemsIconClass: 'pnd-icon-bookmark',

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TextFragmentAnnotator.suggestionIconClass
     *
     * @description
     * `string`
     *
     * Icon shown for annotation suggestion
     *
     * Default value:
     * <pre> suggestionIconClass: 'pnd-icon-pencil' </pre>
     */
    suggestionIconClass: 'pnd-icon-pencil',

    /**
     * @module punditConfig
     * @ngdoc property
     * @name modules#TextFragmentAnnotator.addIcon
     *
     * @description
     * `boolean`
     *
     * Add or not the icon to the text fragments
     *
     * Default value:
     * <pre> addIcon: 'true' </pre>
     */
    addIcon: true
})

.service('TextFragmentAnnotator', function(TEXTFRAGMENTANNOTATORDEFAULTS, NameSpace, BaseComponent, Consolidation,
    XpointersHelper, ItemsExchange, Config, EventDispatcher, $compile, $q, $rootScope) {

    // Create the component and declare what we deal with: text
    var textFragmentAnnotator = new BaseComponent('TextFragmentAnnotator', TEXTFRAGMENTANNOTATORDEFAULTS);

    var annomaticIsRunning = false;
    var n = 0;

    // Each fragment will be split into bits, each bit will carry a relation
    // to the parent fragment through this id
    var fragmentIds = {},
        fragmentsRefs = {},
        fragmentsRefsById = {},
        // For the given id it will contain an object with:
        // .uri : uri of the original item
        // .bits: array of scopes of the bit directives for this fragment
        // .icon: scope of the icon directive for this fragment
        // .item: Item belonging to this id
        fragmentById = {};

    textFragmentAnnotator.label = 'text';
    textFragmentAnnotator.type = NameSpace.fragments[textFragmentAnnotator.label];

    var placeIcon = function(id, bit) {
        // TODO: put this name in .options ?
        var directive = annomaticIsRunning ? 'suggestion-fragment-icon' : 'text-fragment-icon',
            element = angular.element('<' + directive + ' fragment="' + id + '"></' + directive + '>');

        textFragmentAnnotator.log('Placing fragment icon ' + n++, id, bit.attr('fragments'));
        bit.after(element);

        return element;
    };

    // For each fragment ID it will place an icon after the last BIT belonging
    // to the given fragment
    var placeIcons = function() {
        n = 0;
        // To see what kind of fragment item is it, check which container it belongs to
        //amContainer = Config.modules.Annomatic.container;

        for (var c in fragmentIds) {
            var id = fragmentIds[c],
                fragments = angular.element('.' + id),
                firstBit = fragments.first(),
                lastBit = fragments.last();

            fragmentsRefs[c] = [lastBit, firstBit];
            placeIcon(id, lastBit);
        }
    };

    // TODO: Move this to XpointersHelper .something() ?
    var activateFragments = function() {
        // var deferred = $q.defer();

        var consolidated = angular.element('.pnd-cons:not(.ng-scope)');
        $compile(consolidated)($rootScope);

        var icons = angular.element('text-fragment-icon, suggestion-fragment-icon');
        $compile(icons)($rootScope);

        $rootScope.$$phase || $rootScope.$digest();

        // deferred.resolve();
        // return deferred.promise;
    };

    textFragmentAnnotator.isConsolidable = function(item) {
        if (!angular.isArray(item.type)) {
            textFragmentAnnotator.log('Item not valid: malformed');
            return false;
        } else if (item.type.length === 0) {
            textFragmentAnnotator.log('Item not valid: types len 0');
            return false;
        } else if (item.type.indexOf(textFragmentAnnotator.type) === -1) {
            textFragmentAnnotator.log('Item not valid: not a ' + textFragmentAnnotator.type);
            return false;
        } else if (!XpointersHelper.isValidXpointerURI(item.getXPointer())) {
            textFragmentAnnotator.log('Item not valid: not a valid xpointer uri: ' + item.getXPointer());
            return false;
        } else if (!XpointersHelper.isValidXpointer(item.getXPointer())) {
            textFragmentAnnotator.log('Item not valid: not consolidable on this page: ' + item.getXPointer());
            return false;
        }

        // TODO: it's a valid text fragment if:
        // - has a part of
        // - has a page context

        textFragmentAnnotator.log('Item valid: try to consolidate ' + item.label);
        return true;
    };

    // All of the items passed should be consolidable (checked by isConsolidable), in the
    // consolidation service, gathering all annotators
    // TODO: better check twice? :|
    textFragmentAnnotator.consolidate = function(items) {
        var deferred = $q.defer();

        if (!angular.isObject(items)) {
            textFragmentAnnotator.err('Items not valid: malformed object', items);
            return deferred.resolve();
        }

        textFragmentAnnotator.log('Consolidating!');

        var updateDOMPromise, compilePromise;

        var xpointers = [],
            i = 0;

        // TODO: better wipe up? other stuff to reset?
        // Reset them, each consolidate has its own unique list
        fragmentIds = {};
        fragmentsRefs = {};
        fragmentsRefsById = {};
        fragmentById = {};

        var tempFragmentIds = {};

        for (var uri in items) {
            var itemXPointer = items[uri].getXPointer();
            xpointers.push(itemXPointer);
            fragmentIds[uri] = ['fr-' + i];
            tempFragmentIds[itemXPointer] = ['fr-' + i];
            fragmentById['fr-' + i] = {
                uri: uri,
                bits: [],
                item: items[uri]
            };
            i++;
        }

        var xpaths = XpointersHelper.getXPathsFromXPointers(xpointers),
            sorted = XpointersHelper.splitAndSortXPaths(xpaths),
            // After splitting and sorting each bit has a list of fragment ids it belongs to.
            // Instead of using classes, these ids will be saved in a node attribute.
            xpathsFragmentIds = XpointersHelper.getClassesForXpaths(xpointers, sorted, xpaths, tempFragmentIds);

        updateDOMPromise = XpointersHelper.updateDOM(sorted, XpointersHelper.options.wrapNodeClass, xpathsFragmentIds);

        updateDOMPromise.then(function() {
            var fragmentId;
            if (Object.keys(fragmentsRefsById).length > 0) {
                for (var uri in fragmentIds) {
                    fragmentId = fragmentIds[uri];
                    fragmentsRefs[uri] = fragmentsRefsById[fragmentId];
                }
            } else {
                if (textFragmentAnnotator.options.addIcon) {
                    placeIcons();
                }

                // TODO: better name? Elsewhere?
                compilePromise = activateFragments();
            }
        });

        $q.all([updateDOMPromise, compilePromise]).then(function() {
            textFragmentAnnotator.log(textFragmentAnnotator.label + ' consolidation: done!');
            deferred.resolve();
        });

        return deferred.promise;
    };

    // Wipes everything done by the annotator:
    // - removes the icons, if present
    // - unwraps the fragments
    textFragmentAnnotator.wipe = function() {

        fragmentIds = {};
        fragmentsRefs = {};
        fragmentsRefsById = {};
        fragmentById = {};

        // Remove icons
        angular.element('.' + XpointersHelper.options.textFragmentIconClass).remove();

        // Replace wrapped nodes with their content
        var bits = angular.element('.' + XpointersHelper.options.wrapNodeClass);
        angular.forEach(bits, function(node) {
            var parent = node.parentNode;
            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            angular.element(node).remove();
        });

        // Finally merge splitted text nodes
        XpointersHelper.mergeTextNodes(angular.element('body')[0]);
    };

    textFragmentAnnotator.wipeItem = function(item) {
        var atLeastOne = false;
        var references = fragmentsRefs[item.uri];
        var uriFragmentId = fragmentIds[item.uri][0];
        var iconReference = fragmentById[uriFragmentId].icon;
        for (var i in references) {
            if (references[i].attr('fragments') === uriFragmentId) {
                var node = references[i][0],
                    parent = node.parentNode;
                while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                references[i].remove();
                atLeastOne = true;
            }
        }
        if (atLeastOne) {
            if (typeof iconReference !== 'undefined') {
                iconReference.element.remove();
            }
            // Finally merge splitted text nodes
            XpointersHelper.mergeTextNodes(angular.element('body')[0]);
        }
    };

    textFragmentAnnotator.wipeFragmentIds = function(frIds) {
        var mod = [];
        for (var i in frIds) {
            var fragmentId = frIds[i],
                uri = fragmentById[fragmentId].uri,
                references =  fragmentsRefsById[fragmentId];
            for (var r in references) {
                var elem = references[r];
                wipeReference(elem, fragmentId, mod);
            }

            delete fragmentsRefsById[fragmentId];
            delete fragmentById[fragmentId];

            if (fragmentIds[uri][0] === fragmentId) {
                delete fragmentIds[uri];
                delete fragmentsRefs[uri];
            }
        }

        XpointersHelper.mergeTextNodes(angular.element('body')[0]);
        activateFragments();
    };

    var wipeReference = function(elem, fragmentId, mod) {
        var node = elem[0],
            prev = node.previousElementSibling,
            next = node.nextElementSibling,
            jPrev,
            jNext,
            fragments,
            elemFragments = elem.attr('fragments'),
            cleanElemFragments = elemFragments.replace(fragmentId, '').split(',').filter(function(s){return s.length>0}).join(','),
            cleanElemFragmentsA = cleanElemFragments.split(','),
            mergeWithPrev = false,
            frIntersectWithPrev = false,
            mergeWithNext = false,
            frIntersectWithNext = false,
            elemRemoved = false,
            fragmentIntersection;

        // #1 TEXT<SPAN>TEXT
        if ((prev === null || prev.nodeType === 3) && (next === null || next.nodeType === 3)) {
            if (elem.attr('fragments') === fragmentId) {
                node.parentNode.insertBefore(node.firstChild, node);
                elem.remove();
                elemRemoved = true;
            }
        }
        else {
            // Now we're going to check if we need to merge element span with
            // either previous span or next span or both.
            // First we check prev sibling, if it's present and it's an element node..
            if (prev !== null && prev.nodeType === 1) {
                jPrev = angular.element(prev);
                // .. and if it has "pnd-cons" class we have to check if has the same fragment id(s)
                if (jPrev.hasClass(XpointersHelper.options.wrapNodeClass)) {
                    fragments = jPrev.attr('fragments');
                    if (fragments === cleanElemFragments) {
                        mergeWithPrev = true;
                    }
                    else {
                        // Check if prev fragments list intersects with current element fragments list purged by fragmentId
                        fragmentIntersection = fragments.split(',').filter(function(n) {return cleanElemFragmentsA.indexOf(n) !== -1});
                        frIntersectWithPrev = fragmentIntersection.length !== 0;
                    }
                }
            }
            // now we do the same check for next sibling.
            if (next !== null && next.nodeType === 1) {
                jNext = angular.element(next);
                if (jNext.hasClass(XpointersHelper.options.wrapNodeClass)) {
                    fragments = jNext.attr('fragments');
                    if (fragments === cleanElemFragments) {
                        mergeWithNext = true;
                    }
                    else {
                        // Check if next fragments list intersects with current element fragments list purged by fragmentId
                        fragmentIntersection = fragments.split(',').filter(function(n) {return cleanElemFragmentsA.indexOf(n) !== -1});
                        frIntersectWithNext = fragmentIntersection.length !== 0;
                    }
                }
            }
        }

        if (!elemRemoved) {
            if (mergeWithPrev || mergeWithNext){
                // Crete new node.
                var wrapNode = XpointersHelper.createWrapNode(XpointersHelper.options.wrapNodeName, XpointersHelper.options.wrapNodeClass, cleanElemFragmentsA);
                var elementsToRemove = [];
                if (mergeWithPrev) {
                    wrapNode.jElement.text(jPrev.text());
                    elementsToRemove.push(jPrev);
                }
                wrapNode.jElement.append(elem.text());
                elementsToRemove.push(elem);
                if (mergeWithNext) {
                    wrapNode.jElement.append(jNext.text());
                    elementsToRemove.push(jNext);
                }
                elem.after(wrapNode.jElement);
                elementsToRemove.forEach(function(e, i){
                    e.remove();
                });
            }
            else if (!frIntersectWithNext && !frIntersectWithNext) {
                if (elem.attr('fragments') === fragmentId) {
                    node.parentNode.insertBefore(node.firstChild, node);
                    elem.remove();
                } 
                else {
                    elem
                        .attr('fragments', cleanElemFragments)
                        .removeClass(fragmentId)
                        .removeClass('pnd-cons-temp');

                    elem.attr('class').split(' ').forEach(function(c) {
                        if (c.indexOf('pnd-textfragment-numbers') !== -1) {
                            elem.removeClass(c);
                        }
                    });

                    elem.addClass('pnd-textfragment-numbers-' + cleanElemFragments.split(",").length);
                }
            }
            else {
                elem
                    .attr('fragments', cleanElemFragments)
                    .removeClass(fragmentId)
                    .removeClass('pnd-cons-temp');

                elem.attr('class').split(' ').forEach(function(c) {
                    if (c.indexOf('pnd-textfragment-numbers') !== -1) {
                        elem.removeClass(c);
                    }
                });

                elem.addClass('pnd-textfragment-numbers-' + cleanElemFragments.split(",").length);
            }
        }

        // TEMPORARY::::
        $('.pnd-textfragment-hidden').removeClass('pnd-textfragment-hidden');
    };

    // Called by TextFragmentIcon directives: they will be placed after each consolidated
    // fragment.
    textFragmentAnnotator.addFragmentIcon = function(icon) {
        if (typeof fragmentById[icon.fragment] === 'undefined') {
            textFragmentAnnotator.err("fragmentById[" + icon.fragment + "] is undefined - skipping textFragmentAnnotator.addFragmentIcon()");
            return;
        }
        fragmentById[icon.fragment].icon = icon;
        icon.item = fragmentById[icon.fragment].item;

        textFragmentAnnotator.log('Adding fragment icon for fragment id=' + icon.fragment);
    };

    // Called by TextFragmentBit directives: they will wrap every bit of annotated content
    // for every xpointer we save an array of those bits. Each bit can belong to more
    // than one xpointer (overlaps!)
    textFragmentAnnotator.addFragmentBit = function(bit) {
        var fragments = bit.fragments;

        // Fragment ids are split by a comma, gather them back in a array. Otherwise
        // they are a string
        if (fragments.match(/,/)) {
            fragments = fragments.split(',');
        } else {
            fragments = [fragments];
        }

        for (var l = fragments.length; l--;) {
            var current = fragmentById[fragments[l]];
            if (typeof current === 'undefined') {
                textFragmentAnnotator.err("fragmentById[" + fragments[l] + "] is undefined - skipping textFragmentAnnotator.addFragmentBit()");
                continue;
            }
            current.bits.push(bit);
        }
        textFragmentAnnotator.log('Adding consolidated fragment bit', fragments);
    };

    textFragmentAnnotator.getFragmentReferenceByUri = function(uri) {
        if (typeof(fragmentsRefs[uri]) !== 'undefined') {
            return fragmentsRefs[uri];
        }
    };

    textFragmentAnnotator.getFragmentIdByUri = function(uri) {
        if (typeof(fragmentIds[uri]) !== 'undefined') {
            return fragmentIds[uri];
        }
    };

    textFragmentAnnotator.getFragmentIconScopeById = function(id) {
        if (typeof(fragmentById[id]) !== 'undefined') {
            return fragmentById[id].icon;
        }
    };

    textFragmentAnnotator.getBitsById = function(id) {
        if (typeof(fragmentById[id]) !== 'undefined') {
            return fragmentById[id].bits;
        }
    };

    textFragmentAnnotator.highlightByUri = function(uri) {
        if (typeof(fragmentIds[uri]) === 'undefined') {
            textFragmentAnnotator.log('Not highlighting given URI: fragment id not found');
            return;
        }
        textFragmentAnnotator.highlightById(fragmentIds[uri][0]);
    };

    textFragmentAnnotator.highlightById = function(id) {
        for (var l = fragmentById[id].bits.length; l--;) {
            fragmentById[id].bits[l].high();
        }
        textFragmentAnnotator.log('Highlighting fragment id=' + id + ', # bits: ' + fragmentById[id].bits.length);
    };


    textFragmentAnnotator.clearHighlightByUri = function(uri) {
        if (typeof(fragmentIds[uri]) === 'undefined') {
            textFragmentAnnotator.log('Not clearing highlight on given URI: fragment id not found');
            return;
        }
        textFragmentAnnotator.clearHighlightById(fragmentIds[uri]);
    };

    textFragmentAnnotator.clearHighlightById = function(id) {
        for (var l = fragmentById[id].bits.length; l--;) {
            fragmentById[id].bits[l].clear();
        }
        textFragmentAnnotator.log('Clear highlight on fragment id=' + id + ', # bits: ' + fragmentById[id].bits.length);
    };

    // Hides and shows a single fragment (identified by its item's URI)
    textFragmentAnnotator.showByUri = function(uri) {
        if (typeof(fragmentIds[uri]) === 'undefined') {
            textFragmentAnnotator.log('Not showing fragment for given URI: fragment id not found');
            return;
        }
        var id = fragmentIds[uri];
        for (var l = fragmentById[id].bits.length; l--;) {
            fragmentById[id].bits[l].show();
        }
    };

    textFragmentAnnotator.hideByUri = function(uri) {
        if (typeof(fragmentIds[uri]) === 'undefined') {
            textFragmentAnnotator.log('Not hiding fragment for given URI: fragment id not found');
            return;
        }
        var id = fragmentIds[uri];
        for (var l = fragmentById[id].bits.length; l--;) {
            fragmentById[id].bits[l].hide();
        }
    };

    // Hides and shows every fragment
    textFragmentAnnotator.hideAll = function() {
        for (var uri in fragmentIds) {
            textFragmentAnnotator.hideByUri(uri);
        }
    };

    textFragmentAnnotator.showAll = function() {
        for (var uri in fragmentIds) {
            textFragmentAnnotator.showByUri(uri);
        }
    };

    // Ghost and remove ghost from a single fragment (identified by its item's URI)
    textFragmentAnnotator.ghostByUri = function(uri) {
        if (typeof(fragmentIds[uri]) === 'undefined') {
            textFragmentAnnotator.log('Fragment id not found');
            return;
        }
        var id = fragmentIds[uri];
        for (var l = fragmentById[id].bits.length; l--;) {
            fragmentById[id].bits[l].ghost();
        }
    };

    textFragmentAnnotator.ghostRemoveByUri = function(uri) {
        if (typeof(fragmentIds[uri]) === 'undefined') {
            textFragmentAnnotator.log('Fragment id not found');
            return;
        }
        var id = fragmentIds[uri];
        for (var l = fragmentById[id].bits.length; l--;) {
            fragmentById[id].bits[l].expo();
        }
    };

    // Hides and shows every fragment
    textFragmentAnnotator.ghostAll = function() {
        for (var uri in fragmentIds) {
            textFragmentAnnotator.ghostByUri(uri);
        }
    };

    textFragmentAnnotator.ghostRemoveAll = function() {
        for (var uri in fragmentIds) {
            textFragmentAnnotator.ghostRemoveByUri(uri);
        }
    };

    // The orchestrator will be called by the consolidation service as single point of
    // interaction when it comes to deal with fragments. Let's subscribe the text type.
    Consolidation.addAnnotator(textFragmentAnnotator);

    EventDispatcher.addListener('XpointersHelper.NodeAdded', function(e) {
        var elementInfo = e.args,
            elementFragments = elementInfo.fragments,
            elementReferce = elementInfo.reference,
            currentFragment, currentIcon;

        var patt = new RegExp(/fr\-[0-9]+/);
        for (var i in elementFragments) {
            currentFragment = elementFragments[i];
            if (!patt.test(currentFragment)) {
                return;
            }
            if (typeof fragmentsRefsById[currentFragment] === 'undefined') {
                fragmentsRefsById[currentFragment] = [elementReferce];
                if (textFragmentAnnotator.options.addIcon) {
                    currentIcon = placeIcon(currentFragment, elementReferce);
                    $compile(currentIcon)($rootScope);
                }
            } else {
                fragmentsRefsById[currentFragment].push(elementReferce);
            }
        }

        $compile(elementReferce)($rootScope);
    });

    EventDispatcher.addListener('XpointersHelper.temporaryWrap', function(e) {
        var wrapInfo = e.args,
            fragments = wrapInfo.fragments,
            newFragmentUri = wrapInfo.uri,
            newFragmentId = fragments[0];

        fragmentIds[newFragmentUri] = typeof fragmentIds[newFragmentUri] === 'undefined' ? [newFragmentId] : fragmentIds[newFragmentUri].push(newFragmentId);
        fragmentById[newFragmentId] = {
            uri: newFragmentUri,
            bits: [],
            item: ItemsExchange.getItemByUri(newFragmentUri)
        };

        angular.forEach(fragments, function(fr) {
            var currentUri = fragmentById[fr].uri,
                currentReferences = angular.element('.' + fr),
                referencesList = [];

            currentReferences.each(function(i) {
                referencesList.unshift(currentReferences.eq(i));
            });

            fragmentsRefs[currentUri] = referencesList;
            fragmentsRefsById[fr] = referencesList;
        });

        activateFragments();
    });

    $rootScope.$on('annomatic-run', function() {
        annomaticIsRunning = true;
    });
    $rootScope.$on('annomatic-stop', function() {
        annomaticIsRunning = false;
    });

    textFragmentAnnotator.log('Component up and running');
    return textFragmentAnnotator;
});