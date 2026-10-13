package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.OffsideRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OffsideRuleRepository extends JpaRepository<OffsideRule, Long> {
    @Query(value = "SELECT * FROM offside_rules ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<OffsideRule> findRandom(@Param("count") int count);
}
