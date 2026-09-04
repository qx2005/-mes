package com.bsq.mes.startup;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Clears temporary work orders created by the Excel demonstration import.
 * The import feature marks its records with EXCEL_IMPORT, so formal data is untouched.
 */
@Component
@Order(1)
public class ExcelImportDataResetRunner implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExcelImportDataResetRunner.class);
    private static final String IMPORT_MARKER = "EXCEL_IMPORT";

    private final JdbcTemplate jdbcTemplate;

    public ExcelImportDataResetRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int bomRows = jdbcTemplate.update(
            "DELETE b FROM pro_workorder_bom b " +
            "INNER JOIN pro_workorder w ON w.workorder_id = b.workorder_id " +
            "WHERE w.attr1 = ?",
            IMPORT_MARKER
        );
        int workorderRows = jdbcTemplate.update(
            "DELETE FROM pro_workorder WHERE attr1 = ?",
            IMPORT_MARKER
        );
        int productRows = jdbcTemplate.update(
            "DELETE FROM md_item WHERE attr1 = ? " +
            "AND NOT EXISTS (" +
            "SELECT 1 FROM pro_workorder w WHERE w.product_id = md_item.item_id" +
            ")",
            IMPORT_MARKER
        );

        LOGGER.info(
            "Excel demonstration data reset completed: workorders={}, products={}, bomRows={}",
            workorderRows,
            productRows,
            bomRows
        );
    }
}
