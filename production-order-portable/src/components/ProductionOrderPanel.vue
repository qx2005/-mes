<template>
  <div class="app-container production-order-panel">
    <div v-loading="loading" class="custom-product-container">
      <div class="product-panel-header">
        <h3 class="product-panel-title">{{ title }}</h3>
        <p class="product-panel-desc">{{ description }}</p>
      </div>
      <div class="image-group">
        <div class="product-image product-image--device">
          <el-image class="img-preview" :src="deviceImageSrc" alt="设备图片" fit="contain">
            <div slot="error" class="image-placeholder"><i class="el-icon-picture-outline" /></div>
          </el-image>
          <p class="image-desc">设备图片</p>
        </div>
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
      <div class="action-group">
        <div class="action-group__info">
          <span class="action-group__label">已选品类</span>
          <strong class="action-group__value">{{ productList[selectedProductIndex].name }}</strong>
        </div>
        <div class="action-group__form">
          <el-form ref="orderForm" :model="orderForm" size="small" inline>
            <el-form-item label="数量" prop="quantity" :rules="quantityRules">
              <el-input v-model.number="orderForm.quantity" style="width: 120px"
                placeholder="请输入数量" clearable type="number" :min="1" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="el-icon-shopping-cart" size="medium"
                :loading="submitting" @click="submitOrder">下单</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { listWorkorder, issueProtaskByWorkorderId } from '../api/productionOrder'
import deviceImg from '../assets/img/device.png'
import b1Img from '../assets/img/b1.png'
import b2Img from '../assets/img/b2.jpg'
import b3Img from '../assets/img/b3.jpg'
import b4Img from '../assets/img/b4.jpg'

const DEFAULT_PRODUCTS = [
  { id: 1, src: b1Img, name: '品类一' },
  { id: 2, src: b2Img, name: '品类二' },
  { id: 3, src: b3Img, name: '品类三' },
  { id: 4, src: b4Img, name: '品类四' }
]

export default {
  name: 'ProductionOrderPanel',
  props: {
    title: { type: String, default: '生产下单' },
    description: {
      type: String,
      default: '请选择品类后填写数量并下单，点击下单将启动产线'
    },
    deviceImage: { type: [String, Object], default: null },
    products: { type: Array, default: () => DEFAULT_PRODUCTS },
    queryParams: { type: Object, default: () => ({}) },
    confirmText: { type: String, default: '确认下单并启动产线？' },
    customSubmit: { type: Function, default: null }
  },
  data() {
    return {
      loading: false,
      submitting: false,
      workorderList: [],
      selectedProductIndex: 0,
      orderForm: { quantity: 1 },
      quantityRules: [
        { required: true, message: '请输入数量', trigger: 'blur' },
        { type: 'number', min: 1, message: '数量不能小于1', trigger: 'blur' }
      ]
    }
  },
  computed: {
    productList() {
      return this.products && this.products.length ? this.products : DEFAULT_PRODUCTS
    },
    deviceImageSrc() {
      return this.deviceImage || deviceImg
    }
  },
  created() {
    this.getList()
  },
  methods: {
    resolveProductSrc(item) {
      return item.src || item.image || item.imageUrl
    },
    selectProduct(index) {
      this.selectedProductIndex = index
      this.$emit('product-select', this.productList[index], index)
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
      this.$refs.orderForm.validate(valid => {
        if (!valid) return
        if (!this.workorderList.length) {
          this.$modal.msgWarning('暂无可用工单，无法启动产线')
          return
        }
        const workorderId = this.workorderList[this.workorderList.length - 1].workorderId
        const selected = this.productList[this.selectedProductIndex]
        const quantity = this.orderForm.quantity
        const payload = {
          workorderId,
          product: selected,
          productIndex: this.selectedProductIndex,
          quantity
        }
        this.$modal
          .confirm(this.confirmText)
          .then(() => {
            this.submitting = true
            if (typeof this.customSubmit === 'function') {
              return this.customSubmit(payload)
            }
            return issueProtaskByWorkorderId(workorderId)
          })
          .then(() => {
            this.$modal.msgSuccess(
              '产线启动指令已下发，已选' + selected.name + '，数量' + quantity
            )
            this.$emit('order-success', payload)
            this.orderForm.quantity = 1
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

  padding: 20px 28px 16px;

  border-bottom: 1px solid #ebeef5;

  background: #fff;

}



.product-panel-title {

  margin: 0 0 6px;

  font-size: 18px;

  font-weight: 600;

  color: #303133;

  line-height: 1.4;

}



.product-panel-desc {

  margin: 0;

  font-size: 13px;

  color: #909399;

  line-height: 1.5;

}



.image-group {

  display: grid;

  grid-template-columns: repeat(5, minmax(0, 1fr));

  gap: 16px;

  width: 100%;

  padding: 20px 28px 8px;

  box-sizing: border-box;

}



.product-image {

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 10px;

  padding: 14px 12px 12px;

  background: #fafbfc;

  border: 1px solid #e4e7ed;

  border-radius: 10px;

  box-sizing: border-box;

  min-width: 0;

  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

}



.product-image--device {

  background: #f5f7fa;

}



.img-preview,

.img-preview1 {

  width: 100%;

  height: 168px;

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

  margin: 0;

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

  margin-top: 22px;

  padding: 16px 20px;

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

