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
          ["待审核", "3", "12%", "blue"],
          ["待排产", "7", "28%", "orange"],
          ["生产中", "15", "60%", "cyan"],
          ["今日完工", "18", "72%", "green"]
        ];
        return panel(h, "订单执行概览", [
          h("div", { staticClass: "order-overview" }, rows.map(function(row) {
            return h("div", { staticClass: "overview-row" }, [
              h("div", { staticClass: "overview-head" }, [
                h("span", { staticClass: "overview-stage" }, [row[0]]),
                h("strong", { staticClass: "overview-count" }, [row[1], h("small", ["单"])])
              ]),
              h("div", { staticClass: "overview-track" }, [
                h("i", { staticClass: "overview-fill " + row[3], style: { width: row[2] } })
              ])
            ]);
          }))
        ]);
      }

      function capacityPanel(h) {
        var items = [
          ["一号装配线", "92%", "3个工单", "92%", "high"],
          ["二号装配线", "78%", "2个工单", "78%", ""],
          ["三号包装线", "64%", "2个工单", "64%", ""]
        ];
        return panel(h, "今日排产负荷", [
          h("div", { staticClass: "capacity-bars" }, items.map(function(item) {
            return h("div", { staticClass: "capacity-item" }, [
              h("div", { staticClass: "capacity-head" }, [
                h("span", [item[0]]),
                h("em", [item[2]]),
                h("strong", [item[1]])
              ]),
              h("div", { staticClass: "capacity-track" }, [
                h("div", { staticClass: "capacity-fill " + item[4], style: { width: item[3] } })
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
              src: "/static/video/production-line-145620.mp4?v=20260901-145620",
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
        var schedules = [
          ["08:00–10:30", "MO260901-001", "精密传动组件", "已完工", "done"],
          ["10:40–14:00", "MO260901-002", "智能控制模块", "生产中", "active"],
          ["14:10–18:00", "MO260901-003", "工业连接器", "待开工", "waiting"]
        ];
        return panel(h, "今日排产进度", [
          h("div", { staticClass: "schedule-list" }, schedules.map(function(item) {
            return h("div", { staticClass: "schedule-row " + item[4] }, [
              h("time", { staticClass: "schedule-time" }, [item[0]]),
              h("div", { staticClass: "schedule-copy" }, [
                h("strong", [item[1]]),
                h("span", [item[2]])
              ]),
              h("span", { staticClass: "schedule-status" }, [item[3]])
            ]);
          }))
        ]);
      }

      function alarmPanel(h) {
        var risks = [
          ["缺料", "MO260901-003", "连接器端子尚缺240件", "需处理", true],
          ["交期", "SO260831-018", "距承诺交期不足8小时", "关注", false],
          ["质量", "MO260901-002", "首件检验等待确认", "待确认", false]
        ];
        return panel(h, "交付与齐套风险", [
          h("ul", { staticClass: "risk-list" }, risks.map(function(item) {
            return h("li", { staticClass: "risk-row" }, [
              h("span", { staticClass: "risk-type" + (item[4] ? " high" : "") }, [item[0]]),
              h("div", { staticClass: "risk-copy" }, [h("strong", [item[1]]), h("span", [item[2]])]),
              h("span", { staticClass: "risk-action" }, [item[3]])
            ]);
          }))
        ]);
      }

      function trendPanel(h) {
        var gridLines = [25, 60, 95, 130].map(function(y) {
          return h("line", { staticClass: "trend-grid-line", attrs: { x1: "18", y1: String(y), x2: "710", y2: String(y) } });
        });
        return panel(h, "计划与实际产出", [
          h("div", { staticClass: "trend-summary" }, [
            h("span", [h("i", { staticClass: "legend-dot" }), "计划产出"]),
            h("span", [h("i", { staticClass: "legend-dot green" }), "实际产出"]),
            h("strong", ["当前差额 -184件"])
          ]),
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
          ["MO260901-001", "精密传动组件", "800/800", "已完工", "done"],
          ["MO260901-002", "智能控制模块", "612/900", "生产中", "active"],
          ["MO260901-003", "工业连接器", "0/700", "待开工", "waiting"]
        ];
        return panel(h, "工单执行", [
          h("ul", { staticClass: "order-list order-execution" }, orders.map(function(item) {
            return h("li", { staticClass: "order-row " + item[4] }, [
              h("span", { staticClass: "order-code" }, [item[0]]),
              h("span", { staticClass: "order-product" }, [item[1]]),
              h("span", { staticClass: "order-quantity" }, [item[2]]),
              h("span", { staticClass: "order-progress" }, [item[3]])
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
              { icon: "订", label: "今日接单", value: "26", unit: "单", trend: "较昨日 +6", color: "#41c8ff" },
              { icon: "排", label: "待排产订单", value: "7", unit: "单", trend: "2单临期", color: "#ffb84a" },
              { icon: "产", label: "今日计划产量", value: "2,400", unit: "件", trend: "3条产线", color: "#2bf3d1" },
              { icon: "达", label: "预计准交率", value: "96.8", unit: "%", trend: "目标 ≥95%", color: "#45e39f" }
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
                  h("i", { staticClass: "screen-brand-mark beer-can-mark" }),
                  h("span", { staticClass: "screen-brand-copy" }, [
                    h("strong", ["啤酒智能罐装"]),
                    h("small", ["柔性排产中心"])
                  ])
                ]),
                h("div", { staticClass: "screen-title-wrap" }, [
                  h("h1", { staticClass: "screen-title" }, ["订单与生产协同中心"])
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
