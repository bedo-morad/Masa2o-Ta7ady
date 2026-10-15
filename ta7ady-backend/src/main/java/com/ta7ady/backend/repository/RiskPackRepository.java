package com.ta7ady.backend.repository;

import com.ta7ady.backend.entity.RiskPack;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RiskPackRepository extends JpaRepository<RiskPack, Long> {
    @Query(value = "SELECT * FROM risk_packs ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<RiskPack> findRandom(@Param("count") int count);
}
