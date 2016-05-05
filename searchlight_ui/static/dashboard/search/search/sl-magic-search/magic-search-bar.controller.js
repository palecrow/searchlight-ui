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
 * @fileOverview Magic Search Bar Controller
 * @requires AngularJS
 *
 */

  angular.module('searchlight-ui.dashboard.search.search.sl-magic-search')
    .controller('searchlight-ui.dashboard.search.search.sl-magic-search.MagicSearchBarController', MagicSearchBarController);

  MagicSearchBarController.$inject = [
    '$scope'
  ];

  function MagicSearchBarController($scope) {
    var ctrl = this;

    ctrl.clientFullTextSearch =
      angular.isDefined(ctrl.clientFullTextSearch)
        ? ctrl.clientFullTextSearch
        : true;

    // if filterStrings is not defined, set defaults
    var defaultFilterStrings = {
      cancel: gettext('Cancel'),
      prompt: gettext('Click here for filters.'),
      remove: gettext('Remove'),
      text: (ctrl.clientFullTextSearch ?
        gettext('Search in current results') :
        gettext('Full Text Search'))
    };
    ctrl.filterStrings = ctrl.filterStrings || defaultFilterStrings;

    /**
     * Public Interface
     */

    /**
     * Private Data
     */

    /**
     * Implementation
     */
  }

})();
