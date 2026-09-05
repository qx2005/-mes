(window["webpackJsonp"] = window["webpackJsonp"] || []).push([
  ["chunk-7ea63fd3"],
  {
    "1e4b": function(module, exports, __webpack_require__) {
      "use strict";
      __webpack_require__.r(exports);

      var DATAEASE_PORT = "8081";
      var DATAEASE_SCREEN_ID = "1125031921315876864";
      var DATAEASE_SSO_VALUE = "admin-DataEase@123456-t";

      function buildDataEaseUrl() {
        var host = window.location.hostname || "127.0.0.1";
        var token = window.btoa(DATAEASE_SSO_VALUE).replace(/=+$/, "");
        return "http://" + host + ":" + DATAEASE_PORT + "/?t=" + token +
          "#/preview?dvId=" + DATAEASE_SCREEN_ID + "&emptyDataRefresh=20260905";
      }

      var DataEaseDashboard = {
        name: "Index",
        data: function() {
          return { dashboardUrl: buildDataEaseUrl(), loading: true, loadFailed: false };
        },
        mounted: function() {
          this.ensureSidebarExpanded();
          this.enableImmersiveMode();
        },
        activated: function() {
          this.ensureSidebarExpanded();
          this.enableImmersiveMode();
        },
        deactivated: function() { this.disableImmersiveMode(); },
        beforeDestroy: function() { this.disableImmersiveMode(); },
        methods: {
          ensureSidebarExpanded: function() {
            var app = this.$store && this.$store.state && this.$store.state.app;
            if (app && app.sidebar && !app.sidebar.opened) {
              this.$store.dispatch("app/toggleSideBar");
            }
          },
          enableImmersiveMode: function() {
            if (typeof document === "undefined") return;
            document.body.classList.add("industrial-home-active", "dataease-home-active");
            var appMain = document.querySelector(".main-container .app-main");
            var header = appMain ? appMain.previousElementSibling : null;
            if (header) {
              header.classList.add("industrial-header-hidden");
              this._industrialHeader = header;
            }
            if (appMain) {
              appMain.classList.add("industrial-app-main-full");
              this._industrialAppMain = appMain;
            }
            var themeLink = document.querySelector('link[href*="mes-carbon-theme.css"]');
            if (themeLink && this._industrialThemeLink !== themeLink) {
              this._industrialThemeWasDisabled = themeLink.disabled;
              themeLink.disabled = true;
              this._industrialThemeLink = themeLink;
            }
          },
          disableImmersiveMode: function() {
            if (typeof document === "undefined") return;
            document.body.classList.remove("industrial-home-active", "dataease-home-active");
            if (this._industrialHeader) {
              this._industrialHeader.classList.remove("industrial-header-hidden");
              this._industrialHeader = null;
            }
            if (this._industrialAppMain) {
              this._industrialAppMain.classList.remove("industrial-app-main-full");
              this._industrialAppMain = null;
            }
            if (this._industrialThemeLink) {
              this._industrialThemeLink.disabled = !!this._industrialThemeWasDisabled;
              this._industrialThemeLink = null;
              this._industrialThemeWasDisabled = null;
            }
          },
          onDashboardLoaded: function() {
            this.loading = false;
            this.loadFailed = false;
          },
          onDashboardError: function() {
            this.loading = false;
            this.loadFailed = true;
          },
          reloadDashboard: function() {
            this.loading = true;
            this.loadFailed = false;
            this.dashboardUrl = buildDataEaseUrl() + "&reload=" + Date.now();
          }
        },
        render: function(h) {
          var vm = this;
          var children = [h("iframe", {
            key: vm.dashboardUrl,
            staticClass: "dataease-dashboard-frame",
            attrs: {
              src: vm.dashboardUrl,
              title: "罐装产线-生产管理数据大屏",
              frameborder: "0",
              allowfullscreen: "allowfullscreen"
            },
            on: { load: vm.onDashboardLoaded, error: vm.onDashboardError }
          })];

          if (vm.loading) {
            children.push(h("div", { staticClass: "dataease-dashboard-state" }, [
              h("span", { staticClass: "dataease-dashboard-spinner" }),
              h("span", ["正在连接生产管理数据大屏…"])
            ]));
          }
          if (vm.loadFailed) {
            children.push(h("div", { staticClass: "dataease-dashboard-state is-error" }, [
              h("span", ["数据大屏服务暂时无法访问，请确认 DataEase 服务已启动。"]),
              h("button", { on: { click: vm.reloadDashboard } }, ["重新加载"])
            ]));
          }
          return h("div", { staticClass: "dataease-dashboard-home" }, children);
        }
      };

      exports["default"] = DataEaseDashboard;
    }
  }
]);
