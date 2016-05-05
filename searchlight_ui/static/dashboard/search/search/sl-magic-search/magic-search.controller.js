/*
 *    (c) Copyright 2015 Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
  'use strict';
/**
 * @fileOverview Magic Search JS
 * @requires AngularJS
 *
 */

  angular.module('searchlight-ui.dashboard.search.search.sl-magic-search')
    .controller('searchlight-ui.dashboard.search.search.sl-magic-search.MagicSearchController', magicSearchController);

  magicSearchController.$inject = ['$scope', '$element', '$timeout', '$window',
    'searchlight-ui.dashboard.search.search.sl-magic-search.service'];

  function magicSearchController($scope, $element, $timeout, $window, service) {
    /**
     * Private Data
     */
    var ctrl = this;
    // unusedFacetChoices is the list of facet types that have not been selected
    var unusedFacetChoices = [];
    // facetChoices is the list of all facet choices
    var facetChoices = [];
    // TODO - Remove this direct element reference from the controller
    var searchInput = $element.find('.search-input');

    /**
     * Public Interface
     */

    ///// View specific model
    ctrl.mainPromptString = ctrl.strings ? ctrl.strings.prompt : '';
    // currentSearch is the list of facets representing the current search
    ctrl.currentSearch = [];
    ctrl.isMenuOpen = false;
    ctrl.searchInputValue = '';

    ///// View Event Handlers
    ctrl.keyDownHandler = keyDownHandler;
    ctrl.keyUpHandler = keyUpHandler;
    ctrl.keyPressHandler = keyPressHandler;

    // when facet clicked, add 1st part of facet and set up options
    ctrl.onFacetSelected = onFacetSelected;

    // when option clicked, complete facet and send event
    ctrl.onFacetOptionSelected = onFacetOptionSelected;

    // remove facet and either update filter or search
    ctrl.removeFacet = removeFacet;

    // Clear entire search bar
    ctrl.clearSearch = clearSearch;

    ctrl.isMatchLabel = function(label) {
      return angular.isArray(label);
    };

    init();

    /**
     * Implementation
     */

    function init() {
      // When the list of available facets changes, update the search bar
      $scope.$watch(function facetsWatch(scope) {
        return scope.ctrl.availableFacets;
      }, function facetsWatchHandler( newValue, oldValue, scope) {
        if ( newValue ) {
          // re-init to merge updated facets with current search
          initSearch(ctrl.currentSearch.map(service.getName));
        }
      }, true);

      // If search terms are present in the URL, attempt to use them
      initSearch(service.getSearchTermsFromQueryString($window.location.search));

      updateCurrentSearchFacets();
    }

    function initSearch(initialSearchTerms) {
      // Initializes both the unused choices and the full list of facets
      facetChoices = service.getFacetChoicesFromFacetsParam(ctrl.availableFacets);

      // resets the facets
      initFacets(initialSearchTerms);
    }

    function keyDownHandler($event) {
      var key = service.getEventCode($event);
      if (key === 9) {  // prevent default when we can.
        $event.preventDefault();
      }
    }

    function keyUpHandler($event) {  // handle ctrl-char input
      if ($event.metaKey === true) {
        return;
      }
      var key = service.getEventCode($event);
      var handlers = { 9: tabKeyUp, 27: escapeKeyUp, 13: enterKeyUp };
      if (handlers[key]) {
        handlers[key]();
      } else {
        defaultKeyUp();
      }
    }

    function keyPressHandler($event) {  // handle character input
      var searchVal = ctrl.searchInputValue;
      var key = service.getEventCode($event);
      // Backspace, Delete, Enter, Tab, Escape
      if (key !== 8 && key !== 46 && key !== 13 && key !== 9 && key !== 27) {
        // This builds the search term as you go.
        searchVal = searchVal + String.fromCharCode(key).toLowerCase();
      }
      if (searchVal === ' ') {  // space and field is empty, show menu
        ctrl.isMenuOpen = true;
        ctrl.searchInputValue = '';
        return;
      }
      if (searchVal === '') {
        ctrl.filteredFacets = unusedFacetChoices;
        ctrl.currentSearchText = '';
        if (ctrl.selectedFacet && angular.isUndefined(ctrl.selectedFacet.options)) {
          resetState();
        }
        return;
      }
      // Backspace, Delete
      if (key !== 8 && key !== 46) {
        filterFacets(searchVal);
      }
    }


    function tabKeyUp() {
      if (angular.isUndefined(ctrl.selectedFacet)) {
        if (ctrl.filteredFacets.length !== 1) {
          return;
        }
        ctrl.onFacetSelected(ctrl.filteredFacets[0]);
        ctrl.searchInputValue = '';
      } else {
        if (angular.isUndefined(ctrl.filteredFacetOptions) ||
          ctrl.filteredFacetOptions.length !== 1) {
          return;
        }
        ctrl.onFacetOptionSelected(ctrl.filteredFacetOptions[0]);
        resetState();
      }
    }

    function escapeKeyUp() {
      ctrl.isMenuOpen = false;
      resetState();
      var textFilter = ctrl.textSearch;
      if (angular.isUndefined(textFilter)) {
        textFilter = '';
      }
      ctrl.currentSearchText = textFilter;
    }

    function enterKeyUp() {
      var searchVal = ctrl.searchInputValue;
      // if tag search, treat as regular facet
      if (ctrl.selectedFacet && angular.isUndefined(ctrl.selectedFacet.options)) {
        var curr = ctrl.selectedFacet;
        curr.name = curr.name.split('=')[0] + '=' + searchVal;
        curr.label[1] = searchVal;
        ctrl.currentSearch.push(curr);
        resetState();
        updateCurrentSearchFacets();
        ctrl.isMenuOpen = false;
      } else {
        // if text search treat as search
        ctrl.currentSearch = ctrl.currentSearch.filter(notTextSearch);
        ctrl.currentSearch.push(service.getTextFacet(searchVal,
          ctrl.strings ? ctrl.strings.text : ''));
        ctrl.isMenuOpen = false;
        ctrl.searchInputValue = '';
        ctrl.currentSearchText = searchVal;
        ctrl.textSearch = searchVal;
      }
      ctrl.filteredFacets = unusedFacetChoices;
    }

    function notTextSearch(item) {
      return item.name.indexOf('text') !== 0;
    }

    function defaultKeyUp() {
      var searchVal = ctrl.searchInputValue;
      if (searchVal === '') {
        ctrl.filteredFacets = unusedFacetChoices;
        ctrl.currentSearchText = '';
        if (ctrl.selectedFacet && angular.isUndefined(ctrl.selectedFacet.options)) {
          resetState();
        }
      } else {
        filterFacets(searchVal);
      }
    }

    function filterFacets(searchVal) {
      // try filtering facets/options.. if no facets match, do text search
      var filtered = [];
      var isTextSearch = angular.isUndefined(ctrl.selectedFacet);
      if (isTextSearch) {
        ctrl.filteredFacets = unusedFacetChoices;
        filtered = service.getMatchingFacets(ctrl.filteredFacets, searchVal);
      } else {  // assume option search
        ctrl.filteredFacetOptions = ctrl.selectedFacetOptions;
        if (angular.isUndefined(ctrl.selectedFacetOptions)) {
          // no options, assume free form text facet
          return;
        }
        filtered = service.getMatchingOptions(ctrl.filteredFacetOptions, searchVal);
      }
      if (filtered.length > 0) {
        ctrl.isMenuOpen = true;
        $timeout(function() {
          ctrl.filteredFacets = filtered;
        }, 0.1);
      } else if (isTextSearch) {
        ctrl.currentSearchText = searchVal;
        ctrl.isMenuOpen = false;
      }
    }

    function onFacetSelected(facet) {
      ctrl.isMenuOpen = false;
      var label = facet.label;
      if (angular.isArray(label)) {
        label = label.join('');
      }
      var facetParts = facet.name && facet.name.split('=');
      ctrl.selectedFacet = service.getFacet(facetParts[0], facetParts[1], label, '');
      if (angular.isDefined(facet.options)) {
        ctrl.filteredFacetOptions = ctrl.selectedFacetOptions = facet.options;
        ctrl.isMenuOpen = true;
      }
      ctrl.searchInputValue = '';
      setPrompt('');
    }

    function onFacetOptionSelected(option) {
      var name = option.key;
      ctrl.isMenuOpen = false;
      var curr = ctrl.selectedFacet;
      curr.name = curr.name.split('=')[0] + '=' + name;
      curr.label[1] = option.label;
      if (angular.isArray(curr.label[1])) {
        curr.label[1] = curr.label[1].join('');
      }
      ctrl.currentSearch.push(curr);
      resetState();
      updateCurrentSearchFacets();
    }

    function updateCurrentSearchFacets(removed) {
      var query = service.getQueryPattern(ctrl.currentSearch);
      if (angular.isDefined(removed) && removed.indexOf('text') === 0) {
        ctrl.currentSearchText = '';
        delete ctrl.textSearch;
      } else {
        ctrl.currentSearchFacets = query;
        if (ctrl.currentSearch.length > 0) {
          // prune facets as needed from menus
          var newFacet = ctrl.currentSearch[ctrl.currentSearch.length - 1].name;
          var facetParts = service.getSearchTermObject(newFacet);
          service.removeChoice(facetParts, facetChoices, unusedFacetChoices);
        }
      }
    }

    function clearSearch() {
      if (ctrl.currentSearch.length > 0) {
        ctrl.currentSearch = [];
        unusedFacetChoices = facetChoices.map(service.getFacetChoice);
        resetState();
        ctrl.currentSearchText  = '';
        updateCurrentSearchFacets();
      }
    }

    function resetState() {
      ctrl.searchInputValue = '';
      ctrl.filteredFacets = unusedFacetChoices;
      delete ctrl.selectedFacet;
      delete ctrl.selectedFacetOptions;
      delete ctrl.filteredFacetOptions;
      if (ctrl.currentSearch.length === 0) {
        setPrompt(ctrl.mainPromptString);
      }
    }

    /**
     * Convience function to set the search prompt
     *
     * @param str - the prompt string
     */
    function setPrompt(str) {
      ctrl.strings.prompt = str;
    }

    function initFacets(searchTerms) {
      var tmpFacetChoices = facetChoices.map(service.getFacetChoice);
      if (searchTerms.length > 1 || searchTerms[0] && searchTerms[0].length > 0) {
        setPrompt('');
      }
      ctrl.filteredFacets = unusedFacetChoices =
        service.getUnusedFacetChoices(tmpFacetChoices, searchTerms);
      ctrl.currentSearch = service.getFacetsFromSearchTerms(searchTerms,
        ctrl.textSearch, ctrl.strings ? ctrl.strings.text : '', tmpFacetChoices);
    }

    /**
     * Remove a facet from the current search
     *
     * @param {number} index - the index of the facet to remove. Required.
     *
     * @returns {number} Doesn't return anything
     */
    function removeFacet(index) {
      var removed = ctrl.currentSearch[index].name;
      ctrl.currentSearch.splice(index, 1);
      if (angular.isUndefined(ctrl.selectedFacet)) {
        updateCurrentSearchFacets(removed);
      } else {
        resetState();
      }
      if (ctrl.currentSearch.length === 0) {
        setPrompt(ctrl.mainPromptString);
      }
      // re-init to restore facets cleanly
      initFacets(ctrl.currentSearch.map(service.getName));
    }

  }

})();
