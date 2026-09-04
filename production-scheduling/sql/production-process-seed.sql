SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-010', '包材上料', '核对瓶体、瓶盖及包装材料的批次、规格和数量，确认物料洁净且无破损后按生产节拍上线。', 'Y', '第01道工序：完成包装材料备料与上线。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-010');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-020', '定量注酒', '确认酒液批次与产品配方一致，按设定容量完成定量注入，并持续监控液位、温度及灌装精度。', 'Y', '第02道工序：完成酒液定量灌装。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-020');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-030', '自动放盖', '检查瓶盖方向、型号及供料状态，通过理盖和送盖机构将瓶盖准确放置到瓶口。', 'Y', '第03道工序：完成瓶盖自动定位与放置。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-030');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-040', '瓶盖压合', '按产品工艺设定压盖压力和行程，确保瓶盖压合到位、密封可靠且瓶口无变形。', 'Y', '第04道工序：完成瓶盖压合与密封。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-040');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-050', '成品挑拣', '剔除液位异常、瓶体破损、瓶盖歪斜、外观污染及包装缺陷产品，并记录异常数量。', 'Y', '第05道工序：完成外观筛选与不良品剔除。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-050');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-060', '在线质检', '按抽检标准核验净含量、密封性、外观和包装完整性，检验结果合格后方可流入下道工序。', 'Y', '第06道工序：完成关键质量项目检验与放行。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-060');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-070', '产品赋码', '生成并打印产品追溯码，校验编码清晰度、唯一性和可识读性，建立产品、批次与工单关联。', 'Y', '第07道工序：完成一物一码赋码与追溯绑定。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-070');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-080', '成品进仓', '核对成品批次、数量和检验状态，将合格成品转运至指定仓库待入库区域并完成交接。', 'Y', '第08道工序：完成合格成品转运与仓库交接。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-080');

INSERT INTO pro_process
  (process_code, process_name, attention, enable_flag, remark, create_by, create_time, user_id, dept_id)
SELECT 'PROC-090', '成品入库', '复核产品编码、批次、数量和库位信息，完成库存登记、库位绑定及入库凭证生成。', 'Y', '第09道工序：完成库存登记与库位确认。', 'admin', NOW(), 1, 103
WHERE NOT EXISTS (SELECT 1 FROM pro_process WHERE process_code = 'PROC-090');

COMMIT;
