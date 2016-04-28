/*
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function() {
  "use strict";

  angular
    .module('horizon.dashboard.project.search')
    .controller('horizon.dashboard.project.search.SavedSearchController', controller);

  controller.$inject = [
    '$scope',
    '$timeout',
    'horizon.dashboard.project.search.searchlightSearchHelper'
  ];

  function controller($scope, $timeout, searchlightSearchHelper) {
    var ctrl = this;
    var timeout = 2000;
    var timeoutPromise = undefined;

    ctrl.hits = undefined;
    ctrl.onClick = onClick;

    ctrl.query.onSearchSuccess = onSearchResult;
    ctrl.query.onSearchError = onSearchResult;

    executeSearch();

    $scope.$on('$destroy', onDestroy);

    function onDestroy() {
      if ( timeoutPromise ) {
        $timeout.cancel(timeoutPromise);
      }
    }

    function executeSearch() {
      searchlightSearchHelper.search(ctrl.query);
      timeoutPromise = $timeout(function rerunSearch() {
        executeSearch();
      }, timeout);
    }

    function onSearchResult(response) {
      ctrl.hits = response.hits;
    }

    function onClick() {
      ctrl.onRunSearch({query: angular.copy(ctrl.query)});
    }
  }

})();
