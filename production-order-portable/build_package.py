from pathlib import Path

ROOT = Path(__file__).resolve().parent
VUE = ROOT / "src/components/ProductionOrderPanel.vue"

raw = VUE.read_bytes()
idx = raw.find(b"<style scoped>")
style = raw[idx:].decode("utf-8", errors="replace")

template = (
    "<template>\n"
    '  <div class="app-container production-order-panel">\n'
    '    <div v-loading="loading" class="custom-product-container">\n'
    '      <div class="product-panel-header">\n'
    '        <h3 class="product-panel-title">{{ title }}</h3>\n'
    '        <p class="product-panel-desc">{{ description }}</p>\n'
    "      </div>\n"
    '      <div class="image-group">\n'
    '        <div class="product-image product-image--device">\n'
    '          <el-image class="img-preview" :src="deviceImageSrc" alt="'
    + "\u8bbe\u5907\u56fe\u7247"
    + '" fit="contain">\n'
    '            <div slot="error" class="image-placeholder"><i class="el-icon-picture-outline" /></div>\n'
    "          </el-image>\n"
    "          <p class=\"image-desc\">"
    + "\u8bbe\u5907\u56fe\u7247"
    + "</p>\n"
    "        </div>\n"
    '        <div v-for="(item, index) in productList" :key="item.id || index"\n'
    '          class="product-image product-image--selectable"\n'
    "          :class=\"{ 'is-selected': selectedProductIndex === index }\"\n"
    '          @click="selectProduct(index)">\n'
    '          <el-image class="img-preview1" :src="resolveProductSrc(item)" :alt="item.name" fit="contain">\n'
    '            <div slot="error" class="image-placeholder"><i class="el-icon-picture-outline" /></div>\n'
    "          </el-image>\n"
    '          <p class="image-desc">{{ item.name }}</p>\n'
    "        </div>\n"
    "      </div>\n"
    '      <div class="action-group">\n'
    '        <div class="action-group__info">\n'
    '          <span class="action-group__label">'
    + "\u5df2\u9009\u54c1\u7c7b"
    + "</span>\n"
    '          <strong class="action-group__value">{{ productList[selectedProductIndex].name }}</strong>\n'
    "        </div>\n"
    '        <div class="action-group__form">\n'
    '          <el-form ref="orderForm" :model="orderForm" size="small" inline>\n'
    '            <el-form-item label="'
    + "\u6570\u91cf"
    + '" prop="quantity" :rules="quantityRules">\n'
    '              <el-input v-model.number="orderForm.quantity" style="width: 120px"\n'
    '                placeholder="'
    + "\u8bf7\u8f93\u5165\u6570\u91cf"
    + '" clearable type="number" :min="1" />\n'
    "            </el-form-item>\n"
    "            <el-form-item>\n"
    '              <el-button type="primary" icon="el-icon-shopping-cart" size="medium"\n'
    '                :loading="submitting" @click="submitOrder">'
    + "\u4e0b\u5355"
    + "</el-button>\n"
    "            </el-form-item>\n"
    "          </el-form>\n"
    "        </div>\n"
    "      </div>\n"
    "    </div>\n"
    "  </div>\n"
    "</template>\n"
)

script = """
<script>
import { listWorkorder, issueProtaskByWorkorderId } from '../api/productionOrder'
import deviceImg from '../assets/img/device.png'
import b1Img from '../assets/img/b1.png'
import b2Img from '../assets/img/b2.jpg'
import b3Img from '../assets/img/b3.jpg'
import b4Img from '../assets/img/b4.jpg'

const DEFAULT_PRODUCTS = [
  { id: 1, src: b1Img, name: '\u54c1\u7c7b\u4e00' },
  { id: 2, src: b2Img, name: '\u54c1\u7c7b\u4e8c' },
  { id: 3, src: b3Img, name: '\u54c1\u7c7b\u4e09' },
  { id: 4, src: b4Img, name: '\u54c1\u7c7b\u56db' }
]

export default {
  name: 'ProductionOrderPanel',
  props: {
    title: { type: String, default: '\u751f\u4ea7\u4e0b\u5355' },
    description: {
      type: String,
      default: '\u8bf7\u9009\u62e9\u54c1\u7c7b\u540e\u586b\u5199\u6570\u91cf\u5e76\u4e0b\u5355\uff0c\u70b9\u51fb\u4e0b\u5355\u5c06\u542f\u52a8\u4ea7\u7ebf'
    },
    deviceImage: { type: [String, Object], default: null },
    products: { type: Array, default: () => DEFAULT_PRODUCTS },
    queryParams: { type: Object, default: () => ({}) },
    confirmText: { type: String, default: '\u786e\u8ba4\u4e0b\u5355\u5e76\u542f\u52a8\u4ea7\u7ebf\uff1f' },
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
        { required: true, message: '\u8bf7\u8f93\u5165\u6570\u91cf', trigger: 'blur' },
        { type: 'number', min: 1, message: '\u6570\u91cf\u4e0d\u80fd\u5c0f\u4e8e1', trigger: 'blur' }
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
          this.$modal.msgWarning('\u6682\u65e0\u53ef\u7528\u5de5\u5355\uff0c\u65e0\u6cd5\u542f\u52a8\u4ea7\u7ebf')
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
              '\u4ea7\u7ebf\u542f\u52a8\u6307\u4ee4\u5df2\u4e0b\u53d1\uff0c\u5df2\u9009' + selected.name + '\uff0c\u6570\u91cf' + quantity
            )
            this.$emit('order-success', payload)
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
"""

readme = (
    "# "
    + "\u751f\u4ea7\u4e0b\u5355 + \u4ea7\u7ebf\u542f\u52a8\uff08\u5168\u6808\u53ef\u79fb\u690d\u5305\uff09\n\n"
    + "\u672c\u5305\u5305\u542b **\u524d\u7aef UI**\u3001**MQTT \u4ea7\u7ebf\u542f\u52a8\u6865\u63a5\u670d\u52a1 bridge**\ "
    + "\u4e0e\u90e8\u7f72\u914d\u7f6e\u3002\u878d\u5408\u5230\u65b0\u5e73\u53f0\u540e\uff0c\u6309 **INTEGRATION.md** \u542f\u52a8\u4f9d\u8d56\uff0c\u5373\u53ef\u300c\u70b9\u4e0b\u5355 \u2192 \u4ea7\u7ebf\u8fd0\u884c\u300d\u3002\n\n"
    + "## \u6838\u5fc3\u6587\u4ef6\n\n"
    + "| \u76ee\u5f55 | \u4f5c\u7528 |\n|------|------|\n"
    + "| `src/` | Vue2 \u751f\u4ea7\u4e0b\u5355\u9875 |\n"
    + "| `bridge/` | \u540e\u7aef API + MQTT \u4ea7\u7ebf\u542f\u52a8\uff08\u4e0e bsq-admin \u62a5\u6587\u4e00\u81f4\uff09 |\n"
    + "| `config/` | MQTT / Nginx \u914d\u7f6e\u7247\u6bb5 |\n"
    + "| `scripts/start-bridge.bat` | \u4e00\u952e\u542f\u52a8\u6865\u63a5 |\n"
    + "| `INTEGRATION.md` | \u65b0\u9879\u76ee\u878d\u5408\u6b65\u9aa4\uff08\u5fc5\u8bfb\uff09 |\n\n"
    + "## \u5feb\u901f\u542f\u52a8\n\n"
    + "1. ActiveMQ MQTT `:1893`\n"
    + "2. ThingsBoard \u8ba2\u9605 `SubTopic1`\n"
    + "3. `scripts\\\\start-bridge.bat`\n"
    + "4. \u524d\u7aef `/prod-api/` \u2192 `:8080`\n"
    + "5. \u70b9\u300c\u4e0b\u5355\u300d\u542f\u52a8\u4ea7\u7ebf\n"
)

integration = (
    "# "
    + "\u65b0\u9879\u76ee\u878d\u5408\u6307\u5357\uff08\u4ea7\u7ebf\u53ef\u76f4\u63a5\u8fd0\u884c\uff09\n\n"
    + "## \u65b9\u6848 A\uff1a\u4f7f\u7528 bridge\uff08\u63a8\u8350\uff09\n\n"
    + "1. \u590d\u5236\u672c\u5305\u5230\u65b0\u9879\u76ee\n"
    + "2. `bridge/.env.example` \u2192 `.env`\uff0c\u914d\u7f6e MySQL \u4e0e MQTT\n"
    + "3. \u8fd0\u884c `scripts/start-bridge.bat`\n"
    + "4. \u590d\u5236 `src/` \u5230\u524d\u7aef\u9879\u76ee\u5e76\u914d\u7f6e\u8def\u7531\n"
    + "5. Nginx \u4f7f\u7528 `config/nginx-prod-api.snippet`\n\n"
    + "## \u65b9\u6848 B\uff1a\u4f7f\u7528 bsq-admin.jar\n\n"
    + "\u82e5\u65b0\u5e73\u53f0\u5df2\u90e8\u7f72\u539f\u7248 jar\uff0c\u53ea\u9700\u590d\u5236 `src/` \u524d\u7aef\uff0c\u65e0\u9700 bridge\u3002\n\n"
    + "## \u542f\u52a8\u94fe\u8def\n\n"
    + "`PUT /mes/pro/protask/{workorderId}` \u2192 MQTT `SubTopic1` \u2192 `produce=1` \u2192 \u4ea7\u7ebf\u8fd0\u884c\n\n"
    + "## \u9a8c\u8bc1\n\n"
    + "`powershell scripts/verify-stack.ps1`\n"
)

# ProductionOrderPanel.vue and its documentation are now maintained directly so
# the flexible-scheduling presentation layer is not replaced by this legacy
# bootstrap template.
print("legacy bootstrap skipped; maintained files preserved")
