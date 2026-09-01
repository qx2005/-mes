(window["webpackJsonp"] = window["webpackJsonp"] || []).push([
  ["chunk-7ea63fd3"],
  {
    "1e4b": function(module, exports, __webpack_require__) {
      "use strict";

      __webpack_require__.r(exports);

      function metricCard(h, item) {
        return h("div", { staticClass: "metric-card" }, [
          h("div", { staticClass: "metric-icon", style: { color: item.color } }, [item.icon]),
          h("div", { staticClass: "metric-copy" }, [
            h("div", { staticClass: "metric-label" }, [item.label]),
            h("div", { staticClass: "metric-value" }, [
              item.value,
              h("span", { staticClass: "metric-unit", style: { color: item.color } }, [item.unit])
            ])
          ]),
          h("div", { staticClass: "metric-trend", style: { color: item.color } }, [item.trend])
        ]);
      }

      function panel(h, title, children, extraClass) {
        return h("section", { staticClass: "screen-panel " + (extraClass || "") }, [
          h("div", { staticClass: "screen-panel-title" }, [
            h("span", [title])
          ])
        ].concat(children));
      }

      function devicePanel(h) {
        var rows = [
          ["数控加工中心", "运行中", false],
          ["视觉检测工位", "运行中", false],
          ["机器人装配岛", "运行中", false],
          ["智能包装单元", "待机", true]
        ];
        return panel(h, "设备运行状态", [
          h("ul", { staticClass: "device-list" }, rows.map(function(row) {
            return h("li", { staticClass: "device-row" }, [
              h("i", { staticClass: "state-dot" + (row[2] ? " warning" : "") }),
              h("span", [row[0]]),
              h("span", { staticClass: "device-value" }, [row[1]])
            ]);
          }))
        ]);
      }

      function capacityPanel(h) {
        var items = [
          ["加工工序", "86%", "86%"],
          ["装配工序", "72%", "72%"],
          ["检测工序", "94%", "94%"]
        ];
        return panel(h, "产线负荷", [
          h("div", { staticClass: "capacity-bars" }, items.map(function(item) {
            return h("div", { staticClass: "capacity-item" }, [
              h("div", { staticClass: "capacity-head" }, [h("span", [item[0]]), h("strong", [item[1]])]),
              h("div", { staticClass: "capacity-track" }, [
                h("div", { staticClass: "capacity-fill", style: { width: item[2] } })
              ])
            ]);
          }))
        ]);
      }

      function videoStage(h, vm) {
        return h("div", { staticClass: "dashboard-video-layer" }, [
          h("video", {
            staticClass: "dashboard-video",
            class: { "is-ready": vm.videoReady },
            attrs: {
              src: "/static/video/production-line.mp4?v=20260901",
              autoplay: "",
              loop: "",
              playsinline: "",
              "webkit-playsinline": "",
              preload: "auto",
              "data-video-slot": "ue5-production-line"
            },
            domProps: { muted: true },
            on: {
              canplay: function() { vm.videoReady = true; },
              playing: function() { vm.videoReady = true; },
              error: function() { vm.videoReady = false; }
            }
          }),
          h("div", { staticClass: "video-fallback" }, [
            h("div", { staticClass: "video-stage-grid" }),
            h("div", { staticClass: "video-stage-scan" }),
            h("div", { staticClass: "factory-placeholder" }, [
              h("div", { staticClass: "factory-blueprint" }, [
                h("i", { staticClass: "factory-machine m1" }),
                h("i", { staticClass: "factory-machine m2" }),
                h("i", { staticClass: "factory-machine m3" }),
                h("i", { staticClass: "factory-machine m4" }),
                h("i", { staticClass: "factory-line" })
              ])
            ]),
            h("div", { staticClass: "video-placeholder-copy" }, [
              h("div", { staticClass: "video-placeholder-title" }, ["产线视频加载中"])
            ])
          ])
        ]);
      }

      function visualClear(h) {
        return h("section", {
          staticClass: "screen-visual-clear",
          attrs: { "aria-hidden": "true" }
        });
      }

      function oeePanel(h) {
        var details = [["开动率", "91.2%"], ["性能率", "87.6%"], ["良品率", "98.4%"]];
        return panel(h, "综合设备效率", [
          h("div", { staticClass: "oee-wrap" }, [
            h("div", { staticClass: "oee-ring" }, [
              h("div", { staticClass: "oee-value" }, ["78.6", h("small", ["%"] )])
            ]),
            h("div", { staticClass: "oee-details" }, details.map(function(item) {
              return h("div", { staticClass: "oee-detail" }, [h("span", [item[0]]), h("strong", [item[1]])]);
            }))
          ])
        ]);
      }

      function alarmPanel(h) {
        var alarms = [
          ["提醒", "包装单元等待物料", "10:32", false],
          ["告警", "装配岛扭矩偏差", "10:18", true],
          ["提醒", "刀具寿命低于20%", "09:46", false]
        ];
        return panel(h, "实时事件", [
          h("ul", { staticClass: "alarm-list" }, alarms.map(function(item) {
            return h("li", { staticClass: "alarm-row" }, [
              h("span", { staticClass: "alarm-level" + (item[3] ? " high" : "") }, [item[0]]),
              h("span", { staticClass: "alarm-name" }, [item[1]]),
              h("span", { staticClass: "alarm-time" }, [item[2]])
            ]);
          }))
        ]);
      }

      function trendPanel(h) {
        var gridLines = [25, 60, 95, 130].map(function(y) {
          return h("line", { staticClass: "trend-grid-line", attrs: { x1: "18", y1: String(y), x2: "710", y2: String(y) } });
        });
        return panel(h, "生产节拍趋势", [
          h("svg", { staticClass: "trend-chart", attrs: { viewBox: "0 0 720 150", preserveAspectRatio: "none" } }, [
            h("defs", [
              h("linearGradient", { attrs: { id: "trendArea", x1: "0", y1: "0", x2: "0", y2: "1" } }, [
                h("stop", { attrs: { offset: "0%", "stop-color": "#41c8ff", "stop-opacity": ".26" } }),
                h("stop", { attrs: { offset: "100%", "stop-color": "#41c8ff", "stop-opacity": "0" } })
              ])
            ])
          ].concat(gridLines).concat([
            h("path", { staticClass: "trend-area", attrs: { d: "M18 112 C78 106 92 70 148 78 S230 118 286 82 S372 40 430 63 S520 105 574 68 S652 43 710 50 L710 142 L18 142 Z" } }),
            h("path", { staticClass: "trend-line", attrs: { d: "M18 112 C78 106 92 70 148 78 S230 118 286 82 S372 40 430 63 S520 105 574 68 S652 43 710 50" } }),
            h("path", { staticClass: "trend-line secondary", attrs: { d: "M18 88 C82 94 100 102 148 96 S224 58 286 68 S372 105 430 92 S516 54 574 62 S650 88 710 72" } })
          ]))
        ], "trend-panel");
      }

      function orderPanel(h) {
        var orders = [
          ["MO20260831001", "精密传动组件", "76%"],
          ["MO20260831002", "智能控制模块", "54%"],
          ["MO20260831003", "工业连接器", "32%"]
        ];
        return panel(h, "在制工单", [
          h("ul", { staticClass: "order-list" }, orders.map(function(item) {
            return h("li", { staticClass: "order-row" }, [
              h("span", { staticClass: "order-code" }, [item[0]]),
              h("span", { staticClass: "order-product" }, [item[1]]),
              h("span", { staticClass: "order-progress" }, [item[2]])
            ]);
          }))
        ]);
      }

      var IndustrialDashboard = {
        name: "Index",
        data: function() {
          return {
            now: "",
            clockTimer: null,
            videoReady: false,
            metrics: [
              { icon: "▦", label: "今日计划", value: "2,400", unit: "件", trend: "计划" , color: "#41c8ff" },
              { icon: "▶", label: "当前产量", value: "1,836", unit: "件", trend: "+8.2%", color: "#2bf3d1" },
              { icon: "✓", label: "一次合格率", value: "98.6", unit: "%", trend: "+0.6%", color: "#45e39f" },
              { icon: "⚡", label: "实时能耗", value: "326", unit: "kW", trend: "-3.1%", color: "#ffb84a" }
            ]
          };
        },
        created: function() {
          var vm = this;
          vm.updateClock();
          vm.clockTimer = setInterval(function() { vm.updateClock(); }, 1000);
        },
        mounted: function() {
          this.enableImmersiveMode();
        },
        activated: function() {
          this.enableImmersiveMode();
        },
        deactivated: function() {
          this.disableImmersiveMode();
        },
        beforeDestroy: function() {
          if (this.clockTimer) clearInterval(this.clockTimer);
          this.disableImmersiveMode();
        },
        methods: {
          enableImmersiveMode: function() {
            if (typeof document === "undefined") return;
            document.body.classList.add("industrial-home-active");
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
          },
          disableImmersiveMode: function() {
            if (typeof document === "undefined") return;
            document.body.classList.remove("industrial-home-active");
            if (this._industrialHeader) {
              this._industrialHeader.classList.remove("industrial-header-hidden");
              this._industrialHeader = null;
            }
            if (this._industrialAppMain) {
              this._industrialAppMain.classList.remove("industrial-app-main-full");
              this._industrialAppMain = null;
            }
          },
          updateClock: function() {
            var date = new Date();
            function pad(value) { return value < 10 ? "0" + value : String(value); }
            this.now = date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "  " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
          }
        },
        render: function(h) {
          var vm = this;
          return h("div", { staticClass: "industrial-dashboard" }, [
            videoStage(h, vm),
            h("div", { staticClass: "screen-shell" }, [
              h("header", { staticClass: "screen-header" }, [
                h("div", { staticClass: "screen-brand" }, [
                  h("i", { staticClass: "screen-brand-mark" }),
                  h("span", ["BSQ · 智能制造"])
                ]),
                h("div", { staticClass: "screen-title-wrap" }, [
                  h("h1", { staticClass: "screen-title" }, ["智能制造生产运行中心"])
                ]),
                h("div", { staticClass: "screen-header-meta" }, [
                  h("span", { staticClass: "screen-online" }, [h("i", { staticClass: "screen-online-dot" }), "系统在线"]),
                  h("span", { staticClass: "screen-clock" }, [vm.now])
                ])
              ]),
              h("section", { staticClass: "metric-grid" }, vm.metrics.map(function(item) { return metricCard(h, item); })),
              h("main", { staticClass: "screen-main" }, [
                h("div", { staticClass: "screen-column" }, [devicePanel(h), capacityPanel(h)]),
                visualClear(h),
                h("div", { staticClass: "screen-column" }, [oeePanel(h), alarmPanel(h)])
              ]),
              h("footer", { staticClass: "screen-bottom" }, [trendPanel(h), orderPanel(h)])
            ])
          ]);
        }
      };

      exports["default"] = IndustrialDashboard;
    }
  }
]);
