SET NAMES utf8mb4;

START TRANSACTION;

SET @runtime_date_token = DATE_FORMAT(NOW(), '%Y%m%d');
SET @runtime_batch_code = CONCAT('LOT-', @runtime_date_token, '-001');
SET @runtime_route_code = CONCAT('TRACE-LAGER-', @runtime_date_token, '-001');

INSERT INTO md_item
  (item_code, item_name, specification, unit_of_measure, item_or_product,
   item_type_id, item_type_code, item_type_name, enable_flag, remark,
   create_by, create_time, user_id, dept_id)
SELECT
  'BR-LAGER-045-500X6',
  '麦香拉格 4.5度',
  '500ml×6罐',
  'PCS',
  'PRODUCT',
  203,
  'ITEM_TYPE_0098',
  '成品',
  'Y',
  CONCAT('拉格型啤酒，生产批号', @runtime_batch_code, '，用于二维码全流程追溯。'),
  'admin',
  NOW(),
  1,
  103
WHERE NOT EXISTS (
  SELECT 1 FROM md_item WHERE item_code = 'BR-LAGER-045-500X6'
);

INSERT INTO pro_route
  (route_code, route_name, route_desc, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT
  @runtime_route_code,
  '追溯罐装路线',
  '二维码关联生产批次与工艺节点，实现产品全过程追溯。',
  'Y',
  '扫码可查询产品生产、质检及入库信息。',
  'admin',
  NOW(),
  1,
  103
WHERE NOT EXISTS (
  SELECT 1 FROM pro_route WHERE route_code = @runtime_route_code OR route_code REGEXP '^TRACE-LAGER-[0-9]{8}-001$' OR route_code = 'ROUTE-BEER-CAN-QR-01'
);

UPDATE pro_route
SET route_code = @runtime_route_code,
    route_name = '追溯罐装路线',
    route_desc = '二维码关联生产批次与工艺节点，实现产品全过程追溯。',
    enable_flag = 'Y',
    remark = '扫码可查询产品生产、质检及入库信息。',
    update_by = 'admin',
    update_time = NOW()
WHERE route_code = @runtime_route_code OR route_code REGEXP '^TRACE-LAGER-[0-9]{8}-001$' OR route_code = 'ROUTE-BEER-CAN-QR-01';

SET @beer_route_id = (
  SELECT route_id
  FROM pro_route
  WHERE route_code = @runtime_route_code
  LIMIT 1
);

DELETE FROM pro_route_process WHERE route_id = @beer_route_id;

INSERT INTO pro_route_process
  (route_id, process_id, process_code, process_name, order_num,
   next_process_id, next_process_code, next_process_name, link_type,
   default_pre_time, default_suf_time, color_code, key_flag, remark,
   create_by, create_time)
SELECT
  @beer_route_id,
  current_process.process_id,
  current_process.process_code,
  current_process.process_name,
  route_step.order_num,
  next_process.process_id,
  next_process.process_code,
  next_process.process_name,
  'FS',
  route_step.pre_time,
  route_step.suf_time,
  route_step.color_code,
  route_step.key_flag,
  route_step.remark,
  'admin',
  NOW()
FROM (
  SELECT 1 order_num, 'PROC-010' current_code, 'PROC-020' next_code, 10 pre_time, 2 suf_time, '#409EFF' color_code, 'N' key_flag, '包装材料核验完成后进入定量注酒。' remark
  UNION ALL SELECT 2, 'PROC-020', 'PROC-030', 5, 1, '#36CFC9', 'N', '酒液容量和液位合格后自动放盖。'
  UNION ALL SELECT 3, 'PROC-030', 'PROC-040', 2, 0, '#67C23A', 'N', '瓶盖定位正确后进入压盖密封。'
  UNION ALL SELECT 4, 'PROC-040', 'PROC-050', 2, 1, '#E6A23C', 'N', '密封状态确认后进行外观挑拣。'
  UNION ALL SELECT 5, 'PROC-050', 'PROC-060', 3, 2, '#F56C6C', 'N', CONCAT('剔除外观不良品，质检结果写入', @runtime_batch_code, '追溯档案。')
  UNION ALL SELECT 6, 'PROC-060', 'PROC-070', 5, 1, '#9B59B6', 'N', '质量检验放行后进入二维码加密赋码建档。'
  UNION ALL SELECT 7, 'PROC-070', 'PROC-080', 5, 2, '#00A6A6', 'Y', '关键追溯工序：生成唯一身份码，绑定麦香拉格4.5度、产线一、生产一组、工单、批次及质检结果。'
  UNION ALL SELECT 8, 'PROC-080', 'PROC-090', 5, 0, '#5B8FF9', 'N', CONCAT('CAMERA-001于', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), '扫码校验成功后，办理正式入库。')
) route_step
JOIN pro_process current_process ON current_process.process_code = route_step.current_code
JOIN pro_process next_process ON next_process.process_code = route_step.next_code
WHERE NOT EXISTS (
  SELECT 1
  FROM pro_route_process existing_step
  WHERE existing_step.route_id = @beer_route_id
    AND existing_step.order_num = route_step.order_num
);

DELETE FROM pro_route_product WHERE route_id = @beer_route_id;

INSERT INTO pro_route_product
  (route_id, item_id, item_code, item_name, specification, unit_of_measure,
   quantity, production_time, time_unit_type, remark, create_by, create_time)
SELECT
  @beer_route_id,
  item.item_id,
  item.item_code,
  item.item_name,
  item.specification,
  item.unit_of_measure,
  1,
  0.05,
  'MINUTE',
  CONCAT('麦香拉格4.5度罐装产品，批号', @runtime_batch_code, '，使用二维码身份码进行全流程追溯。'),
  'admin',
  NOW()
FROM md_item item
WHERE item.item_code = 'BR-LAGER-045-500X6'
  AND NOT EXISTS (
    SELECT 1
    FROM pro_route_product existing_product
    WHERE existing_product.route_id = @beer_route_id
      AND existing_product.item_id = item.item_id
  );

COMMIT;
