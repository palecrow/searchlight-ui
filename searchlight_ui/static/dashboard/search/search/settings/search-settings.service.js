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

  angular
    .module('horizon.dashboard.project.search')
    .factory('horizon.dashboard.project.search.settingsService', searchSettingsService);

  searchSettingsService.$inject = [
    '$modal',
    '$q',
    'horizon.dashboard.project.search.basePath',
    'horizon.app.core.openstack-service-api.searchlight'
  ];

  /**
   * @ngDoc factory
   * @name horizon.dashboard.project.search.settingsService
   *
   * @Description
   * Provides general search settings and a modal for updating the settings.
   *
   * @param {function} $modal ng $modal service
   *
   * @param {function} basePath the base url path
   *
   * @param {function} searchlight searchlight API service
   *
   * @returns {function} This settings service.
   */
  function searchSettingsService($modal,
                                 $q,
                                 basePath,
                                 searchlight)
  {
    var service = {
      getPlugins: getPlugins,
      open: open,
      settings: {
        pluginsInitialized: false,
        availablePlugins: [],
        fullTextSearch: {
          delayInMS: 400,
          phrase_slop: 10,
          lenient: true,
          analyze_wildCard: true
        },
        general: {
          all_projects: false,
          all_projects_policy: { rules: [["search", "search:all_projects:allow"]] },
          limit: 50,
          limit_max: 500,
          limit_min: 5
        },
        highlighting: {
          enabled: true,
          config: {
            fields: {
              "*": {}
            },
            pre_tags: ["<mark>"],
            post_tags: ["</mark>"]
          }
        },
        polling: {
          enabled: true,
          interval: 10, //seconds
          interval_min: 1,
          interval_max: 300,
          policy: { rules: [["search", "search:user_polling:allow"]] }
        }
      }
    };

    return service;

    //////////////

    function getPlugins() {
      var result;
      if ( !service.settings.pluginsInitialized ) {
        result = searchlight.getPlugins().then(pluginsReceived);
      } else {
        result = service.settings.availablePlugins;
      }

      return $q.when(result);
    }

    function pluginsReceived(response) {
      service.settings.pluginsInitialized = true;
      service.settings.availablePlugins = response.data.plugins;
      return response.data.plugins;
    }

    function open() {
      var editableSettings = angular.copy(service.settings);

      function getSearchSettings() {
        return editableSettings;
      }

      var options = {
        controller: 'searchSettingsController as ctrl',
        scope: scope,
        backdrop: 'static',
        templateUrl: basePath + 'settings/search-settings.html',
        resolve: {
          searchSettings: getSearchSettings
        }
      };

      return $modal.open(options)
        .result
        .then(updateSettingsAndNotify);

      function updateSettingsAndNotify() {
        service.settings = angular.copy(editableSettings);
        return service.settings;
      }
    }

  }
})();
