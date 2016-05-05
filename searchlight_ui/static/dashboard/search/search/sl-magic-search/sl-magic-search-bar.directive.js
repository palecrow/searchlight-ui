/*
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
    .module('searchlight-ui.dashboard.search.search.sl-magic-search')
    .directive('slMagicSearchBar', slMagicSearchBar);

  slMagicSearchBar.$inject = ['searchlight-ui.dashboard.search.search.basePath'];

  /**
   * @ngdoc directive
   * @name MagicSearch.directive:hzMagicSearchBar
   * @element
   * @param {object} filterFacets Facets allowed for searching
   * @param {object=} filterStrings Help content shown in search bar
   * @param {object=} clientFullTextSearch if full text search is to be done on the client
   * @description
   * The `magicSearchBar` directive provides a template for a
   * client side faceted search that utilizes Smart-Table's
   * filtering capabilities as well.
   *
   * Facets:
   * ```
   * var nameFacet = {
   *   label: gettext('Name'),
   *   name: 'name',
   *   singleton: true
   * };
   *
   * var sizeFacet = {
   *   label: gettext('Size'),
   *   name: 'size',
   *   singleton: false,
   *   options: [
   *     { label: gettext('Small'), key: 'small' },
   *     { label: gettext('Medium'), key: 'medium' },
   *     { label: gettext('Large'), key: 'large' },
   *   ]
   * };
   *
   * label - this is the text shown in top level facet dropdown menu
   * name - this is the column key provided to Smart-Table
   * singleton - 'true' if free text can be used as search term
   * options - list of options shown in selected facet dropdown menu
   * ```
   *
   * @restrict E
   * @scope
   *
   * @example
   * ```
   * <hz-magic-search-bar
   *   filter-facets="filterFacets"
   *   filter-strings="filterStrings">
   * </hz-magic-search-bar>
   *
   * or
   *
   * <hz-magic-search-bar
   *   filter-facets="filterFacets">
   * </hz-magic-search-bar>
   *
   * or
   *
   * <hz-magic-search-bar
   *   client-full-text-search="false"
   *   filter-strings="filterStrings">
   * </hz-magic-search-bar>
   * ```
   */
  function slMagicSearchBar(basePath) {

    var directive = {
      restrict: 'E',
      scope: {
        filterStrings: '=?',
        clientFullTextSearch: '=?',
        availableFacets: '=',
        currentSearchText: '=',
        currentSearchFacets: '='
      },
      templateUrl: basePath + 'sl-magic-search/magic-search-bar.html',
      controller: "searchlight-ui.dashboard.search.search.sl-magic-search.MagicSearchBarController as ctrl",
      bindToController: true
    };

    return directive;

  }

})();
