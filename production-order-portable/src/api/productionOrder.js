/**
 * Production order API — RuoYi request wrapper compatible
 * 生产下单相关 API，兼容若依 request 封装
 */
import request from '@/utils/request'

/** List work orders / ��ѯ���������б� */
export function listWorkorder(query) {
  return request({
    url: '/mes/pro/workorder/list',
    method: 'get',
    params: query
  })
}

/**
 * Start production line via MQTT (same as bsq-admin ProTaskController.execute)
 * �������ߣ�PUT /mes/pro/protask/{workorderId}
 */
export function issueProtaskByWorkorderId(workorderId) {
  return request({
    url: '/mes/pro/protask/' + workorderId,
    method: 'put'
  })
}
