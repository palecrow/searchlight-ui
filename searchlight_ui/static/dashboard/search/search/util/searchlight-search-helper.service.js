/**
 * Copyright 2015, Hewlett-Packard Development Company, L.P.
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

(function () {
  'use strict';

  angular
    .module('horizon.dashboard.project.search')
    .factory('horizon.dashboard.project.search.searchlightSearchHelper', SearchlightSearchHelper);

  SearchlightSearchHelper.$inject = [
    '$interval',
    '$timeout',
    'horizon.dashboard.project.search.searchlightFacetUtils',
    'horizon.dashboard.project.search.searchlightQueryGenerator',
    'horizon.app.core.openstack-service-api.searchlight',
    'horizon.dashboard.project.search.settingsService'
  ];

  /**
   * @ngdoc service
   * @name horizon.dashboard.project.search.searchlightSearchHelper
   * @description Search helper - one layer above the search API for no apparent reason.
   *
   * @param {function} $interval $interval
   *
   * @param {function} $timeout $timeout
   *
   * @param {function} searchlightFacetUtils searchlightFacetUtils
   *
   * @param {function} searchlightQueryGenerator searchlightQueryGenerator
   *
   * @param {function} searchlight searchlight API
   *
   * @param {function} settingsService settings service
   *
   * @returns {function} This service
   */
  function SearchlightSearchHelper($interval,
                                   $timeout,
                                   searchlightFacetUtils,
                                   searchlightQueryGenerator,
                                   searchlight,
                                   settingsService)
  {

    var service = {
      lastSearchQueryOptions: null,
      repeatLastSearch: repeatLastSearch,
      search: search,
      stopSearchPolling: stopSearchPolling,
      setResultCallback: setResultCallback
    };

    var settingsPollster = null;
    var resultCallback = angular.noop;

    return service;

    //////////////////

    function repeatLastSearch() {
      search(service.lastSearchQueryOptions);
    }

    function search(queryOptions) {
      // We just always will reset the next poll interval to
      // come after the latest search no matter what the
      // cause of the current search was.
      stopSearchPolling();

      // Save the last search so it can be repeated later.
      service.lastSearchQueryOptions = queryOptions;

      var searchlightQuery = searchlightQueryGenerator.generate(queryOptions);

      if (queryOptions.searchFacets) {
        searchlightFacetUtils.updateResourceTypeFacets(
          searchlightQuery.type, queryOptions.searchFacets);
      }

      if (!searchlightQuery.type) {
        searchlightQuery.type = queryOptions.defaultResourceTypes;
      }

      searchlight
        .postSearch(searchlightQuery, true)
        .success(decoratedSearchSuccess)
        .error(decoratedSearchError);

      function decoratedSearchSuccess(response) {
        if (settingsService.settings.polling.enabled) {
          settingsPollster = $timeout(
            repeatLastSearch, settingsService.settings.polling.interval * 1000);
        }

        angular.forEach(response.hits, function (hit) {
          //This sets up common fields that sometimes differ across projects.
          hit._source.project_id = hit._source.project_id ||
            hit._source._tenant_id || hit._source.owner;
          hit._source.updated_at = hit._source.updated_at || hit._source.created_at;
        });

        resultCallback(response);
      }

      function decoratedSearchError(data, statusCode) {
        var result = {
          hits: [],
          error: true,
          data: data,
          statusCode: statusCode
        };
        resultCallback(result);
      }
    }

    function stopSearchPolling() {
      if (settingsPollster !== null) {
        $timeout.cancel(settingsPollster);
        settingsPollster = null;
      }
    }

    function setResultCallback(callback) {
      resultCallback = callback || angular.noop;
    }
  }
})();
