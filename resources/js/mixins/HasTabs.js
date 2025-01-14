import {parseLocationHash, updateLocationHash} from "../utils/hash";
import orderBy from "lodash/orderBy";
import { uid } from 'uid/single'

export default {

  props: {
    shownViaNewRelationModal: {
      type: Boolean,
      default: false,
    },
    panel: {
      type: Object,
      required: true,
    },
    name: {
      default: 'Panel',
    },
    mode: {
      type: String,
      default: 'form',
    },
    fields: {
      type: Array,
      default: [],
    },
    formUniqueId: {
      type: String,
      required: false
    },
    validationErrors: {
      type: Object,
      required: false,
    },
    resourceName: {
      type: String,
      required: true,
    },
    resourceId: {
      type: [Number, String],
    },
    relatedResourceName: {
      type: String,
    },
    relatedResourceId: {
      type: [Number, String],
    },
    viaResource: {
      type: String,
    },
    viaResourceId: {
      type: [Number, String],
    },
    viaRelationship: {
      type: String,
    },
  },

  data() {
    return {
      tabs: null,
      activeTab: '',
      selectedTab: {},
      darkModeClass: '',
      relationFormUniqueId: '',
      errors: this.validationErrors
    };
  },

  emits: [
    'field-changed',
    'update-last-retrieved-at-timestamp',
    'file-upload-started',
    'file-upload-finished',
  ],

  /**
   * Get the tabs and their respective fields when mounted
   * and show the first tab by default.
   */
  mounted() {

    this.setObservers();
    this.darkModeClass = document.documentElement.classList.contains('dark') ? 'tabs-dark' : '';

    const tabs = this.tabs = this.setTabs();
    const routeTabs = parseLocationHash();
    const currentTabSlug = routeTabs[this.panel.name];

    if (tabs[currentTabSlug]) {
      this.handleTabClick(tabs[currentTabSlug])
    } else {
      this.handleTabClick(tabs[Object.keys(tabs)[0]], true);
    }

  },

  methods: {

    /**
     * Set Tabs
     * @returns Tabs Object
     */
    setTabs() {
      return this.panel.fields.reduce((tabs, field) => {
        if (!(field.tabSlug in tabs)) {
          tabs[field.tabSlug] = {
            name: field.tab,
            slug: field.tabSlug,
            position: field.tabPosition,
            init: false,
            listable: field.listableTab,
            fields: [],
            properties: field.tabInfo,
            classes: 'fields-tab',
          };
          if (['belongs-to-many-field', 'has-many-field', 'has-many-through-field', 'has-one-through-field', 'morph-to-many-field',].includes(field.component)) {
            tabs[field.tabSlug].classes = 'relationship-tab';
          }
        }
        tabs[field.tabSlug].fields.push(field);
        return tabs;
      }, {});
    },

    /**
     * Set Observers
     * @returns void
     */
    setObservers() {
      this.observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          const newValue = m.target.getAttribute(m.attributeName);
          this.$nextTick(() => {
            this.darkModeClass = newValue.includes('dark') ? 'tabs-dark' : ''
          });
        }
      });

      this.observer.observe(document.documentElement, {
        attributes: true,
        attributeOldValue : true,
        attributeFilter: ['class'],
      });
    },

    /**
     * Get the resource ID we pass on to the field component
     *
     * @param field
     * @returns {Number|String|*}
     */
    getResourceId(field) {
      if (field.relationshipType === 'hasOne') {
        return field.hasOneId
      }

      if (field.relationshipType === 'morphOne') {
        return field.hasOneId
      }

      return this.resourceId;
    },

    /**
     * Handle tabs being clicked
     *
     * @param tab
     * @param updateUri
     */
    handleTabClick(tab, updateUri = true, refreshCodeMirror = true) {
      this.selectedTab = tab;

      if (updateUri) {
        this.setLocationHash()
      }

      if (refreshCodeMirror) {
        this.refreshCodeMirror(tab);
      }
    },

    refreshCodeMirror(tab) {
      setTimeout(() => {
        const tabRef = this.getTabRefName(tab);
        if (!tabRef) return;

        let refs = this.$refs[tabRef];
        if (!refs.length) return;

        refs.forEach(ref => {
          const cmList = ref.querySelectorAll('.CodeMirror');
          if (!cmList.length) return;

          cmList.forEach(cm => cm.CodeMirror.refresh());
        });
      }, 1);
    },

    /**
     * Update the location hash to persist route state
     */
    setLocationHash() {
      const routeTabs = parseLocationHash()
      routeTabs[this.panel.name] = this.selectedTab.slug
      updateLocationHash(routeTabs)
    },

    /**
     * Get the component name.
     *
     * @param field
     * @returns {string}
     */
    getComponentName(field) {
      return field.prefixComponent
        ? this.mode + '-' + field.component
        : field.component
    },

    /**
     * Get body class for tabbed field panel
     *
     * @param tab
     * @returns {string}
     */
    getBodyClass(tab) {
      return tab.properties.bodyClass;
    },

    /**
     * Get reference name for tab
     *
     * @param tab
     * @returns {string}
     */
    getTabRefName(tab) {
      return `tab-${tab.slug}`;
    },

    /**
     * Check if the specified tab is the current opened one
     *
     * @param tab
     * @returns {boolean}
     */
    getIsTabCurrent(tab) {
      return this.selectedTab === tab || (!this.selectedTab && this.tabs[Object.keys(this.tabs)[0]] === tab)
    },

    /**
     * Sort the tabs object by their respective positions using lodash
     *
     * @param tabs
     * @returns {object}
     */
    getSortedTabs(tabs) {
      return orderBy(tabs, [c => c.position], ['asc']);
    }

  },

  beforeDestroy() {
    this.observer.disconnect();
  },

}
