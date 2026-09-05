<template>
  <div class="app-container production-order-panel">
    <div v-loading="loading" class="custom-product-container">
      <div class="product-panel-header">
        <div class="product-panel-heading">
          <div>
            <h3 class="product-panel-title">{{ title }}</h3>
            <p class="product-panel-desc">{{ description }}</p>
          </div>
          <div class="schedule-status"><i class="el-icon-success" /> 排产引擎在线</div>
        </div>
      </div>
      <div class="schedule-summary">
        <span><i class="el-icon-refresh" /> 多品类快速切换</span>
        <span><i class="el-icon-s-data" /> 订单需求自动匹配</span>
        <span><i class="el-icon-lightning" /> 生产指令实时下发</span>
      </div>
      <div class="image-group">
        <div v-for="(item, index) in productList" :key="item.id || index"
          class="product-image product-image--selectable"
          :class="{ 'is-selected': selectedProductIndex === index }"
          @click="selectProduct(index)">
          <el-image class="img-preview1" :src="resolveProductSrc(item)" :alt="item.name" fit="contain">
            <div slot="error" class="image-placeholder"><i class="el-icon-picture-outline" /></div>
          </el-image>
          <p class="image-desc">{{ item.name }}</p>
        </div>
      </div>
      <div class="scheduling-workbench">
        <div class="scheduling-config">
          <div class="workbench-title">
            <div><i class="el-icon-setting" /> 排产参数</div>
            <span>调整参数后生成可执行方案</span>
          </div>
          <el-form :model="schedulingForm" size="small" label-position="top" class="scheduling-config__form">
            <el-form-item label="期望交付时间">
              <el-date-picker v-model="schedulingForm.deadline" type="date" value-format="yyyy-MM-dd"
                placeholder="选择交期" :picker-options="deadlinePickerOptions" disabled @change="resetSchedule" />
            </el-form-item>
            <el-form-item label="订单优先级">
              <el-radio-group v-model="schedulingForm.priority" @change="resetSchedule">
                <el-radio-button label="normal">常规</el-radio-button>
                <el-radio-button label="urgent">加急</el-radio-button>
                <el-radio-button label="critical">插单</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="优化策略">
              <el-select v-model="schedulingForm.strategy" @change="resetSchedule">
                <el-option label="产能均衡优先" value="balanced" />
                <el-option label="最早交付优先" value="delivery" />
                <el-option label="减少换型优先" value="changeover" />
              </el-select>
            </el-form-item>
            <el-form-item label="产线分配">
              <el-select v-model="schedulingForm.lineMode" @change="resetSchedule">
                <el-option label="系统智能匹配" value="auto" />
                <el-option label="柔性灌装线 A" value="line-a" />
                <el-option label="柔性灌装线 B" value="line-b" />
                <el-option label="柔性灌装线 C" value="line-c" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        <div class="schedule-preview" :class="{ 'is-generated': scheduleGenerated, 'is-calculating': scheduleCalculating }">
          <div class="workbench-title">
            <div><i class="el-icon-data-analysis" /> 方案预览</div>
            <span v-if="scheduleGenerated" class="preview-ready"><i class="el-icon-circle-check" /> 已生成</span>
            <span v-else-if="scheduleCalculating" class="preview-calculating">正在计算 {{ scheduleProgress }}%</span>
            <span v-else>等待参数确认</span>
          </div>
          <div v-if="!scheduleGenerated && !scheduleCalculating" class="schedule-preview__empty">
            <i class="el-icon-s-grid" />
            <p>设置排产参数后，点击“生成排产方案”</p>
            <span>系统将结合工单、交期与产线负载生成推荐方案</span>
          </div>
          <div v-else class="schedule-preview__result">
            <div class="preview-result-head">
              <div><span>方案编号</span><strong>{{ schedulePreview.planCode }}</strong></div>
              <span class="feasibility-tag">可执行 · 匹配度 {{ schedulePreview.score }}% · 产线负载 {{ schedulePreview.load }}%</span>
            </div>
            <div class="preview-metrics">
              <div><span>匹配工单</span><strong>{{ schedulePreview.workorderCode }}</strong></div>
              <div><span>推荐产线</span><strong>{{ schedulePreview.line }}</strong></div>
              <div><span>预计开始</span><strong>{{ schedulePreview.startTime }}</strong></div>
              <div><span>预计完成</span><strong>{{ schedulePreview.endTime }}</strong></div>
            </div>
            <div class="capacity-row">
              <span>方案生成进度</span>
              <el-progress :percentage="scheduleProgress" :stroke-width="8" :show-text="false" />
              <strong>{{ scheduleProgress }}%</strong>
            </div>
            <p class="preview-note"><i class="el-icon-info" /> {{ schedulePreview.reason }}</p>
          </div>
        </div>
      </div>
      <div class="action-group">
        <div class="action-group__info">
          <span class="action-group__label">当前排产品类</span>
          <strong class="action-group__value">{{ productList[selectedProductIndex].name }}</strong>
        </div>
        <div class="action-group__form">
          <el-form ref="orderForm" :model="orderForm" size="small" inline>
            <el-form-item>
              <el-button class="schedule-generate-button" icon="el-icon-cpu" size="medium"
                :loading="scheduleCalculating" :disabled="scheduleCalculating" @click="generateScheduleFromForm">{{ scheduleCalculating ? '方案计算中 ' + scheduleProgress + '%' : (scheduleGenerated ? '重新生成方案' : '生成排产方案') }}</el-button>
              <el-button class="schedule-confirm-button" type="primary" icon="el-icon-s-promotion" size="medium"
                :loading="submitting" :disabled="!scheduleGenerated || scheduleCalculating" @click="submitOrder">确认方案并下发</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { listWorkorder, issueProtaskByWorkorderId } from '../api/productionOrder'
import b1Img from '../assets/img/b1.png'
import b2Img from '../assets/img/b2.jpg'
import b3Img from '../assets/img/b3.jpg'
import b4Img from '../assets/img/b4.jpg'
import b5Img from '../assets/img/b5.png'
import b6Img from '../assets/img/b6.png'
import b7Img from '../assets/img/b7-v2.png'
import b8Img from '../assets/img/b8-v2.png'

const DEFAULT_PRODUCTS = [
  { id: 1, src: b1Img, name: '品类一' },
  { id: 2, src: b2Img, name: '品类二' },
  { id: 3, src: b3Img, name: '品类三' },
  { id: 4, src: b4Img, name: '品类四' },
  { id: 5, src: b5Img, name: '品类五' },
  { id: 6, src: b6Img, name: '品类六' },
  { id: 7, src: b7Img, name: '品类七' },
  { id: 8, src: b8Img, name: '品类八' }
]

export default {
  name: 'ProductionOrderPanel',
  props: {
    title: { type: String, default: '柔性排产中心' },
    description: {
      type: String,
      default: '按需选择生产品类与计划数量，系统将匹配当前可用工单并快速下发至产线'
    },
    products: { type: Array, default: () => DEFAULT_PRODUCTS },
    queryParams: { type: Object, default: () => ({}) },
    confirmText: { type: String, default: '确认当前柔性排产方案并下发至产线？' },
    customSubmit: { type: Function, default: null }
  },
  data() {
    return {
      loading: false,
      submitting: false,
      workorderList: [],
      scheduleGenerated: false,
      scheduleCalculating: false,
      scheduleProgress: 0,
      scheduleTimer: null,
      schedulePreview: {},
      schedulingForm: {
        deadline: '',
        priority: 'urgent',
        strategy: 'balanced',
        lineMode: 'auto'
      },
      deadlinePickerOptions: {
        disabledDate(time) {
          return time.getTime() < Date.now() - 86400000
        }
      },
      selectedProductIndex: 1,
      orderForm: { quantity: 10 },
      quantityRules: [
        { required: true, message: '请输入计划数量', trigger: 'blur' },
        { type: 'number', min: 1, message: '计划数量不能小于1', trigger: 'blur' }
      ]
    }
  },
  computed: {
    productList() {
      return this.products && this.products.length ? this.products : DEFAULT_PRODUCTS
    }
  },
  created() {
    this.schedulingForm.deadline = this.formatDate(new Date(), false)
    this.getList()
  },
  beforeDestroy() {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer)
  },
  methods: {
    resolveProductSrc(item) {
      return item.src || item.image || item.imageUrl
    },
    selectProduct(index) {
      this.selectedProductIndex = index
      this.resetSchedule()
      this.$emit('product-select', this.productList[index], index)
    },
    resetSchedule() {
      if (this.scheduleTimer) clearInterval(this.scheduleTimer)
      this.scheduleTimer = null
      this.scheduleGenerated = false
      this.scheduleCalculating = false
      this.scheduleProgress = 0
      this.schedulePreview = {}
    },
    formatDate(value, withTime = true) {
      const pad = number => String(number).padStart(2, '0')
      const date = new Date(value)
      const day = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
      return withTime ? day + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) : day
    },
    generateSchedule() {
      if (!this.workorderList.length) {
        this.$modal.msgWarning('当前暂无可匹配工单，无法生成排产方案')
        return false
      }
      const quantity = Number(this.orderForm.quantity) || 1
      const selectedWorkorder = this.workorderList[this.workorderList.length - 1]
      const now = new Date()
      const priorityOffset = this.schedulingForm.priority === 'critical' ? 10 : this.schedulingForm.priority === 'urgent' ? 30 : 60
      const start = new Date(now.getTime() + priorityOffset * 60000)
      const durationMinutes = Math.max(45, Math.ceil(quantity / 20) * 15)
      const end = new Date(start.getTime() + durationMinutes * 60000)
      const autoLine = ['柔性灌装线 A', '柔性灌装线 B', '柔性灌装线 C'][this.selectedProductIndex % 3]
      const lineMap = { 'line-a': '柔性灌装线 A', 'line-b': '柔性灌装线 B', 'line-c': '柔性灌装线 C' }
      const reasonMap = {
        balanced: '已兼顾当前各产线负载，避免局部产能拥堵。',
        delivery: '已优先压缩等待时间，满足当前交付目标。',
        changeover: '已优先匹配同品类生产节拍，降低换型损耗。'
      }
      this.schedulePreview = {
        planCode: 'FSP-' + this.formatDate(now, false).replace(/-/g, '') + '-' + String(now.getTime()).slice(-4),
        workorderCode: selectedWorkorder.workorderCode || selectedWorkorder.workorderName || 'WO-' + selectedWorkorder.workorderId,
        line: this.schedulingForm.lineMode === 'auto' ? autoLine : lineMap[this.schedulingForm.lineMode],
        startTime: this.formatDate(start),
        endTime: this.formatDate(end),
        load: Math.min(92, 58 + this.selectedProductIndex * 7 + Math.ceil(quantity / 100)),
        score: this.schedulingForm.lineMode === 'auto' ? 96 - this.selectedProductIndex : 89,
        reason: reasonMap[this.schedulingForm.strategy]
      }
      this.scheduleGenerated = false
      this.scheduleCalculating = true
      this.scheduleProgress = 0
      const calculationStartedAt = Date.now()
      this.scheduleTimer = setInterval(() => {
        const elapsed = Date.now() - calculationStartedAt
        this.scheduleProgress = Math.min(100, Math.round(elapsed / 20))
        if (this.scheduleProgress >= 100) {
          clearInterval(this.scheduleTimer)
          this.scheduleTimer = null
          this.scheduleCalculating = false
          this.scheduleGenerated = true
        }
      }, 40)
      return true
    },
    generateScheduleFromForm() {
      this.$refs.orderForm.validate(valid => {
        if (valid && !this.scheduleCalculating) this.generateSchedule()
      })
    },
    getList() {
      this.loading = true
      listWorkorder(this.queryParams)
        .then(response => {
          const rows = response.rows || response.data || []
          this.workorderList =
            typeof this.handleTree === 'function' ? this.handleTree(rows) : rows
        })
        .finally(() => {
          this.loading = false
        })
    },
    submitOrder() {
      if (this.submitting) return
      this.$refs.orderForm.validate(valid => {
        if (!valid) return
        if (this.submitting) return
        if (this.scheduleCalculating) return
        if (!this.scheduleGenerated) {
          this.$modal.msgWarning('请先生成排产方案')
          return
        }
        if (!this.workorderList.length) {
          this.$modal.msgWarning('当前暂无可匹配工单，无法生成排产方案')
          return
        }
        const selectedWorkorder = this.workorderList[this.workorderList.length - 1]
        const workorderId = selectedWorkorder.workorderId
        const selected = this.productList[this.selectedProductIndex]
        const quantity = this.orderForm.quantity
        const payload = {
          workorderId,
          product: selected,
          productIndex: this.selectedProductIndex,
          quantity,
          workorder: selectedWorkorder,
          schedule: Object.assign({}, this.schedulePreview),
          deadline: this.schedulingForm.deadline,
          priority: this.schedulingForm.priority
        }
        this.submitting = true
        this.$modal
          .confirm(this.confirmText)
          .then(() => {
            if (typeof this.customSubmit === 'function') {
              return this.customSubmit(payload)
            }
            return issueProtaskByWorkorderId(workorderId)
          })
          .then(() => {
            this.$modal.msgSuccess(
              '柔性排产方案已下发：' + selected.name
            )
            this.$emit('order-success', payload)
            window.dispatchEvent(new CustomEvent('flex-schedule-order-success', { detail: payload }))
            this.resetSchedule()
          })
          .catch(err => {
            if (err !== 'cancel' && err !== 'close') {
              this.$emit('order-error', err, payload)
            }
          })
          .finally(() => {
            this.submitting = false
          })
      })
    }
  }
}
</script>
<style scoped>

.custom-product-container {

  display: flex;

  flex-direction: column;

  gap: 0;

  padding: 0;

  margin-bottom: 20px;

  background: #fff;

  border: 1px solid #ebeef5;

  border-radius: 10px;

  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.06);

  overflow: hidden;

}



.product-panel-header {

  margin-bottom: 0;

  padding: 12px 18px 10px;

  border-bottom: 1px solid #ebeef5;

  background: linear-gradient(135deg, #f7fbff 0%, #fff 72%);

}

.product-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.schedule-status {
  flex: none;
  padding: 7px 12px;
  color: #16865c;
  font-size: 12px;
  font-weight: 600;
  background: #edfaf4;
  border: 1px solid #bcebd8;
  border-radius: 16px;
}

.schedule-summary {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px 28px;
  color: #60758a;
  font-size: 12px;
  background: #f8fafc;
  border-bottom: 1px solid #ebeef5;
}

.schedule-summary i {
  margin-right: 4px;
  color: #409eff;
}

.scheduling-workbench {
  display: grid;
  grid-template-columns: minmax(420px, 1.05fr) minmax(380px, .95fr);
  gap: 10px;
  margin: 8px 18px 0;
}

.scheduling-config,
.schedule-preview {
  min-height: 176px;
  padding: 12px 14px;
  background: #fafcff;
  border: 1px solid #e1eaf3;
  border-radius: 10px;
  box-sizing: border-box;
}

.schedule-preview.is-generated {
  background: linear-gradient(145deg, #f5fbff, #f9fffc);
  border-color: #b9dbf8;
}

.workbench-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: #26384b;
  font-size: 14px;
  font-weight: 600;
}

.workbench-title > span {
  color: #909399;
  font-size: 12px;
  font-weight: 400;
}

.workbench-title .preview-ready {
  color: #16865c;
}

.workbench-title .preview-calculating {
  color: #409eff;
}

.scheduling-config__form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.scheduling-config__form >>> .el-form-item {
  margin-bottom: 12px;
}

.scheduling-config__form >>> .el-form-item__label {
  padding-bottom: 4px;
  color: #68798a;
  line-height: 20px;
}

.scheduling-config__form >>> .el-date-editor,
.scheduling-config__form >>> .el-select {
  width: 100%;
}

.scheduling-config__form >>> .el-radio-group {
  display: flex;
}

.scheduling-config__form >>> .el-radio-button {
  flex: 1;
}

.scheduling-config__form >>> .el-radio-button__inner {
  width: 100%;
  padding-right: 8px;
  padding-left: 8px;
}

.schedule-preview__empty {
  display: flex;
  height: 128px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #a4b2c0;
  text-align: center;
}

.schedule-preview__empty > i {
  margin-bottom: 8px;
  color: #8bbce8;
  font-size: 30px;
}

.schedule-preview__empty p {
  margin: 0 0 5px;
  color: #53687c;
  font-size: 13px;
}

.schedule-preview__empty span {
  font-size: 11px;
}

.preview-result-head,
.capacity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-result-head > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.preview-result-head span,
.preview-metrics span,
.capacity-row span {
  color: #8a99a8;
  font-size: 11px;
}

.preview-result-head strong {
  color: #1677ff;
  font-size: 14px;
}

.feasibility-tag {
  padding: 4px 8px;
  color: #16865c !important;
  background: #e8f8f1;
  border-radius: 10px;
}

.preview-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 13px 0;
}

.preview-metrics > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preview-metrics strong {
  overflow: hidden;
  color: #34495e;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capacity-row {
  gap: 10px;
}

.capacity-row >>> .el-progress {
  flex: 1;
}

.capacity-row strong {
  color: #409eff;
  font-size: 12px;
}

.preview-note {
  margin: 10px 0 0;
  padding-top: 9px;
  color: #66798c;
  font-size: 11px;
  border-top: 1px dashed #dce6ef;
}



.product-panel-title {

  margin: 0 0 3px;

  font-size: 17px;

  font-weight: 600;

  color: #303133;

  line-height: 1.2;

}



.product-panel-desc {

  margin: 0;

  font-size: 12px;

  color: #909399;

  line-height: 1.3;

}



.image-group {

  display: grid;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 10px;

  width: 100%;

  padding: 10px 18px 4px;

  box-sizing: border-box;

}



.product-image {

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 6px;

  height: 156px;

  padding: 8px 8px 7px;

  background: #fafbfc;

  border: 1px solid #e4e7ed;

  border-radius: 10px;

  box-sizing: border-box;

  min-width: 0;

  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

}



.img-preview,

.img-preview1 {

  width: 100%;

  height: 100px;

  border: 1px solid #ebeef5;

  border-radius: 8px;

  background: #fff;

  overflow: hidden;

}



.img-preview >>> .el-image,

.img-preview1 >>> .el-image {

  width: 100%;

  height: 100%;

}



.image-placeholder {

  width: 100%;

  height: 100%;

  display: flex;

  align-items: center;

  justify-content: center;

  color: #c0c4cc;

  font-size: 24px;

}



.image-desc {

  width: 100%;

  font-size: 14px;

  font-weight: 500;

  color: #303133;

  height: 22px;

  margin: 0;

  line-height: 22px;

  flex: 0 0 22px;

  text-align: center;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;

}



.action-group {

  display: flex;

  align-items: center;

  justify-content: space-between;

  width: 100%;

  margin-top: 10px;

  padding: 10px 18px;

  border-top: 1px solid #ebeef5;

  border-radius: 0 0 10px 10px;

  background: linear-gradient(180deg, #fafbfc 0, #fff 100%);

  gap: 20px;

  flex-wrap: wrap;

  box-sizing: border-box;

}



.action-group__info {

  display: flex;

  align-items: baseline;

  gap: 8px;

  min-width: 160px;

}



.action-group__label {

  font-size: 14px;

  color: #909399;

}



.action-group__value {

  font-size: 16px;

  font-weight: 600;

  color: #409eff;

}



.action-group__form {

  display: flex;

  align-items: center;

  margin-left: auto;

}



.action-group__form >>> .el-form-item {

  margin-bottom: 0;

}



.product-image--selectable {

  cursor: pointer;

}



.product-image--selectable:hover {

  border-color: #b3d8ff;

  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.12);

  transform: translateY(-2px);

}



.product-image--selectable.is-selected {

  border-color: #409eff;

  background: #ecf5ff;

  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.18);

}



.product-image--selectable.is-selected >>> .img-preview1 {

  border-color: #409eff;

}



@media (max-width: 1400px) {

  .image-group {

    grid-template-columns: repeat(3, minmax(0, 1fr));

  }

}



@media (max-width: 900px) {

  .product-panel-heading {
    flex-direction: column;
  }

  .schedule-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .scheduling-workbench {
    grid-template-columns: 1fr;
    margin-right: 16px;
    margin-left: 16px;
  }

  .image-group {

    grid-template-columns: repeat(2, minmax(0, 1fr));

  }



  .action-group {

    flex-direction: column;

    align-items: stretch;

  }



  .action-group__form {

    margin-left: 0;

    justify-content: flex-end;

  }

}

</style>

