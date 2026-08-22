/**
 * RuoYi-Vue route snippet (Vue2 + Element UI)
 * 若依 Vue2 路由配置示例
 *
 * Copy component & api into your RuoYi mes module, then add:
 * 将组件与 API 复制到若依 MES 模块后，在 router 中加入：
 */
export default {
  path: '/mes/pro/production-order',
  component: () => import('@/views/mes/pro/productionOrder/index'),
  name: 'ProductionOrder',
  meta: {
    title: '生产排产',
    icon: 'build',
    permissions: ['mes:pro:workorder:list']
  }
}

/**
 * views/mes/pro/productionOrder/index.vue — minimal wrapper:
 *
 * <template>
 *   <production-order-panel />
 * </template>
 * <script>
 * import ProductionOrderPanel from '@/components/mes/ProductionOrderPanel.vue'
 * export default { components: { ProductionOrderPanel } }
 * </script>
 */
