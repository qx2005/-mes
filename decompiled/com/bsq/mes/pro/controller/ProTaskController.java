/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.hutool.core.collection.CollUtil
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.bsq.common.annotation.Log
 *  com.bsq.common.core.controller.BaseController
 *  com.bsq.common.core.domain.AjaxResult
 *  com.bsq.common.core.page.TableDataInfo
 *  com.bsq.common.enums.BusinessType
 *  com.bsq.common.utils.StringUtils
 *  com.bsq.common.utils.poi.ExcelUtil
 *  com.bsq.mes.mqtt.MqttConfig
 *  com.bsq.mes.pro.domain.GanttData
 *  com.bsq.mes.pro.domain.GanttTask
 *  com.bsq.mes.pro.domain.ProProcess
 *  com.bsq.mes.pro.domain.ProTask
 *  com.bsq.mes.pro.domain.ProWorkorder
 *  com.bsq.mes.pro.service.IProProcessService
 *  com.bsq.mes.pro.service.IProTaskService
 *  com.bsq.mes.pro.service.IProWorkorderService
 *  com.bsq.system.strategy.AutoCodeUtil
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  io.swagger.annotations.ApiParam
 *  javax.servlet.http.HttpServletResponse
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.security.access.prepost.PreAuthorize
 *  org.springframework.transaction.annotation.Transactional
 *  org.springframework.web.bind.annotation.DeleteMapping
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.PutMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RestController
 */
package com.bsq.mes.pro.controller;

import cn.hutool.core.collection.CollUtil;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.bsq.common.annotation.Log;
import com.bsq.common.core.controller.BaseController;
import com.bsq.common.core.domain.AjaxResult;
import com.bsq.common.core.page.TableDataInfo;
import com.bsq.common.enums.BusinessType;
import com.bsq.common.utils.StringUtils;
import com.bsq.common.utils.poi.ExcelUtil;
import com.bsq.mes.mqtt.MqttConfig;
import com.bsq.mes.mqtt.MqttPushClient;
import com.bsq.mes.pro.domain.GanttData;
import com.bsq.mes.pro.domain.GanttTask;
import com.bsq.mes.pro.domain.ProProcess;
import com.bsq.mes.pro.domain.ProTask;
import com.bsq.mes.pro.domain.ProWorkorder;
import com.bsq.mes.pro.service.IProProcessService;
import com.bsq.mes.pro.service.IProTaskService;
import com.bsq.mes.pro.service.IProWorkorderService;
import com.bsq.system.strategy.AutoCodeUtil;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Api(value="\u751f\u4ea7\u4efb\u52a1")
@RestController
@RequestMapping(value={"/mes/pro/protask"})
public class ProTaskController
extends BaseController {
    @Autowired
    private IProTaskService proTaskService;
    @Autowired
    private IProWorkorderService proWorkorderService;
    @Autowired
    private IProProcessService proProcessService;
    @Autowired
    private AutoCodeUtil autoCodeUtil;
    @Autowired
    private MqttConfig mqttConfig;

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:list')")
    @ApiOperation(value="\u67e5\u8be2\u751f\u4ea7\u4efb\u52a1\u5217\u8868")
    @GetMapping(value={"/list"})
    public TableDataInfo list(ProTask proTask) {
        this.startPage();
        List list = this.proTaskService.selectProTaskList(proTask);
        return this.getDataTable(list);
    }

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:export')")
    @Log(title="\u751f\u4ea7\u4efb\u52a1", businessType=BusinessType.EXPORT)
    @ApiOperation(value="\u5bfc\u51fa\u751f\u4ea7\u4efb\u52a1\u5217\u8868")
    @PostMapping(value={"/export"})
    public void export(HttpServletResponse response, ProTask proTask) {
        List list = this.proTaskService.selectProTaskList(proTask);
        ExcelUtil util = new ExcelUtil(ProTask.class);
        util.exportExcel(response, list, "\u751f\u4ea7\u4efb\u52a1\u6570\u636e");
    }

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:query')")
    @ApiOperation(value="\u83b7\u53d6\u751f\u4ea7\u4efb\u52a1\u8be6\u7ec6\u4fe1\u606f")
    @GetMapping(value={"/{taskId}"})
    public AjaxResult getInfo(@ApiParam(value="\u4efb\u52a1id") @PathVariable(value="taskId") Long taskId) {
        return AjaxResult.success((Object)this.proTaskService.selectProTaskByTaskId(taskId));
    }

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:list')")
    @ApiOperation(value="\u83b7\u53d6\u7518\u7279\u56fe\u4efb\u52a1\u5217\u8868")
    @GetMapping(value={"/listGanttTaskList"})
    public AjaxResult getGanttTaskList(ProWorkorder proWorkorder) {
        GanttTask ganttTask = new GanttTask();
        ArrayList<GanttData> ganttData = new ArrayList<GanttData>();
        ArrayList ganttLinks = new ArrayList();
        List workorders = this.proWorkorderService.selectProWorkorderList(proWorkorder);
        ProTask param = new ProTask();
        if (CollUtil.isNotEmpty((Collection)workorders)) {
            for (ProWorkorder workorder : workorders) {
                GanttData wdata = new GanttData();
                wdata.setId("MO" + workorder.getWorkorderId().toString());
                wdata.setText(workorder.getProductName() + workorder.getQuantity().stripTrailingZeros().toPlainString() + workorder.getUnitOfMeasure());
                wdata.setProduct(workorder.getProductName());
                wdata.setQuantity(workorder.getQuantity());
                if (workorder.getParentId() != 0L) {
                    wdata.setParent("MO" + workorder.getParentId().toString());
                }
                BigDecimal produced = workorder.getQuantityProduced();
                BigDecimal quantitiy = workorder.getQuantity();
                wdata.setProgress(produced.divide(quantitiy, 2).floatValue());
                wdata.setDuration(Long.valueOf(0L));
                wdata.setType("project");
                ganttData.add(wdata);
                param.setWorkorderId(workorder.getWorkorderId());
                List proTasks = this.proTaskService.selectProTaskList(param);
                if (!CollUtil.isNotEmpty((Collection)proTasks)) continue;
                for (ProTask task : proTasks) {
                    GanttData data = new GanttData();
                    data.setId(task.getTaskId().toString());
                    data.setText(task.getItemName() + task.getQuantity().stripTrailingZeros().toPlainString() + task.getUnitOfMeasure());
                    data.setColor(task.getColorCode());
                    data.setDuration(task.getDuration());
                    data.setStart_date(task.getStartTime());
                    data.setParent("MO" + workorder.getWorkorderId().toString());
                    data.setProduct(task.getItemName());
                    data.setQuantity(task.getQuantity());
                    data.setProcess(task.getProcessName());
                    data.setWorkstation(task.getWorkstationName());
                    BigDecimal taskproduced = task.getQuantityProduced();
                    BigDecimal taskquantitiy = task.getQuantity();
                    data.setProgress(taskproduced.divide(taskquantitiy, 4).floatValue());
                    data.setType("task");
                    ganttData.add(data);
                }
            }
        }
        ganttTask.setData(ganttData);
        ganttTask.setLinks(ganttLinks);
        return AjaxResult.success((Object)ganttTask);
    }

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:add')")
    @Log(title="\u751f\u4ea7\u4efb\u52a1", businessType=BusinessType.INSERT)
    @ApiOperation(value="\u65b0\u589e\u751f\u4ea7\u4efb\u52a1")
    @PostMapping
    public AjaxResult add(@RequestBody ProTask proTask) {
        proTask.setUserId(this.getUserId());
        proTask.setDeptId(this.getDeptId());
        if (proTask.getQuantity().compareTo(BigDecimal.ZERO) != 1) {
            return AjaxResult.error((String)"\u6392\u4ea7\u6570\u91cf\u5fc5\u987b\u5927\u4e8e0\uff01");
        }
        ProWorkorder order = this.proWorkorderService.selectProWorkorderByWorkorderId(proTask.getWorkorderId());
        proTask.setWorkorderCode(order.getWorkorderCode());
        proTask.setWorkorderName(order.getWorkorderName());
        proTask.setItemId(order.getProductId());
        proTask.setItemCode(order.getProductCode());
        proTask.setItemName(order.getProductName());
        proTask.setSpecification(order.getProductSpc());
        proTask.setUnitOfMeasure(order.getUnitOfMeasure());
        proTask.setClientId(order.getClientId());
        proTask.setClientCode(order.getClientCode());
        proTask.setClientName(order.getClientName());
        ProProcess process = this.proProcessService.selectProProcessByProcessId(proTask.getProcessId());
        proTask.setProcessId(process.getProcessId());
        proTask.setProcessCode(process.getProcessCode());
        proTask.setProcessName(process.getProcessName());
        proTask.setTaskCode(this.autoCodeUtil.genSerialCode("TASK_CODE", null));
        proTask.setTaskName(proTask.getItemName() + "\u3010" + proTask.getQuantity().toString() + "\u3011" + proTask.getUnitOfMeasure());
        proTask.setCreateBy(this.getUsername());
        return this.toAjax(this.proTaskService.insertProTask(proTask));
    }

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:edit')")
    @Log(title="\u751f\u4ea7\u4efb\u52a1", businessType=BusinessType.UPDATE)
    @ApiOperation(value="\u4fee\u6539\u751f\u4ea7\u4efb\u52a1")
    @PutMapping
    public AjaxResult edit(@RequestBody ProTask proTask) {
        if (proTask.getQuantity().compareTo(BigDecimal.ZERO) != 1) {
            return AjaxResult.error((String)"\u6392\u4ea7\u6570\u91cf\u5fc5\u987b\u5927\u4e8e0\uff01");
        }
        proTask.setUpdateBy(this.getUsername());
        return this.toAjax(this.proTaskService.updateProTask(proTask));
    }

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:remove')")
    @Log(title="\u751f\u4ea7\u4efb\u52a1", businessType=BusinessType.DELETE)
    @ApiOperation(value="\u5220\u9664\u751f\u4ea7\u4efb\u52a1")
    @DeleteMapping(value={"/{taskIds}"})
    public AjaxResult remove(@ApiParam(value="\u4efb\u52a1ids") @PathVariable Long[] taskIds) {
        return this.toAjax(this.proTaskService.deleteProTaskByTaskIds(taskIds));
    }

    @PreAuthorize(value="@ss.hasPermi('mes:pro:protask:edit')")
    @Log(title="\u751f\u4ea7\u62a5\u5de5\u5355", businessType=BusinessType.UPDATE)
    @ApiOperation(value="\u6267\u884c\u751f\u4ea7")
    @Transactional
    @PutMapping(value={"/{workorderId}"})
    public AjaxResult execute(@ApiParam(value="\u751f\u4ea7\u5de5\u5355id") @PathVariable Long workorderId) {
        JSONObject jb1 = new JSONObject();
        jb1.put("name", (Object)"produce");
        jb1.put("value", (Object)"1");
        JSONObject jb2 = new JSONObject();
        jb2.put("name", (Object)"workorder_id");
        jb2.put("value", (Object)workorderId.toString());
        JSONObject jb3 = new JSONObject();
        jb3.put("name", (Object)"process_id");
        jb3.put("value", (Object)0);
        JSONArray ja = new JSONArray();
        ja.add((Object)jb1);
        ProWorkorder order = this.proWorkorderService.selectProWorkorderByWorkorderId(workorderId);
        if (order == null) {
            return AjaxResult.error((String)"\u8be5\u751f\u4ea7\u5de5\u5355\u4e0d\u5b58\u5728\uff01");
        }
        BigDecimal planQty = order.getQuantity().subtract(order.getQuantityProduced());
        JSONObject jb4 = new JSONObject();
        jb4.put("name", (Object)"plan_pty");
        jb4.put("value", (Object)planQty.toString());
        ja.add((Object)jb4);
        JSONObject jb5 = new JSONObject();
        jb5.put("name", (Object)"product_id");
        jb5.put("value", (Object)order.getProductId());
        JSONObject jb = new JSONObject();
        jb.put("Ver", (Object)"1.0.1");
        jb.put("dir", (Object)"down");
        jb.put("id", (Object)"12345");
        jb.put("w_data", (Object)ja);
        JSONObject jc = new JSONObject();
        jc.put("rw_prot", (Object)jb);
        String[] mqtt_topic = StringUtils.split((String)this.mqttConfig.getDefaultTopic(), (String)",");
        try {
            MqttPushClient client = new MqttPushClient();
            client.publish(0, false, "SubTopic1", jc.toString());
        }
        catch (Exception e) {
            e.printStackTrace();
            return AjaxResult.error((String)"\u6267\u884c\u751f\u4ea7\uff0c\u4e0b\u53d1\u5931\u8d25\uff01");
        }
        return AjaxResult.success();
    }
}
