/**
 * (c) Copyright 2015 Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

(function () {
  'use strict';

  /**
   * @ngdoc controller
   * @name SearchTableController
   *
   * @description
   * Controller for the search table.
   * Serves as the focal point for table actions.
   */
  angular
    .module('horizon.dashboard.project.search')
    .controller('horizon.dashboard.project.search.searchTableController', SearchTableController);

  SearchTableController.$inject = [
    '$scope',
    '$filter',
    '$q',
    '$timeout',
    'searchPluginResourceTypesFilter',
    'horizon.framework.conf.resource-type-registry.service',
    'horizon.dashboard.project.search.searchlightFacetUtils',
    'horizon.dashboard.project.search.searchlightSearchHelper',
    'horizon.dashboard.project.search.settingsService',
    'horizon.dashboard.search.search.util.cache.service'
  ];

  function SearchTableController($scope,
                                 $filter,
                                 $q,
                                 $timeout,
                                 searchPluginResourceTypesFilter,
                                 registry,
                                 searchlightFacetUtils,
                                 searchlightSearchHelper,
                                 searchSettings,
                                 cache)
  {
    var ctrl = this;
    ctrl.filter = $filter;
    ctrl.hits = [];
    ctrl.hitsSrc = [];
    ctrl.availableFacets = [];
    ctrl.excludedTypes = ['OS::Glance::Metadef'];
    ctrl.searchSettings = searchSettings;
    ctrl.defaultResourceTypes = [];
    ctrl.defaultFacets = searchlightFacetUtils.defaultFacets();
    ctrl.registry = registry;
    ctrl.refresh = searchlightSearchHelper.repeatLastSearchWithLatestSettings;
    ctrl.actionResultHandler = actionResultHandler;
    ctrl.getSearchlightKey = getSearchlightKey;

    var adHocPollInterval = 500;
    var adHocPollDuration = 5000;

    var deregisterCurrentFacetsWatch = $scope.$watch(function currentFacetsWatch(scope) {
      return scope.ctrl.currentSearchFacets;
    }, function queryWatchHandler( newValue, oldValue, scope) {
      if ( newValue != oldValue ) {
        onServerSearchUpdated({
          magicSearchQueryChanged: true,
          magicSearchQuery: newValue
        });
      }
    }, true);

    var deregisterCurrentTextWatch = $scope.$watch(function currentTextWatch(scope) {
      return scope.ctrl.currentSearchText;
    }, function queryWatchHandler( newValue, oldValue, scope) {
      if ( newValue != oldValue ) {
        onServerSearchUpdated({
          queryStringChanged: true,
          queryString: newValue
        });
      }
    }, true);

    init();

    ////////////////////////////////

    function init() {
      ctrl.searchSettings.initScope($scope);
      ctrl.searchSettings.initPlugins().then(pluginsUpdated);

      if (searchlightSearchHelper.lastSearchQueryOptions) {
        ctrl.availableFacets = searchlightSearchHelper.lastSearchQueryOptions.searchFacets;
        if (searchlightSearchHelper.lastSearchQueryOptions.queryString) {
          ctrl.query = searchlightSearchHelper.lastSearchQueryOptions.queryString;
        }
      } else {
        ctrl.availableFacets = ctrl.defaultFacets;
      }
    }

    function pluginsUpdated(plugins) {
      var pluginToTypesOptions = {
        excludedTypes: ctrl.excludedTypes,
        flatten: true
      };
      ctrl.defaultResourceTypes = searchPluginResourceTypesFilter(plugins, pluginToTypesOptions);

      ctrl.defaultResourceTypes.forEach(function(type) {
        registry.initActions(type, $scope);
      });

      searchlightFacetUtils.setTypeFacetFromResourceTypes(
        ctrl.defaultResourceTypes, ctrl.availableFacets);

      if (searchlightSearchHelper.lastSearchQueryOptions) {
        searchlightSearchHelper.lastSearchQueryOptions.onSearchSuccess = onSearchResult;
        searchlightSearchHelper.lastSearchQueryOptions.onSearchError = onSearchResult;
        searchlightSearchHelper.repeatLastSearchWithLatestSettings();
      } else {
        search();
      }
    }

    var fullTextSearchTimeout;
    var searchUpdatedWatcher = $scope.$on('serverSearchUpdated', function(event, searchData) {
      onServerSearchUpdated(searchData);
    });

    function onServerSearchUpdated(searchData) {

      function performSearch() {
        fullTextSearchTimeout = null;
        search(searchData);
      }

      if (searchData.queryStringChanged) {
        // This keeps the query from being executed too rapidly
        // when the user is performing rapid key presses.
        if (fullTextSearchTimeout) {
          $timeout.cancel(fullTextSearchTimeout);
        }

        fullTextSearchTimeout = $timeout(
          performSearch,
          ctrl.searchSettings.settings.fullTextSearch.delayInMS
        );
      } else if (searchData.magicSearchQueryChanged) {
        performSearch();
      }
    }

    var checkFacetsWatcher = $scope.$on('checkFacets', function (event, selectedFacets) {
      //Facets are actually DOM elements. This affects the styling.
      $timeout(function () {
        angular.forEach(selectedFacets, function setIsServerTrue(facet) {
          facet.isServer = true;
        });
      });
    });

    var searchSettingsUpdatedWatcher = $scope.$on(
      ctrl.searchSettings.events.settingsUpdatedEvent,
      searchlightSearchHelper.repeatLastSearchWithLatestSettings
    );

    $scope.$on('$destroy', function cleanupListeners() {
      searchlightSearchHelper.stopSearchPolling();
      checkFacetsWatcher();
      searchUpdatedWatcher();
      searchSettingsUpdatedWatcher();
      deregisterCurrentFacetsWatch();
      deregisterCurrentTextWatch();
    });

    function search(queryOptions) {
      queryOptions = queryOptions || {};
      queryOptions.allFacetDefinitions = ctrl.availableFacets;
      queryOptions.searchFacets = ctrl.availableFacets;
      queryOptions.defaultResourceTypes = ctrl.defaultResourceTypes;
      queryOptions.onSearchSuccess = onSearchResult;
      queryOptions.onSearchError = onSearchResult;

      return searchlightSearchHelper.search(queryOptions);
    }

    function onSearchResult(response) {

      cache.clean(adHocPollDuration * 3);
      ctrl.hitsSrc = response.hits.map(syncWithCache).filter(removeDeletedItems);
      ctrl.queryResponse = response;
    }

    function syncWithCache(searchlight_item) {
      return cache.sync(searchlight_item, searchlight_item._id, getSearchlightTimestamp(searchlight_item));
    }

    function removeDeletedItems(searchlight_item) {
      if ( searchlight_item.deleted ) {
        return false;
      } else {
        return true;
      }
    }

    function actionResultHandler(returnValue) {
      return $q.when(returnValue, actionSuccessHandler, actionErrorHandler);
    }

    /*
    function repeatUntilChangedResults() {
      // For now, all we can do is poll for a period of time.
      searchlightSearchHelper.startAdHocPolling(adHocPollInterval, adHocPollDuration);
    }
    */

    function actionSuccessHandler(result) {

      // For now, always poll for 5 seconds after every action. This is not
      // needed with default polling enabled.
      //repeatUntilChangedResults();

      // The action has completed (for whatever "complete" means to that
      // action. Notice the view doesn't really need to know the semantics of the
      // particular action because the actions return data in a standard form.
      // That return includes the id and type of each created, updated, deleted
      // and failed item.
      //
      // This handler is also careful to check the type of each item. This
      // is important because actions which create non-images are launched from
      // the images page (like create "volume" from image).
      var deletedIds, updatedIds, createdIds, failedIds;

      if ( result ) {
        // Reduce the results to just image ids ignoring other types the action
        // may have produced
        deletedIds = getIdsOfType(result.deleted, undefined);
        updatedIds = getIdsOfType(result.updated, undefined);
        createdIds = getIdsOfType(result.created, undefined);
        failedIds = getIdsOfType(result.failed, undefined);

        addItemsToCache(deletedIds, true);
        addItemsToCache(updatedIds);
        addItemsToCache(createdIds);

        // Handle deleted images
        if (deletedIds.length) {
          // Do nothing for now
        }

        // Handle updated and created images
        if ( updatedIds.length || createdIds.length ) {
        }

        // Handle failed images
        if ( failedIds ) {
          // Do nothing for now
        }

      } else {
        // promise resolved, but no result returned. Because the action didn't
        // tell us what happened...reload the displayed items just in case.
      }
    }

    function addItemsToCache(ids, deleted) {
      var searchlight_item;
      ids.forEach(function addToCache(id) {
        var index = ctrl.hitsSrc.findIndex(function findItemWithId(item) {
          if (item._source.id === id) {
            return item;
          }
        });
        if ( index >= 0 ) {
          var searchlight_item = ctrl.hitsSrc[index];
          if ( deleted ) {
            ctrl.hitsSrc.splice(index,1);
          }
          if ( searchlight_item ) {
            searchlight_item.dirty = true;
            searchlight_item.deleted = deleted;
            cache.add(searchlight_item, searchlight_item._id, getSearchlightTimestamp(searchlight_item));
          }
        }
      });
    }

    function actionErrorHandler(reason) { // eslint-disable-line no-unused-vars
      // Action has failed. Do nothing.
    }

    function getIdsOfType(items, type) {
      var result;
      function typeIdReduce(accumulator, item) {
        if (type === undefined || item.type === type) {
          accumulator.push(item.id);
        }
        return accumulator;
      }

      if ( items ) {
        result = items.reduce(typeIdReduce, []);
      } else {
        result = [];
      }

      return result;
    }

    function getSearchlightTimestamp(searchlight_item) {
      var timestamp = '';

      if (searchlight_item._version) {
        timestamp = searchlight_item._version;
      } else if (searchlight_item._source.updated_at) {
        timestamp = searchlight_item._source.updated_at;
      } else if (searchlight_item._source.created_at) {
        timestamp = searchlight_item._source.created_at;
      }
      return timestamp;
    }

    function getSearchlightKey(searchlight_item) {
      return searchlight_item._id + getSearchlightTimestamp(searchlight_item);
    };
  }

})();
